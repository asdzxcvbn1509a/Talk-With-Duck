// ติดตามว่าใครต่อ socket อยู่ในห้องไหน และเคลียร์สมาชิกที่หลุดไปแล้ว (ปิดแท็บ/เน็ตหลุด/server รีสตาร์ต)
import { leaveRoom, listActiveMemberships } from '../services/room.service.js';

const DISCONNECT_GRACE_MS = 20 * 1000; // เผื่อรีเฟรชหน้า/เน็ตสะดุด
const STALE_MS = 60 * 1000; // เข้าห้องทาง REST แล้วแต่ไม่ได้ต่อ socket ภายในเวลานี้
const SWEEP_EVERY_MS = 30 * 1000;
const startedAt = Date.now();

// roomId -> Map<userId, socketId>
const presence = new Map();
const pendingLeaves = new Map();

export const addPresence = (roomId, userId, socketId) => {
  if (!presence.has(roomId)) presence.set(roomId, new Map());
  presence.get(roomId).set(userId, socketId);
  cancelPendingLeave(roomId, userId);
};

/** ลบเฉพาะเมื่อ socket นี้ยังเป็นตัวปัจจุบันของผู้ใช้ในห้อง คืน true ถ้าลบจริง */
export const removePresence = (roomId, userId, socketId) => {
  const users = presence.get(roomId);
  if (users?.get(userId) !== socketId) return false;
  users.delete(userId);
  if (users.size === 0) presence.delete(roomId);
  return true;
};

export const getSocketId = (roomId, userId) => {
  return presence.get(roomId)?.get(userId) ?? null;
};

export const peersOf = (roomId, exceptUserId) => {
  return [...(presence.get(roomId) ?? new Map())]
    .filter(([userId]) => userId !== exceptUserId)
    .map(([userId, socketId]) => ({ userId, socketId }));
};

export const onlineUserIds = (roomId) => {
  return [...(presence.get(roomId)?.keys() ?? [])];
};

export const isOnline = (roomId, userId) => {
  return presence.get(roomId)?.has(userId) ?? false;
};

const leaveKey = (roomId, userId) => `${roomId}:${userId}`;

export const cancelPendingLeave = (roomId, userId) => {
  const key = leaveKey(roomId, userId);
  clearTimeout(pendingLeaves.get(key));
  pendingLeaves.delete(key);
};

/** socket หลุด: รอสักพักก่อนนับว่าออกจากห้อง เผื่อกลับมาต่อใหม่ */
export const scheduleLeave = (roomId, userId) => {
  cancelPendingLeave(roomId, userId);
  const key = leaveKey(roomId, userId);
  const timer = setTimeout(async () => {
    pendingLeaves.delete(key);
    if (isOnline(roomId, userId)) return;
    try {
      await leaveRoom(roomId, userId);
    } catch (err) {
      console.error('leaveRoom (grace) failed', err);
    }
  }, DISCONNECT_GRACE_MS);
  timer.unref?.();
  pendingLeaves.set(key, timer);
};

const sweep = async () => {
  const members = await listActiveMemberships();
  const now = Date.now();
  for (const m of members) {
    if (isOnline(m.roomId, m.userId) || pendingLeaves.has(leaveKey(m.roomId, m.userId))) continue;
    const since = Math.max(m.joinedAt.getTime(), startedAt);
    if (now - since > STALE_MS) await leaveRoom(m.roomId, m.userId);
  }
};

export const startSweeper = () => {
  const timer = setInterval(async () => {
    try {
      await sweep();
    } catch (err) {
      console.error('presence sweep failed', err);
    }
  }, SWEEP_EVERY_MS);
  timer.unref?.();
  return () => clearInterval(timer);
};
