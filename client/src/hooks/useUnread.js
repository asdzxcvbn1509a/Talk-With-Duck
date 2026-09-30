import { useState } from 'react';
import { useRoomStore } from '../stores/roomStore';

/** นับข้อความใหม่ที่ยังไม่ได้อ่านขณะปิดแผงแชท */
export const useUnread = (open) => {
  const count = useRoomStore((s) => s.messages.length);
  const [seen, setSeen] = useState(count);
  // เปิดแชทอยู่ = อ่านแล้วทั้งหมด (ปรับ state ระหว่าง render ตามแนวทางของ React แทนการใช้ effect)
  if (open && seen !== count) setSeen(count);
  return open ? 0 : Math.max(0, count - seen);
};
