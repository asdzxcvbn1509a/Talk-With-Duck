// ทดสอบ Socket.IO จริง: signaling ของ WebRTC, แชท, ไมค์, ซิงก์คาราโอเกะ, lobby และการออกจากห้อง
import http from 'node:http';
import { io as connect } from 'socket.io-client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { initRealtime } from '../../src/realtime/index.js';
import { bearer, createUser, hasTestDb, resetDb } from '../helpers.js';

let server;
let io;
let baseUrl;
const sockets = [];

const socketFor = (token) => {
  const socket = connect(baseUrl, { auth: { token }, transports: ['websocket'], forceNew: true });
  sockets.push(socket);
  return socket;
};

const connected = (socket) =>
  new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });

const nextEvent = (socket, event, timeout = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ไม่ได้รับ ${event}`)), timeout);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const noEvent = (socket, event, wait = 400) =>
  new Promise((resolve, reject) => {
    const handler = () => reject(new Error(`ไม่ควรได้รับ ${event}`));
    socket.once(event, handler);
    setTimeout(() => {
      socket.off(event, handler);
      resolve();
    }, wait);
  });

describe.skipIf(!hasTestDb)('Socket.IO (Signaling Server และข้อมูลเรียลไทม์)', () => {
  beforeAll(async () => {
    server = http.createServer(createApp());
    io = initRealtime(server);
    await new Promise((resolve) => server.listen(0, resolve));
    baseUrl = `http://localhost:${server.address().port}`;
  });

  afterAll(async () => {
    io.close();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    sockets.splice(0).forEach((s) => s.disconnect());
    await resetDb();
  });

  const roomWithTwo = async (type = 'group') => {
    const host = await createUser({ nickname: 'เป็ดโฮสต์' });
    const guest = await createUser({ nickname: 'เป็ดแขก' });
    const { body } = await request(server)
      .post('/api/rooms')
      .set(bearer(host.token))
      .send({ name: 'ห้องทดสอบ', type });
    const roomId = body.room.id;
    await request(server).post(`/api/rooms/${roomId}/join`).set(bearer(guest.token)).expect(200);
    const hostSocket = await connected(socketFor(host.token));
    const guestSocket = await connected(socketFor(guest.token));
    return { host, guest, roomId, hostSocket, guestSocket };
  };

  it('ปฏิเสธการเชื่อมต่อที่ไม่มี token', async () => {
    const socket = connect(baseUrl, { transports: ['websocket'], forceNew: true });
    sockets.push(socket);
    const err = await new Promise((resolve) => socket.once('connect_error', resolve));
    expect(err.message).toBe('NO_TOKEN');
  });

  it('เข้าห้อง → คนที่อยู่ก่อนได้รับ peer-joined → ส่งต่อ SDP Offer/Answer ได้', async () => {
    const { hostSocket, guestSocket, roomId, host } = await roomWithTwo();

    const hostAck = await hostSocket.emitWithAck('room:join', { roomId });
    expect(hostAck.ok).toBe(true);
    expect(hostAck.peers).toEqual([]);

    const peerJoined = nextEvent(hostSocket, 'room:peer-joined');
    const guestAck = await guestSocket.emitWithAck('room:join', { roomId });
    expect(guestAck.ok).toBe(true);
    expect(guestAck.peers).toEqual([{ userId: host.user.id, socketId: hostSocket.id }]);
    expect(guestAck.room.members).toHaveLength(2);
    expect((await peerJoined).socketId).toBe(guestSocket.id);

    const offer = nextEvent(guestSocket, 'signal');
    hostSocket.emit('signal', {
      to: guestSocket.id,
      type: 'offer',
      data: { type: 'offer', sdp: 'v=0' },
    });
    expect(await offer).toMatchObject({
      from: hostSocket.id,
      fromUserId: host.user.id,
      type: 'offer',
    });

    const answer = nextEvent(hostSocket, 'signal');
    guestSocket.emit('signal', {
      to: hostSocket.id,
      type: 'answer',
      data: { type: 'answer', sdp: 'v=0' },
    });
    expect((await answer).type).toBe('answer');
  });

  it('ไม่ส่งต่อ signal ไปหาคนที่ไม่ได้อยู่ห้องเดียวกัน', async () => {
    const { hostSocket, roomId } = await roomWithTwo();
    const outsider = await createUser();
    const outsiderSocket = await connected(socketFor(outsider.token));
    await hostSocket.emitWithAck('room:join', { roomId });

    const blocked = noEvent(outsiderSocket, 'signal');
    hostSocket.emit('signal', { to: outsiderSocket.id, type: 'offer', data: {} });
    await blocked;

    const ack = await outsiderSocket.emitWithAck('room:join', { roomId });
    expect(ack).toMatchObject({ ok: false, code: 'NOT_A_MEMBER' });
  });

  it('มีคนเข้าห้องทาง REST → คนในห้องได้รับ room:member-joined ของคนนั้น', async () => {
    const { hostSocket, roomId } = await roomWithTwo();
    await hostSocket.emitWithAck('room:join', { roomId });
    const newcomer = await createUser({ nickname: 'เป็ดมาใหม่' });

    const memberJoined = nextEvent(hostSocket, 'room:member-joined');
    const res = await request(server)
      .post(`/api/rooms/${roomId}/join`)
      .set(bearer(newcomer.token))
      .expect(200);
    expect(res.body.room.memberCount).toBe(3);
    expect(await memberJoined).toMatchObject({
      userId: newcomer.user.id,
      nickname: 'เป็ดมาใหม่',
      isMuted: false,
    });
  });

  it('แชท ปิดไมค์ และออกจากห้อง กระจายถึงทุกคนในห้อง', async () => {
    const { hostSocket, guestSocket, roomId, guest } = await roomWithTwo();
    await hostSocket.emitWithAck('room:join', { roomId });
    await guestSocket.emitWithAck('room:join', { roomId });

    const chatAtHost = nextEvent(hostSocket, 'chat:message');
    await request(server)
      .post(`/api/rooms/${roomId}/messages`)
      .set(bearer(guest.token))
      .send({ type: 'sticker', content: 'hug' })
      .expect(201);
    expect(await chatAtHost).toMatchObject({
      type: 'sticker',
      content: 'hug',
      user: { nickname: 'เป็ดแขก' },
    });

    const muted = nextEvent(hostSocket, 'room:member-updated');
    guestSocket.emit('room:mute', { muted: true });
    expect(await muted).toEqual({ userId: guest.user.id, isMuted: true });

    const peerLeft = nextEvent(hostSocket, 'room:peer-left');
    const memberLeft = nextEvent(hostSocket, 'room:member-left');
    expect(await guestSocket.emitWithAck('room:leave', {})).toEqual({ ok: true });
    expect((await peerLeft).socketId).toBe(guestSocket.id);
    expect((await memberLeft).userId).toBe(guest.user.id);
  });

  it('คาราโอเกะ: เฉพาะ host ที่ส่งสถานะเพลงได้ ส่งมาว่าหยุดก็ยังเล่นต่อ และคนเข้าทีหลังได้สถานะล่าสุด', async () => {
    const { host, hostSocket, guestSocket, roomId } = await roomWithTwo('karaoke');
    await hostSocket.emitWithAck('room:join', { roomId });
    await guestSocket.emitWithAck('room:join', { roomId });
    const added = await request(server)
      .post(`/api/rooms/${roomId}/queue`)
      .set(bearer(host.token))
      .send({ videoId: 'abcdefghijk', title: 'เพลงแรก' })
      .expect(201);
    const song = added.body.queue[0]; // เพลงแรกเล่นทันที

    const fromHost = nextEvent(guestSocket, 'karaoke:state');
    hostSocket.emit('karaoke:state', {
      songId: song.id,
      videoId: song.videoId,
      playing: true,
      position: 42,
    });
    const state = await fromHost;
    expect(state).toMatchObject({
      songId: song.id,
      videoId: 'abcdefghijk',
      playing: true,
      position: 42,
    });
    expect(typeof state.serverTime).toBe('number');

    // ไม่มีใครหยุดเพลงได้: host ส่งมาว่าหยุด คนอื่นก็ยังได้สถานะว่ากำลังเล่น
    // รหัสวิดีโอเอาจากคิวเสมอ (host สั่งให้ทุกคนเล่นวิดีโออื่นไม่ได้) และตำแหน่งที่ไม่ใช่ตัวเลขจริงเป็น 0
    const stillPlaying = nextEvent(guestSocket, 'karaoke:state');
    hostSocket.emit('karaoke:state', {
      songId: song.id,
      videoId: 'zzzzzzzzzzz',
      playing: false,
      position: 'Infinity',
    });
    expect(await stillPlaying).toMatchObject({
      videoId: 'abcdefghijk',
      playing: true,
      position: 0,
    });

    // สถานะของเพลงที่ไม่ได้เล่นอยู่ (เช่น เพิ่งข้ามไป) ไม่ถูกส่งต่อ
    const staleIgnored = noEvent(guestSocket, 'karaoke:state');
    hostSocket.emit('karaoke:state', {
      songId: '00000000-0000-4000-8000-000000000000',
      videoId: 'abcdefghijk',
      position: 5,
    });
    await staleIgnored;

    // คนที่ไม่ใช่ host ส่งสถานะมาไม่มีผล
    const ignored = noEvent(hostSocket, 'karaoke:state');
    guestSocket.emit('karaoke:state', {
      songId: song.id,
      videoId: 'zzzzzzzzzzz',
      playing: false,
      position: 0,
    });
    await ignored;

    const latest = await guestSocket.emitWithAck('karaoke:request-state', {});
    expect(latest).toMatchObject({ songId: song.id, videoId: 'abcdefghijk', position: 0 });

    const serverTime = await guestSocket.emitWithAck('time:sync', {});
    expect(Math.abs(serverTime - Date.now())).toBeLessThan(1000);
  });

  it('lobby ได้รับห้องใหม่ทันทีที่มีคนเปิดห้อง', async () => {
    const watcher = await createUser();
    const creator = await createUser();
    const watcherSocket = await connected(socketFor(watcher.token));
    watcherSocket.emit('lobby:subscribe');
    await new Promise((r) => setTimeout(r, 100));

    const upserted = nextEvent(watcherSocket, 'lobby:room-upserted');
    await request(server)
      .post('/api/rooms')
      .set(bearer(creator.token))
      .send({ name: 'ห้องใหม่ล่าสุด', type: 'group', yearFilter: 2 })
      .expect(201);
    expect(await upserted).toMatchObject({ name: 'ห้องใหม่ล่าสุด', yearFilter: 2, memberCount: 1 });
  });

  it('เปิดห้องเดียวกันในแท็บใหม่ แท็บเก่าได้รับ room:replaced', async () => {
    const { host, hostSocket, roomId } = await roomWithTwo();
    await hostSocket.emitWithAck('room:join', { roomId });
    const secondTab = await connected(socketFor(host.token));

    const replaced = nextEvent(hostSocket, 'room:replaced');
    const ack = await secondTab.emitWithAck('room:join', { roomId });
    expect(ack.ok).toBe(true);
    expect((await replaced).roomId).toBe(roomId);
  });

  it('เจ้าของห้องเชิญแขกออก: แขกหลุดจากห้อง ส่ง signal ต่อไม่ได้ และกลับเข้าห้องเดิมไม่ได้', async () => {
    const { host, guest, roomId, hostSocket, guestSocket } = await roomWithTwo();
    await hostSocket.emitWithAck('room:join', { roomId });
    await guestSocket.emitWithAck('room:join', { roomId });

    const kicked = nextEvent(guestSocket, 'room:kicked');
    const peerLeft = nextEvent(hostSocket, 'room:peer-left');
    const memberLeft = nextEvent(hostSocket, 'room:member-left');
    expect(await hostSocket.emitWithAck('room:kick', { userId: guest.user.id })).toEqual({
      ok: true,
    });
    expect(await kicked).toEqual({ roomId });
    expect((await peerLeft).socketId).toBe(guestSocket.id);
    expect((await memberLeft).userId).toBe(guest.user.id);

    // socket ของแขกถูกเอาออกจากห้องที่ฝั่ง server แล้ว: ส่ง signal หาเจ้าของห้องไม่ถึง
    const blocked = noEvent(hostSocket, 'signal');
    guestSocket.emit('signal', { to: hostSocket.id, type: 'offer', data: {} });
    await blocked;

    const rejoin = await request(server).post(`/api/rooms/${roomId}/join`).set(bearer(guest.token));
    expect(rejoin.status).toBe(403);
    expect(rejoin.body.error.code).toBe('ROOM_KICKED');
    const room = await request(server)
      .get(`/api/rooms/${roomId}`)
      .set(bearer(host.token))
      .expect(200);
    expect(room.body.room.members.map((m) => m.userId)).toEqual([host.user.id]);
  });

  it('เชิญออก: ทำได้เฉพาะเจ้าของห้อง เชิญตัวเองไม่ได้ และห้อง 1-1 เชิญออกไม่ได้', async () => {
    const group = await roomWithTwo();
    await group.hostSocket.emitWithAck('room:join', { roomId: group.roomId });
    await group.guestSocket.emitWithAck('room:join', { roomId: group.roomId });
    expect(
      await group.guestSocket.emitWithAck('room:kick', { userId: group.host.user.id }),
    ).toMatchObject({ ok: false, code: 'HOST_ONLY' });
    expect(
      await group.hostSocket.emitWithAck('room:kick', { userId: group.host.user.id }),
    ).toMatchObject({ ok: false, code: 'CANNOT_KICK_SELF' });

    const pair = await roomWithTwo('private');
    await pair.hostSocket.emitWithAck('room:join', { roomId: pair.roomId });
    expect(
      await pair.hostSocket.emitWithAck('room:kick', { userId: pair.guest.user.id }),
    ).toMatchObject({ ok: false, code: 'KICK_NOT_ALLOWED' });
  });

  it('เชิญออกในห้องคาราโอเกะ: เพลงที่คนนั้นจองไว้แต่ยังไม่เล่นออกจากคิว', async () => {
    const { host, guest, roomId, hostSocket, guestSocket } = await roomWithTwo('karaoke');
    await hostSocket.emitWithAck('room:join', { roomId });
    await guestSocket.emitWithAck('room:join', { roomId });
    const addSong = (who, n) =>
      request(server)
        .post(`/api/rooms/${roomId}/queue`)
        .set(bearer(who.token))
        .send({ videoId: `song${n}`.padEnd(11, 'x'), title: `เพลงที่ ${n}` })
        .expect(201);
    await addSong(guest, 1); // เล่นทันที
    await addSong(guest, 2);
    await addSong(host, 3);

    expect(await hostSocket.emitWithAck('room:kick', { userId: guest.user.id })).toEqual({
      ok: true,
    });
    const res = await request(server)
      .get(`/api/rooms/${roomId}/queue`)
      .set(bearer(host.token))
      .expect(200);
    // เพลงที่กำลังเล่นยังอยู่ (เจ้าของห้องกดข้ามเองได้)
    expect(res.body.queue.map((s) => [s.title, s.status])).toEqual([
      ['เพลงที่ 1', 'playing'],
      ['เพลงที่ 3', 'queued'],
    ]);
  });

  it('ผู้ดูแลที่ออนไลน์ได้รับแจ้งเมื่อมีรายงานใหม่ และเมื่อรายงานถูกตรวจแล้ว', async () => {
    const mod = await createUser({ role: 'moderator' });
    const member = await createUser();
    const author = await createUser();
    const modSocket = await connected(socketFor(mod.token));
    const memberSocket = await connected(socketFor(member.token));
    const question = await request(server)
      .post('/api/questions')
      .set(bearer(author.token))
      .send({ title: 'ช่วงนี้ไม่ไหวแล้วจริง ๆ', content: 'เหนื่อยมาก', topic: 'life' })
      .expect(201);
    const targetId = question.body.question.id;

    const created = nextEvent(modSocket, 'admin:report-created');
    const notForMembers = noEvent(memberSocket, 'admin:report-created');
    const report = await request(server)
      .post('/api/reports')
      .set(bearer(member.token))
      .send({ targetType: 'question', targetId, reason: 'self_harm' })
      .expect(201);
    expect(await created).toEqual({
      id: report.body.id,
      targetType: 'question',
      reason: 'self_harm',
    });
    await notForMembers;

    const reviewed = nextEvent(modSocket, 'admin:report-reviewed');
    await request(server)
      .patch(`/api/admin/reports/${report.body.id}`)
      .set(bearer(mod.token))
      .send({ action: 'dismiss' })
      .expect(204);
    expect(await reviewed).toEqual({ targetType: 'question', targetId });
  });

  it('ข้อมูลผิดรูปแบบทาง socket (payload null, ack ที่ไม่ใช่ฟังก์ชัน) ไม่ทำให้ server ล่ม', async () => {
    // error ที่หลุดจาก listener ของ socket.io = process ของ server จบทันที (ทุกห้องหลุด)
    const crashes = [];
    const onCrash = (err) => crashes.push(err);
    process.on('uncaughtException', onCrash);
    process.on('unhandledRejection', onCrash);
    try {
      const { hostSocket, guestSocket, roomId } = await roomWithTwo('karaoke');
      await hostSocket.emitWithAck('room:join', { roomId });
      const outsider = await connected(socketFor((await createUser()).token));

      // room:leave อยู่ท้ายสุด: host จะได้ลองทุก event ตอนที่ยังอยู่ในห้อง
      const events = [
        'signal',
        'room:join',
        'room:mute',
        'room:kick',
        'karaoke:state',
        'karaoke:request-state',
        'time:sync',
        'lobby:subscribe',
        'lobby:unsubscribe',
        'room:leave',
      ];
      for (const socket of [hostSocket, outsider]) {
        for (const event of events) {
          socket.emit(event, null);
          socket.emit(event, {}, 'ไม่ใช่ฟังก์ชัน');
          socket.emit(event, null, 42);
        }
      }
      // รอให้ handler ที่ต้องอ่านฐานข้อมูลทำงานจนจบ
      await new Promise((r) => setTimeout(r, 500));

      expect(await guestSocket.emitWithAck('time:sync', {})).toEqual(expect.any(Number));
      expect(await outsider.emitWithAck('room:join', null)).toEqual({
        ok: false,
        code: 'BAD_REQUEST',
      });
    } finally {
      process.off('uncaughtException', onCrash);
      process.off('unhandledRejection', onCrash);
    }
    expect(crashes).toEqual([]);
  });

  it('payload ที่ใหญ่เกิน 100 KB ถูกตัดการเชื่อมต่อ', async () => {
    const user = await createUser();
    const socket = await connected(socketFor(user.token));
    const dropped = nextEvent(socket, 'disconnect');
    socket.emit('signal', { to: 'x', type: 'offer', data: 'x'.repeat(200 * 1024) });
    await dropped;
  });
});
