// การเข้าสู่ระบบ (ด้วย Google)/ออกจากระบบ ฝั่งหน้าเว็บ
// เรียก API ผ่าน src/api แล้วเก็บ session/ข้อมูลผู้ใช้ลง store ต่อ
import * as authApi from '../api/auth';
import * as meApi from '../api/me';
import { applySession, clearSession, refreshSession } from './api';
import { disconnectSocket } from './socket';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';

/** ตอนเปิดเว็บ: ปลุก server แล้วลองกู้ session จาก refresh cookie */
export const bootstrapSession = async () => {
  const slow = setTimeout(() => useUiStore.getState().setWaking(true), 2500);
  try {
    await refreshSession();
  } catch {
    clearSession();
  } finally {
    clearTimeout(slow);
    useUiStore.getState().setWaking(false);
  }
};

/**
 * เข้าสู่ระบบด้วย ID token จากปุ่ม Google
 * บัญชีใหม่ที่ยังไม่ส่ง profile จะได้ { needsProfile: true, email } กลับมาแทน session
 */
export const signInWithGoogle = async (credential, profile) => {
  const { data } = await authApi.signInWithGoogle({ credential, profile });
  if (data.needsProfile) return data;
  applySession(data);
  return data;
};

/** บัญชีทดสอบตอนพัฒนาในเครื่อง (ดู components/DevAccounts.jsx) */
export const devLogin = async (userId) => {
  const { data } = await authApi.devLogin({ userId });
  applySession(data);
  return data.user;
};

export const logout = async () => {
  try {
    await authApi.logout();
  } finally {
    disconnectSocket();
    clearSession();
  }
};

export const acceptGuidelines = async () => {
  const { data } = await meApi.acceptGuidelines();
  useAuthStore.getState().setUser(data.user);
};

export const updateProfile = async (patch) => {
  const { data } = await meApi.updateMe(patch);
  useAuthStore.getState().setUser(data.user);
  return data.user;
};

/** ลบบัญชีถาวร: server ลบข้อมูลและล้าง refresh cookie แล้ว ฝั่งเว็บเหลือแค่ตัด socket และล้าง session */
export const deleteAccount = async () => {
  await meApi.deleteMe();
  disconnectSocket();
  clearSession();
};
