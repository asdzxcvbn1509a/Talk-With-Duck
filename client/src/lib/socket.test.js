// ปลายทางของ Socket.IO: ตอน dev ต้องต่อผ่าน Vite proxy เสมอ แม้ .env จะมี VITE_SOCKET_URL (ค่าสำหรับตอน deploy)
import { io } from 'socket.io-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { disconnectSocket, getSocket } from './socket';

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
    active: false,
  })),
}));

const RENDER_URL = 'https://talk-with-duck-api.onrender.com';

describe('ปลายทางของ Socket.IO', () => {
  afterEach(() => {
    disconnectSocket();
    vi.unstubAllEnvs();
    vi.mocked(io).mockClear();
  });

  it('ตอน dev ต่อผ่าน Vite proxy (same-origin) ไม่ใช้ VITE_SOCKET_URL', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_SOCKET_URL', RENDER_URL);
    getSocket();
    expect(io).toHaveBeenCalledWith(undefined, expect.any(Object));
  });

  it('ตอน build ขึ้นเว็บจริงต่อตรงไปที่ VITE_SOCKET_URL', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SOCKET_URL', RENDER_URL);
    getSocket();
    expect(io).toHaveBeenCalledWith(RENDER_URL, expect.any(Object));
  });
});
