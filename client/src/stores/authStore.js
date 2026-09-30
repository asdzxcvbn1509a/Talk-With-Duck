// ข้อมูลผู้ใช้ที่เข้าสู่ระบบ (ข้อ 3.5.3: authStore)
// Access Token เก็บในหน่วยความจำเท่านั้น · Refresh Token อยู่ใน httpOnly cookie ที่ server ตั้งให้
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  status: 'loading', // loading | ready
  user: null,
  accessToken: null,

  setSession: ({ user, accessToken }) => set({ user, accessToken, status: 'ready' }),
  setUser: (user) => set({ user }),
  clear: () => set({ user: null, accessToken: null, status: 'ready' }),
}));

export const selectIsModerator = (s) => s.user?.role === 'moderator';
