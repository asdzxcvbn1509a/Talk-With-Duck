// ข้อมูลห้องที่กำลังเข้าร่วม (ข้อ 3.5.3: roomStore): สมาชิก สถานะไมค์ แชท คิวเพลง
import { create } from 'zustand';

const initial = {
  roomId: null,
  status: 'idle', // idle | joining | joined | closed | replaced | left | error
  error: null,
  room: null,
  hostId: null,
  members: [],
  online: [], // userId ที่ต่อ socket อยู่
  messages: [],
  queue: [],
  karaoke: null, // สถานะตัวเล่นเพลงล่าสุดจาก host
  clockOffset: 0,
  muted: false,
  micAvailable: false,
  streams: {}, // userId -> MediaStream (เสียงของคนอื่น)
  levels: {}, // userId -> ความดัง 0–1
  peerStates: {}, // userId -> connectionState
};

export const useRoomStore = create((set, get) => ({
  ...initial,

  reset: (roomId = null) => set({ ...initial, roomId }),
  patch: (partial) => set(partial),

  upsertMember: (member) => {
    const others = get().members.filter((m) => m.userId !== member.userId);
    set({
      members: [...others, member].sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt)),
    });
  },
  removeMember: (userId) => set({ members: get().members.filter((m) => m.userId !== userId) }),
  updateMember: (userId, patch) =>
    set({ members: get().members.map((m) => (m.userId === userId ? { ...m, ...patch } : m)) }),

  setOnline: (userId, isOnline) => {
    const online = new Set(get().online);
    if (isOnline) online.add(userId);
    else online.delete(userId);
    set({ online: [...online] });
  },

  addMessage: (message) => {
    if (get().messages.some((m) => m.id === message.id)) return;
    set({ messages: [...get().messages, message].slice(-200) });
  },
  hideMessage: (id) => set({ messages: get().messages.filter((m) => m.id !== id) }),

  setStream: (userId, stream) => set({ streams: { ...get().streams, [userId]: stream } }),
  removeStream: (userId) => {
    const { [userId]: _removed, ...rest } = get().streams;
    set({ streams: rest });
  },
  setPeerState: (userId, state) => set({ peerStates: { ...get().peerStates, [userId]: state } }),
  setLevels: (levels) => set({ levels }),
}));
