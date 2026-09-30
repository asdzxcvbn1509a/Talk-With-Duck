// วงจรของหน้าห้อง: โหลดข้อมูลห้องก่อนเข้า · เข้าห้องอัตโนมัติหลังสร้างห้อง · ออกจากห้องเมื่อออกจากหน้านี้
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { readRoom } from '../api/rooms';
import { roomSession } from '../lib/roomSession';
import { useRoomStore } from '../stores/roomStore';
import { useApiQuery } from './useApiQuery';

// ใช้ setTimeout เพื่อให้ StrictMode (mount → unmount → mount ตอน dev) ไม่ทำให้หลุดออกจากห้อง
const pendingLeaves = new Map();

export const useRoomLifecycle = (roomId, { backTo = '/lobby' } = {}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const status = useRoomStore((s) => (s.roomId === roomId ? s.status : 'idle'));
  const { data, error: previewError } = useApiQuery(readRoom, roomId);
  const preview = data?.room ?? null;
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const autoJoinStarted = useRef(false);

  useEffect(() => {
    clearTimeout(pendingLeaves.get(roomId));
    pendingLeaves.delete(roomId);
    return () => {
      pendingLeaves.set(
        roomId,
        setTimeout(() => {
          pendingLeaves.delete(roomId);
          if (roomSession.roomId === roomId) roomSession.leave();
        }, 0),
      );
    };
  }, [roomId]);

  const join = useCallback(
    async (options) => {
      setJoining(true);
      setJoinError(null);
      try {
        await roomSession.join(roomId, options);
      } catch (err) {
        setJoinError(err);
      } finally {
        setJoining(false);
      }
    },
    [roomId],
  );

  useEffect(() => {
    if (!location.state?.autoJoin || autoJoinStarted.current) return;
    autoJoinStarted.current = true;
    navigate(location.pathname, { replace: true, state: null });
    join({ withMic: true });
  }, [location.state, location.pathname, navigate, join]);

  const leave = useCallback(async () => {
    await roomSession.leave();
    navigate(backTo);
  }, [navigate, backTo]);

  return { status, preview, previewError, joining, joinError, join, leave };
};
