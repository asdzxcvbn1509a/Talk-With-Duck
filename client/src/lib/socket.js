// การเชื่อมต่อ Socket.IO ตัวเดียวของทั้งแอป
// dev: ต่อผ่าน Vite proxy (same-origin) เสมอ ไม่อ่าน VITE_SOCKET_URL · prod: ต่อตรงไปที่ Render (VITE_SOCKET_URL)
import { io } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/uiStore';
import { clearSession, onSessionChange, refreshSession } from './api';

const AUTH_ERRORS = new Set(['TOKEN_EXPIRED', 'INVALID_TOKEN', 'NO_TOKEN', 'UNAUTHORIZED']);

let socket = null;
let stopListening = null;

// undefined = ต่อ origin เดียวกับหน้าเว็บ · ตอน dev ห้ามต่อ Render เพราะ token จาก server ในเครื่องใช้กับ Render ไม่ได้
const socketUrl = () =>
  import.meta.env.DEV ? undefined : import.meta.env.VITE_SOCKET_URL || undefined;

export const getSocket = () => {
  if (!socket) {
    socket = io(socketUrl(), {
      autoConnect: false,
      // เรียกทุกครั้งที่ต่อใหม่ จึงได้ token ล่าสุดเสมอ
      auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
      transports: ['websocket', 'polling'],
    });

    socket.on('connect_error', async (err) => {
      if (!AUTH_ERRORS.has(err.message)) return; // เน็ตหลุด: socket.io ต่อใหม่เองอัตโนมัติ
      try {
        // ต่อใหม่เฉพาะเมื่อได้ token ใหม่ ถ้าไม่มี session แล้วต่อไปก็ถูกปฏิเสธวนไม่จบ
        if (await refreshSession()) socket.connect();
      } catch {
        // refresh ไม่ผ่าน = ต้องล็อกอินใหม่ (หน้าเว็บจะพาไปหน้า login เอง)
      }
    });

    // ข้อความเดียวกับ BANNED_MESSAGE ของ server (server/src/config/constants.js)
    socket.on('auth:banned', () => {
      toast('บัญชีนี้ถูกระงับการใช้งานเพราะทำผิดข้อตกลงพื้นที่ปลอดภัย', 'error');
      disconnectSocket();
      clearSession();
    });

    stopListening = onSessionChange(() => {
      // ได้ token ใหม่ระหว่างที่ socket หลุดอยู่ → ลองต่อใหม่ทันที
      if (socket && !socket.connected && socket.active === false) socket.connect();
    });
  }
  if (!socket.connected && !socket.active) socket.connect();
  return socket;
};

/** รอจนกว่า socket จะเชื่อมต่อสำเร็จ */
export const connectedSocket = (timeoutMs = 15000) => {
  const s = getSocket();
  if (s.connected) return Promise.resolve(s);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      s.off('connect', onConnect);
      reject(new Error('SOCKET_TIMEOUT'));
    }, timeoutMs);
    const onConnect = () => {
      clearTimeout(timer);
      resolve(s);
    };
    s.once('connect', onConnect);
  });
};

export const disconnectSocket = () => {
  stopListening?.();
  stopListening = null;
  socket?.disconnect();
  socket = null;
};

/** ประมาณค่าความต่างของนาฬิกาเครื่องเรากับ server (ใช้ซิงก์เพลงคาราโอเกะ) */
export const measureClockOffset = async (s, samples = 3) => {
  let best = null;
  for (let i = 0; i < samples; i += 1) {
    const sentAt = Date.now();
    const serverTime = await s.timeout(5000).emitWithAck('time:sync', {});
    const receivedAt = Date.now();
    const rtt = receivedAt - sentAt;
    const offset = serverTime + rtt / 2 - receivedAt;
    if (!best || rtt < best.rtt) best = { rtt, offset };
  }
  return best?.offset ?? 0;
};
