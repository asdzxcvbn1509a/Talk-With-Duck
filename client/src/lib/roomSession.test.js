// การเข้าห้อง: ขอเข้าห้อง (REST) ต่อ socket และโหลด ICE servers พร้อมกัน แต่ส่ง room:join หลังเข้าห้องทาง REST สำเร็จ
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/rooms', () => ({ joinRoom: vi.fn(), leaveRoom: vi.fn(), sendMessage: vi.fn() }));
vi.mock('../api/rtc', () => ({ readIceServers: vi.fn() }));
vi.mock('./socket', () => ({
  connectedSocket: vi.fn(),
  getSocket: vi.fn(),
  measureClockOffset: vi.fn(),
}));

// ข้อมูลห้องที่ server ตอบกลับตอน room:join
const snapshot = {
  ok: true,
  room: { id: 'r1', type: 'group', hostId: 'u1', members: [] },
  messages: [],
  online: [],
  queue: [],
  karaoke: null,
};

const fakeSocket = () => {
  const emitWithAck = vi.fn(async () => snapshot);
  return {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    timeout: () => ({ emitWithAck }),
    emitWithAck,
  };
};

/** promise ที่สั่งให้สำเร็จเองทีหลังได้ (จำลอง REST ที่ยังรอคำตอบจาก server) */
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe('roomSession', () => {
  let session;
  let rooms;
  let rtc;
  let socketLib;
  let socket;

  // โหลดใหม่ทุกเทสต์ เพราะ roomSession จำ ICE servers ไว้ตลอดการเปิดเว็บ
  beforeEach(async () => {
    vi.resetModules();
    ({ roomSession: session } = await import('./roomSession'));
    rooms = await import('../api/rooms');
    rtc = await import('../api/rtc');
    socketLib = await import('./socket');
    socket = fakeSocket();
    rooms.joinRoom.mockResolvedValue({ data: {} });
    rtc.readIceServers.mockResolvedValue({ data: { iceServers: [] } });
    socketLib.connectedSocket.mockResolvedValue(socket);
  });

  afterEach(async () => {
    await session.leave();
    vi.clearAllMocks();
  });

  it('ต่อ socket และโหลด ICE servers ระหว่างรอเข้าห้องทาง REST แต่ส่ง room:join หลังเข้าห้องสำเร็จ', async () => {
    const rest = deferred();
    rooms.joinRoom.mockReturnValue(rest.promise);

    const joining = session.join('r1', { withMic: false });
    expect(rooms.joinRoom).toHaveBeenCalledWith('r1');
    expect(rtc.readIceServers).toHaveBeenCalledTimes(1);
    expect(socketLib.connectedSocket).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 0));
    expect(socket.emitWithAck).not.toHaveBeenCalled();

    rest.resolve({ data: {} });
    await joining;
    expect(socket.emitWithAck).toHaveBeenCalledWith('room:join', { roomId: 'r1' });
  });

  it('เปิดหน้าห้องแล้วต่อ socket และโหลด ICE servers รอไว้ กดเข้าห้องก็ไม่ขอ ICE servers ซ้ำ', async () => {
    await session.prepare();
    expect(socketLib.getSocket).toHaveBeenCalled();
    expect(rtc.readIceServers).toHaveBeenCalledTimes(1);

    await session.join('r1', { withMic: false });
    expect(rtc.readIceServers).toHaveBeenCalledTimes(1);
  });

  it('เน็ตหลุดระหว่างอยู่ในห้อง → connected เป็น false (ขึ้นแถบแจ้ง) ต่อกลับได้ → true และเข้าห้องใหม่', async () => {
    await session.join('r1', { withMic: false });
    const { useRoomStore } = await import('../stores/roomStore');
    const handler = (event) => socket.on.mock.calls.find(([name]) => name === event)[1];
    expect(useRoomStore.getState().connected).toBe(true);

    handler('disconnect')();
    expect(useRoomStore.getState().connected).toBe(false);

    await handler('connect')();
    expect(useRoomStore.getState().connected).toBe(true);
    expect(socket.emitWithAck).toHaveBeenCalledTimes(2);
  });

  it('โหลด ICE servers ล่วงหน้าไม่สำเร็จ → ตอนกดเข้าห้องขอใหม่', async () => {
    rtc.readIceServers.mockRejectedValueOnce(new Error('offline'));
    await session.prepare();

    await session.join('r1', { withMic: false });
    expect(rtc.readIceServers).toHaveBeenCalledTimes(2);
    expect(socket.emitWithAck).toHaveBeenCalledWith('room:join', { roomId: 'r1' });
  });
});
