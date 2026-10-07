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
    const { hostSocket, guestSocket, roomId } = await roomWithTwo('karaoke');
    await hostSocket.emitWithAck('room:join', { roomId });
    await guestSocket.emitWithAck('room:join', { roomId });

    const fromHost = nextEvent(guestSocket, 'karaoke:state');
    hostSocket.emit('karaoke:state', {
      songId: null,
      videoId: 'abcdefghijk',
      playing: true,
      position: 42,
    });
    const state = await fromHost;
    expect(state).toMatchObject({ videoId: 'abcdefghijk', playing: true, position: 42 });
    expect(typeof state.serverTime).toBe('number');

    // ไม่มีใครหยุดเพลงได้: host ส่งมาว่าหยุด คนอื่นก็ยังได้สถานะว่ากำลังเล่น
    const stillPlaying = nextEvent(guestSocket, 'karaoke:state');
    hostSocket.emit('karaoke:state', {
      songId: null,
      videoId: 'abcdefghijk',
      playing: false,
      position: 50,
    });
    expect(await stillPlaying).toMatchObject({ playing: true, position: 50 });

    const ignored = noEvent(hostSocket, 'karaoke:state');
    guestSocket.emit('karaoke:state', { videoId: 'zzzzzzzzzzz', playing: false, position: 0 });
    await ignored;

    const latest = await guestSocket.emitWithAck('karaoke:request-state', {});
    expect(latest.videoId).toBe('abcdefghijk');

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
});
