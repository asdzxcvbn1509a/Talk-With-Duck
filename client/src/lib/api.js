// axios ที่แนบ Access Token ให้อัตโนมัติ และขอ token ใหม่เมื่อหมดอายุ (ยิงครั้งเดียวแม้หลาย request รอ)
import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { toast, useUiStore } from '../stores/uiStore';

export const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL: API_BASE, withCredentials: true, timeout: 20000 });

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const EXPIRED_CODES = new Set(['TOKEN_EXPIRED', 'INVALID_TOKEN', 'NO_TOKEN']);

let refreshPromise = null;
let refreshTimer = null;

const scheduleProactiveRefresh = (accessToken) => {
  clearTimeout(refreshTimer);
  try {
    const { exp } = JSON.parse(
      atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    const delay = exp * 1000 - Date.now() - 60_000; // ต่ออายุก่อนหมด 1 นาที
    refreshTimer = setTimeout(
      async () => {
        try {
          await refreshSession();
        } catch {
          // ต่ออายุล่วงหน้าไม่สำเร็จ: request ถัดไปที่ได้ 401 จะขอ token ใหม่อีกครั้ง
        }
      },
      Math.max(delay, 5_000),
    );
  } catch {
    // token อ่านไม่ออก: ปล่อยให้ interceptor จัดการตอนได้ 401
  }
};

export const applySession = (session) => {
  useAuthStore.getState().setSession(session);
  scheduleProactiveRefresh(session.accessToken);
  sessionListeners.forEach((fn) => fn(session));
};

export const clearSession = () => {
  clearTimeout(refreshTimer);
  useAuthStore.getState().clear();
};

const sessionListeners = new Set();
/** ให้ส่วนอื่น (เช่น socket) รู้เมื่อได้ token ใหม่ */
export const onSessionChange = (fn) => {
  sessionListeners.add(fn);
  return () => sessionListeners.delete(fn);
};

const requestNewToken = async () => {
  try {
    const { status, data } = await axios.post(`${API_BASE}/auth/refresh`, null, {
      withCredentials: true,
      timeout: 60000,
    });
    // 204 = ไม่มี refresh cookie (ยังไม่ได้เข้าสู่ระบบ หรือออกจากระบบในแท็บอื่นแล้ว)
    if (status === 204) {
      clearSession();
      return null;
    }
    applySession(data);
    return data;
  } catch (err) {
    if (err.response?.status === 401) clearSession();
    throw err;
  } finally {
    refreshPromise = null;
  }
};

/** ใช้ Refresh Token (cookie) แลก Access Token ใหม่ · คืน session หรือ null ถ้าไม่มี session ให้กู้ */
export const refreshSession = () => {
  if (!refreshPromise) refreshPromise = requestNewToken();
  return refreshPromise;
};

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

api.interceptors.response.use(
  (response) => {
    if (useUiStore.getState().waking) useUiStore.getState().setWaking(false);
    return response;
  },
  async (error) => {
    const { config, response } = error;
    if (!config) throw error;
    const code = response?.data?.error?.code;

    // token หมดอายุ → ขอใหม่แล้วยิง request เดิมซ้ำ
    if (response?.status === 401 && EXPIRED_CODES.has(code) && !config._retried) {
      config._retried = true;
      if (!(await refreshSession())) throw error; // ไม่มี session ให้ต่ออายุแล้ว
      return api(config);
    }

    if (code === 'BANNED') clearSession();

    // server (Render free tier) กำลังตื่น: ลองซ้ำเฉพาะ GET
    const networkish = !response || RETRYABLE_STATUS.has(response.status);
    if (networkish && config.method === 'get') {
      config._attempt = (config._attempt ?? 0) + 1;
      if (config._attempt <= 4) {
        useUiStore.getState().setWaking(true);
        await wait(1500 * config._attempt);
        return api(config);
      }
    }
    useUiStore.getState().setWaking(false);
    throw error;
  },
);

/** ข้อความ error ภาษาไทยจาก server หรือข้อความสำรอง */
export const errorMessage = (err, fallback = 'เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะ') => {
  if (err?.response?.data?.error?.message) return err.response.data.error.message;
  if (err && !err.response) return 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
  return fallback;
};

/** แจ้งว่าทำรายการไม่สำเร็จด้วย toast สีแดง (ใช้ใน catch: ข้อความภาษาไทยจาก server หรือข้อความสำรอง) */
export const toastError = (err) => toast(errorMessage(err), 'error');

export const errorCode = (err) => err?.response?.data?.error?.code;
