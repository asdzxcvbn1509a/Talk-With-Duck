// Socket.IO: เซิร์ฟเวอร์ประสานการเชื่อมต่อ (Signaling Server) และ event แบบเรียลไทม์ทั้งหมด
// รายการ event ทั้งหมดอยู่ใน docs/socket-events.md
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { loadUserFromToken } from '../middleware/auth.js';
import * as roomService from '../services/room.service.js';
import * as messageService from '../services/message.service.js';
import * as queueService from '../services/queue.service.js';
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
const noop = () => {};

export const initRealtime = (httpServer) => {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
  });
  setIo(io);

  // ตรวจ Access Token ตอนเชื่อมต่อ
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw Object.assign(new Error('เข้าสู่ระบบก่อนนะ'), { code: 'NO_TOKEN' });
      socket.data.user = await loadUserFromToken(token);
      next();
    } catch (err) {
      const error = new Error(err.code ?? 'UNAUTHORIZED');
      error.data = { code: err.code ?? 'UNAUTHORIZED', message: err.message };
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

    socket.on('time:sync', (_payload, ack = noop) => ack(Date.now()));
    socket.on('disconnect', () => leaveSocketRoom(io, socket, { persist: 'delayed' }));
  });

  startSweeper();
  return io;
};

const registerLobby = (socket) => {
  socket.on('lobby:subscribe', () => socket.join(channel.lobby));
  socket.on('lobby:unsubscribe', () => socket.leave(channel.lobby));
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

  socket.on('room:join', async (payload = {}, ack = noop) => {
    try {
      const { roomId } = payload;
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
    } catch (err) {
      console.error('room:join failed', err);
      ack({ ok: false, code: err.code ?? 'INTERNAL', message: err.message });
    }
  });

  // ส่งต่อ SDP Offer/Answer และ ICE Candidate ระหว่างสองเครื่องที่อยู่ห้องเดียวกันเท่านั้น
  socket.on('signal', (payload = {}) => {
    const roomId = socket.data.roomId;
    const { to, type, data } = payload;
    if (!roomId || !SIGNAL_TYPES.has(type)) return;
    const target = io.sockets.sockets.get(to);
    if (!target || target.data.roomId !== roomId) return;
    target.emit('signal', { from: socket.id, fromUserId: user.id, type, data });
  });

  socket.on('room:mute', async (payload = {}) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    try {
      await roomService.setMuted(roomId, user.id, Boolean(payload.muted));
    } catch (err) {
      console.error('room:mute failed', err);
    }
  });

  socket.on('room:leave', async (_payload, ack = noop) => {
    try {
      await leaveSocketRoom(io, socket, { persist: true });
      ack({ ok: true });
    } catch (err) {
      console.error('room:leave failed', err);
      ack({ ok: false, code: 'INTERNAL' });
    }
  });

  // เจ้าของห้องเชิญคนออก (ห้องกลุ่ม/คาราโอเกะ): เอา socket ของคนนั้นออกจากห้องที่ฝั่ง server เลย
  // ไม่ต้องรอให้หน้าเว็บของเขายอมออกเอง · คนในห้องได้ room:peer-left แล้วปิดสายเสียงกับคนนั้น
  socket.on('room:kick', async (payload = {}, ack = noop) => {
    const roomId = socket.data.roomId;
    const { userId } = payload;
    if (!roomId || !UUID_RE.test(String(userId))) return ack({ ok: false, code: 'BAD_REQUEST' });
    try {
      const room = await roomService.kickMember(roomId, user.id, userId);
      if (room.type === 'karaoke') await queueService.dropQueuedSongs(roomId, userId);
      const target = io.sockets.sockets.get(getSocketId(roomId, userId));
      if (target) await leaveSocketRoom(io, target, { persist: false });
      ack({ ok: true });
    } catch (err) {
      // error ที่ตั้งใจตอบ (ไม่ใช่เจ้าของห้อง, ห้อง 1-1 ฯลฯ) มี status อยู่แล้ว ไม่ต้อง log
      if (!err.status) console.error('room:kick failed', err);
      ack({ ok: false, code: err.code ?? 'INTERNAL', message: err.message });
    }
  });
};

// ซิงก์ตัวเล่นเพลงคาราโอเกะ (ข้อ 3.5.6 ข้อ 3): host เป็นคนจับเวลาของห้อง ส่วนเพลงเล่นเองจนจบ ไม่มีใครหยุดได้
const registerKaraoke = (socket) => {
  const { user } = socket.data;

  socket.on('karaoke:state', async (state = {}) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    try {
      if (!(await roomService.isKaraokeHost(roomId, user.id))) return;

      const stored = setKaraokeState(roomId, {
        songId: typeof state.songId === 'string' ? state.songId : null,
        videoId: typeof state.videoId === 'string' ? state.videoId : null,
        // ไม่มีใครหยุดเพลงได้: host ส่งมาว่าหยุด (เช่น แท็บที่ยังเปิดเว็บรุ่นเก่าค้างไว้) ก็เก็บว่ากำลังเล่น
        playing: true,
        position: Math.max(0, Number(state.position) || 0),
      });
      socket.to(channel.room(roomId)).emit('karaoke:state', stored);
    } catch (err) {
      console.error('karaoke:state failed', err);
    }
  });

  socket.on('karaoke:request-state', (_payload, ack = noop) => {
    ack(socket.data.roomId ? getKaraokeState(socket.data.roomId) : null);
  });
};
