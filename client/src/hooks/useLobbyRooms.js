// รายการห้องที่เปิดอยู่ อัปเดตสดผ่าน Socket.IO (lobby:room-upserted / lobby:room-removed)
import { useEffect } from 'react';
import { listRooms } from '../api/rooms';
import { errorMessage } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useApiQuery } from './useApiQuery';

const newestFirst = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

export const useLobbyRooms = ({ year = null, type = null } = {}) => {
  const { data, error, loading, setData, retry } = useApiQuery(listRooms, {
    year: year ?? undefined,
    type: type ?? undefined,
  });

  useEffect(() => {
    const matches = (room) => (!year || room.yearFilter === year) && (!type || room.type === type);
    const socket = getSocket();
    const subscribe = () => socket.emit('lobby:subscribe');
    const onUpsert = (room) =>
      setData((prev) => {
        if (!prev) return prev;
        const others = prev.rooms.filter((r) => r.id !== room.id);
        return { rooms: matches(room) ? [...others, room].sort(newestFirst) : others };
      });
    const onRemove = ({ id }) =>
      setData((prev) => prev && { rooms: prev.rooms.filter((r) => r.id !== id) });

    subscribe();
    socket.on('connect', subscribe);
    socket.on('lobby:room-upserted', onUpsert);
    socket.on('lobby:room-removed', onRemove);
    return () => {
      socket.off('connect', subscribe);
      socket.off('lobby:room-upserted', onUpsert);
      socket.off('lobby:room-removed', onRemove);
      socket.emit('lobby:unsubscribe');
    };
  }, [year, type, setData]);

  return { rooms: data?.rooms ?? [], loading, error: error ? errorMessage(error) : null, retry };
};
