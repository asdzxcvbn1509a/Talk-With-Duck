// ถามยืนยันก่อนออกจากห้อง: กดปุ่มออก · เปลี่ยนไปหน้าอื่น (รวมปุ่ม back ของเบราว์เซอร์) · ปิดแท็บ/รีเฟรช
// ใช้คู่กับ <LeaveRoomDialog {...dialog} />
import { useCallback, useEffect, useState } from 'react';
import { useBlocker } from 'react-router';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';

// อ่านค่าล่าสุดจาก store ตอนกำลังจะเปลี่ยนหน้า (ไม่ใช้ค่าตอน render)
// เพราะตอนกดออกจากห้อง store จะ reset ก่อน navigate และถ้าหลุดจากระบบต้องไปหน้า login ได้ทันที
const isInRoom = (roomId) => {
  const { roomId: current, status } = useRoomStore.getState();
  return current === roomId && status === 'joined' && Boolean(useAuthStore.getState().user);
};

export const useLeaveRoomGuard = (roomId, onLeave) => {
  const joined = useRoomStore((s) => s.roomId === roomId && s.status === 'joined');
  const [asking, setAsking] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        currentLocation.pathname !== nextLocation.pathname && isInRoom(roomId),
      [roomId],
    ),
  );
  const blocked = blocker.state === 'blocked';

  // หลุดออกจากห้องไปแล้ว (ห้องปิด/เปิดซ้ำในแท็บอื่น): ปิดหน้าต่างที่ค้างอยู่ (ปรับ state ระหว่าง render)
  const [wasJoined, setWasJoined] = useState(joined);
  if (wasJoined !== joined) {
    setWasJoined(joined);
    if (!joined) setAsking(false);
  }

  // ...และถ้ามีการเปลี่ยนหน้าที่ถูกบล็อกค้างอยู่ ให้ไปต่อได้เลยโดยไม่ต้องถาม
  useEffect(() => {
    if (!joined && blocked) blocker.proceed();
  }, [joined, blocked, blocker]);

  // ปิดแท็บ/รีเฟรช: ให้เบราว์เซอร์ถามก่อน (ข้อความเป็นของเบราว์เซอร์ กำหนดเองไม่ได้)
  useEffect(() => {
    if (!joined) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [joined]);

  const requestLeave = useCallback(() => setAsking(true), []);

  const onStay = useCallback(() => {
    setAsking(false);
    if (blocker.state === 'blocked') blocker.reset();
  }, [blocker]);

  const onConfirm = useCallback(async () => {
    if (blocker.state === 'blocked') {
      // ไปหน้าที่กดไว้ต่อ: useRoomLifecycle จะออกจากห้องให้เองตอนออกจากหน้านี้
      setAsking(false);
      blocker.proceed();
      return;
    }
    setLeaving(true);
    try {
      await onLeave();
    } finally {
      setLeaving(false);
      setAsking(false);
    }
  }, [blocker, onLeave]);

  return {
    requestLeave,
    dialog: { open: joined && (asking || blocked), leaving, onStay, onConfirm },
  };
};
