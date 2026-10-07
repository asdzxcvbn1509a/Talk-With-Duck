// ชวนเพื่อนเข้าห้อง: มือถือเปิดหน้าต่างแชร์ของเครื่อง (ส่งต่อทาง LINE ได้) คอมพิวเตอร์คัดลอกลิงก์ห้อง
import { toast } from '../stores/uiStore';

// จอสัมผัสที่มีหน้าต่างแชร์ของเครื่อง · คอมพิวเตอร์ (เช่น Chrome บน Windows) ก็มี navigator.share
// แต่หน้าต่างแชร์ของ Windows ไม่คุ้นมือ คัดลอกลิงก์ใช้ง่ายกว่า
export const canNativeShare = () =>
  typeof navigator.share === 'function' &&
  (window.matchMedia?.('(pointer: coarse)').matches ?? false);

export const shareRoomLink = async (roomName) => {
  const url = window.location.href;
  if (canNativeShare()) {
    try {
      await navigator.share({ title: roomName, text: `มาคุยกันที่ห้อง “${roomName}”`, url });
      return;
    } catch (err) {
      // กดยกเลิกหน้าต่างแชร์: ไม่ต้องทำอะไร · แชร์ไม่ได้ด้วยเหตุอื่นให้คัดลอกลิงก์แทน
      if (err?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('คัดลอกลิงก์ห้องแล้ว ส่งให้เพื่อนที่อยากคุยด้วยได้เลย', 'success');
  } catch {
    toast('คัดลอกไม่สำเร็จ ลองคัดลอกจากแถบที่อยู่แทนนะ', 'error');
  }
};
