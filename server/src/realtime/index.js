// Socket.IO: เซิร์ฟเวอร์ประสานการเชื่อมต่อ (Signaling Server) และ event แบบเรียลไทม์ทั้งหมด
// รายการ event ทั้งหมดอยู่ใน docs/socket-events.md
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { loadUserFromToken } from '../middleware/auth.js';
import * as roomService from '../services/room.service.js';
import * as messageService from '../services/message.service.js';
import * as queueService from '../services/queue.service.js';
import { unauthorized } from '../utils/httpError.js';
import { isModerator } from '../utils/roles.js';
import { channel, setIo } from './hub.js';
import { getKaraokeState, setKaraokeState } from './karaokeState.js';
import {
  addPresence,
  getSocketId,
  onlineUserIds,
  peersOf,
  removePresence,
  scheduleLeave,
  startSweeper,
} from './presence.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNAL_TYPES = new Set(['offer', 'answer', 'ice']);
// ข้อมูลที่ client ส่งมาครั้งหนึ่งใหญ่ได้ไม่เกินนี้ (เท่ากับ express.json) · SDP/ICE จริงไม่กี่ KB · เกินแล้วถูกตัดการเชื่อมต่อ
const MAX_PAYLOAD_BYTES = 100 * 1024;
const noop = () => {};

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** error ที่ตั้งใจตอบ (HttpError มี status) ส่ง code และข้อความภาษาไทย · error อื่นไม่บอกรายละเอียดภายใน */
const failure = (err) =>
  err.status
    ? { ok: false, code: err.code, message: err.message }
    : { ok: false, code: 'INTERNAL' };

/**
 * รับ event จาก client: ใช้แทน socket.on ทุกครั้ง (ESLint บังคับในโฟลเดอร์ realtime)
 * - payload ที่ไม่ใช่ object ถือเป็น {} · ack ใช้ได้เฉพาะเมื่อ client ขอ ack มาจริง (อาร์กิวเมนต์สุดท้ายเป็นฟังก์ชัน)
 * - จับ error ทุกแบบไว้ที่นี่: socket.io เรียก listener โดยไม่มี try/catch
 *   error ที่หลุดออกไปทำให้ process ของ server จบทันที ทุกห้องหลุดพร้อมกัน
 */
const listen = (socket, event, handler) => {
  // eslint-disable-next-line no-restricted-syntax -- จุดเดียวที่ลงทะเบียน listener กับ socket.io จริง
  socket.on(event, async (...args) => {
    const ack = typeof args.at(-1) === 'function' ? args.pop() : noop;
    try {
      await handler(isPlainObject(args[0]) ? args[0] : {}, ack);
    } catch (err) {
      if (!err.status) console.error(`${event} failed`, err);
      ack(failure(err));
    }
  });
};

export const initRealtime = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
    maxHttpBufferSize: MAX_PAYLOAD_BYTES,
  });
  setIo(io);

  // ตรวจ Access Token ตอนเชื่อมต่อ
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw unauthorized('NO_TOKEN');
      socket.data.user = await loadUserFromToken(token);
      next();
    } catch (err) {
      // error ที่ไม่ได้ตั้งใจ (เช่น ต่อฐานข้อมูลไม่ได้) บันทึก log แต่ไม่ส่งข้อความภายในให้ client
      if (!err.status) console.error('socket auth failed', err);
      const { code, message = 'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้งนะ' } = failure(err);
      const error = new Error(code);
      error.data = { code, message };
      next(error);
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    socket.join(channel.user(user.id));
    if (isModerator(user)) socket.join(channel.moderators);

    registerLobby(socket);
    registerRoom(io, socket);
    registerKaraoke(socket);

    listen(socket, 'time:sync', (_payload, ack) => ack(Date.now()));
    listen(socket, 'disconnect', () => leaveSocketRoom(io, socket, { persist: 'delayed' }));
  });

  startSweeper();
  return io;
};

const registerLobby = (socket) => {
  listen(socket, 'lobby:subscribe', () => socket.join(channel.lobby));
  listen(socket, 'lobby:unsubscribe', () => socket.leave(channel.lobby));
};

/** ออกจาก socket room · persist: true = บันทึกว่าออกทันที, 'delayed' = รอเผื่อกลับมา */
const leaveSocketRoom = async (io, socket, { persist }) => {
  const roomId = socket.data.roomId;
  if (!roomId) return;
  const { user } = socket.data;
  socket.data.roomId = null;
  socket.leave(channel.room(roomId));

  if (removePresence(roomId, user.id, socket.id)) {
    io.to(channel.room(roomId)).emit('room:peer-left', { socketId: socket.id, userId: user.id });
    if (persist === true) await roomService.leaveRoom(roomId, user.id);
    else if (persist === 'delayed') scheduleLeave(roomId, user.id);
  }
};

const registerRoom = (io, socket) => {
  const { user } = socket.data;

  listen(socket, 'room:join', async ({ roomId }, ack) => {
    if (!UUID_RE.test(String(roomId))) return ack({ ok: false, code: 'BAD_REQUEST' });

    const member = await roomService.getActiveMembership(roomId, user.id);
    if (!member) return ack({ ok: false, code: 'NOT_A_MEMBER', message: 'ต้องเข้าห้องก่อนนะ' });

    if (socket.data.roomId && socket.data.roomId !== roomId) {
      await leaveSocketRoom(io, socket, { persist: false });
    }

    // ผู้ใช้คนเดียวเปิดห้องเดียวกันหลายแท็บ: ให้แท็บเก่าหลุดออก
    const previousId = getSocketId(roomId, user.id);
    if (previousId && previousId !== socket.id) {
      const previous = io.sockets.sockets.get(previousId);
      if (previous) {
        previous.data.roomId = null;
        previous.leave(channel.room(roomId));
        previous.emit('room:replaced', { roomId });
      }
      socket
        .to(channel.room(roomId))
        .emit('room:peer-left', { socketId: previousId, userId: user.id });
    }

    const peers = peersOf(roomId, user.id);
    addPresence(roomId, user.id, socket.id);
    socket.join(channel.room(roomId));
    socket.data.roomId = roomId;

    const room = await roomService.getRoom(roomId);
    const [messages, queue] = await Promise.all([
      messageService.listMessages(roomId, user.id),
      room.type === 'karaoke' ? queueService.listQueue(roomId) : [],
    ]);

    ack({
      ok: true,
      room,
      messages,
      queue,
      karaoke: getKaraokeState(roomId),
      peers,
      online: onlineUserIds(roomId),
      serverTime: Date.now(),
    });
    // คนที่อยู่ในห้องก่อนจะเป็นฝ่ายส่ง SDP Offer มาหาคนที่เพิ่งเข้า (ข้อ 3.5.5 ข้อ 3)
    socket
      .to(channel.room(roomId))
      .emit('room:peer-joined', { socketId: socket.id, userId: user.id });
  });

  // ส่งต่อ SDP Offer/Answer และ ICE Candidate ระหว่างสองเครื่องที่อยู่ห้องเดียวกันเท่านั้น
  listen(socket, 'signal', ({ to, type, data }) => {
    const roomId = socket.data.roomId;
    if (!roomId || !SIGNAL_TYPES.has(type)) return;
    const target = io.sockets.sockets.get(to);
    if (!target || target.data.roomId !== roomId) return;
    target.emit('signal', { from: socket.id, fromUserId: user.id, type, data });
  });

  listen(socket, 'room:mute', async ({ muted }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    await roomService.setMuted(roomId, user.id, Boolean(muted));
  });

  listen(socket, 'room:leave', async (_payload, ack) => {
    await leaveSocketRoom(io, socket, { persist: true });
    ack({ ok: true });
  });

  // เจ้าของห้องเชิญคนออก (ห้องกลุ่ม/คาราโอเกะ): เอา socket ของคนนั้นออกจากห้องที่ฝั่ง server เลย
  // ไม่ต้องรอให้หน้าเว็บของเขายอมออกเอง · คนในห้องได้ room:peer-left แล้วปิดสายเสียงกับคนนั้น
  // error ที่ตั้งใจตอบ (ไม่ใช่เจ้าของห้อง, ห้อง 1-1 ฯลฯ) listen ส่งกลับใน ack พร้อมข้อความภาษาไทย
  listen(socket, 'room:kick', async ({ userId }, ack) => {
    const roomId = socket.data.roomId;
    if (!roomId || !UUID_RE.test(String(userId))) return ack({ ok: false, code: 'BAD_REQUEST' });
    const room = await roomService.kickMember(roomId, user.id, userId);
    if (room.type === 'karaoke') await queueService.dropQueuedSongs(roomId, userId);
    const target = io.sockets.sockets.get(getSocketId(roomId, userId));
    if (target) await leaveSocketRoom(io, target, { persist: false });
    ack({ ok: true });
  });
};

// ซิงก์ตัวเล่นเพลงคาราโอเกะ (ข้อ 3.5.6 ข้อ 3): host เป็นคนจับเวลาของห้อง ส่วนเพลงเล่นเองจนจบ ไม่มีใครหยุดได้
const registerKaraoke = (socket) => {
  const { user } = socket.data;

  listen(socket, 'karaoke:state', async (state) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    // รับเฉพาะจาก host และต้องเป็นสถานะของเพลงที่กำลังเล่นอยู่จริง (สถานะของเพลงที่เพิ่งข้ามไปแล้วทิ้งได้เลย)
    const song = await roomService.hostPlayingSong(roomId, user.id);
    if (!song || state.songId !== song.id) return;

    const position = Number(state.position);
    const stored = setKaraokeState(roomId, {
      songId: song.id,
      // รหัสวิดีโอเอาจากคิวเสมอ: host ส่งวิดีโออื่นที่ไม่ได้อยู่ในคิวมาให้ทุกคนเล่นไม่ได้
      videoId: song.videoId,
      // ไม่มีใครหยุดเพลงได้: host ส่งมาว่าหยุด (เช่น แท็บที่ยังเปิดเว็บรุ่นเก่าค้างไว้) ก็เก็บว่ากำลังเล่น
      playing: true,
      position: Number.isFinite(position) ? Math.max(0, position) : 0,
    });
    socket.to(channel.room(roomId)).emit('karaoke:state', stored);
  });

  listen(socket, 'karaoke:request-state', (_payload, ack) => {
    ack(socket.data.roomId ? getKaraokeState(socket.data.roomId) : null);
  });
};
