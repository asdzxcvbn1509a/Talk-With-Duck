// สถานะการแสดงผลบนหน้าจอ (ข้อ 3.5.3: uiStore): toast, สถานะปลุก server, ตัวกรองที่เลือกไว้,
// ระดับเสียงของเพื่อนแต่ละคนที่ผู้ใช้ปรับเอง (จำไว้ในเบราว์เซอร์ข้ามการรีเฟรช), โหมดสว่าง/มืด
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toPlaybackVolume } from '../lib/rtc/volume';
import { readThemePreference, setThemePreference } from '../lib/theme';

let toastId = 0;

/** ลบ key ออก ใช้ตอนค่ากลับเป็นค่าปกติ ข้อมูลที่จำไว้จะได้ไม่โตเรื่อย ๆ */
const without = (map, key) => {
  const { [key]: _removed, ...rest } = map;
  return rest;
};

export const useUiStore = create(
  persist(
    (set, get) => ({
      toasts: [],
      waking: false, // server บน Render กำลังตื่นจาก cold start
      lobbyFilter: { year: null, type: null },
      qaFilter: { year: null, topic: null, sort: 'latest' },
      // มีผลเฉพาะเครื่องนี้ เพื่อนในห้องไม่รู้ (components/room/VolumeControl.jsx)
      volumes: {}, // userId -> ระดับเสียง 0–1 (ไม่มี key = 100%)
      mutedUsers: {}, // userId -> true ถ้าปิดเสียงคนนั้นไว้
      // system | light | dark · lib/theme.js จำค่าเองใน key แยก (index.html ต้องอ่านได้ก่อน React โหลด)
      theme: readThemePreference(),

      toast: (message, tone = 'info') => {
        toastId += 1;
        const id = toastId;
        set({ toasts: [...get().toasts, { id, message, tone }] });
        setTimeout(() => get().dismissToast(id), tone === 'error' ? 6000 : 3500);
      },
      dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
      setWaking: (waking) => set({ waking }),
      setLobbyFilter: (patch) => set({ lobbyFilter: { ...get().lobbyFilter, ...patch } }),
      setQaFilter: (patch) => set({ qaFilter: { ...get().qaFilter, ...patch } }),
      setTheme: (theme) => {
        setThemePreference(theme);
        set({ theme });
      },

      setVolume: (userId, volume) => {
        const value = toPlaybackVolume(volume);
        const volumes = get().volumes;
        set({ volumes: value === 1 ? without(volumes, userId) : { ...volumes, [userId]: value } });
      },
      setUserMuted: (userId, isMuted) => {
        const mutedUsers = get().mutedUsers;
        set({
          mutedUsers: isMuted ? { ...mutedUsers, [userId]: true } : without(mutedUsers, userId),
        });
      },
      resetVolume: (userId) => {
        set({
          volumes: without(get().volumes, userId),
          mutedUsers: without(get().mutedUsers, userId),
        });
      },
    }),
    {
      name: 'twd-ui',
      // จำเฉพาะระดับเสียงรายคน ส่วน toast และตัวกรองไม่ต้องจำข้ามการรีเฟรช
      partialize: ({ volumes, mutedUsers }) => ({ volumes, mutedUsers }),
    },
  ),
);

export const toast = (message, tone) => useUiStore.getState().toast(message, tone);
