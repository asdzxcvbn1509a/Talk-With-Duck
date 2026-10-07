// ตัวนับข้อความแชทที่ยังไม่ได้อ่าน (ตัวเลขบนปุ่มแชทใน ControlBar ตอนปิดแผงแชทอยู่)
import { useState } from 'react';
import { useRoomStore } from '../stores/roomStore';

/** นับข้อความใหม่ที่ยังไม่ได้อ่านขณะปิดแผงแชท */
export const useUnread = (open) => {
  // นับจากจำนวนข้อความที่ได้รับทั้งหมด ไม่ใช่ความยาวรายการ
  // (รายการเก็บแค่ 200 ข้อความล่าสุด และข้อความที่ผู้ดูแลซ่อนจะถูกเอาออก)
  const total = useRoomStore((s) => s.messageTotal);
  const [seen, setSeen] = useState(total);
  // เปิดแชทอยู่ = อ่านแล้วทั้งหมด · ตัวนับลดลง = store เพิ่ง reset (กลับเข้าห้องใหม่ในหน้าเดิม) ให้เริ่มนับใหม่
  // (ปรับ state ระหว่าง render ตามแนวทางของ React แทนการใช้ effect)
  if ((open || total < seen) && seen !== total) setSeen(total);
  return open ? 0 : Math.max(0, total - seen);
};
