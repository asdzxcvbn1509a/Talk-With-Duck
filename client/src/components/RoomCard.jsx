// การ์ดแสดงห้องสนทนาในหน้า Lobby (ป้ายชั้นปี ประเภทห้อง และจำนวนคน — Low Cognitive Load)
// ห้องคาราโอเกะบอกสถานะ "กำลังเล่นเพลง / คิวว่าง" แทนคำอธิบายประเภทห้อง (บทที่ 2 แนวคิด UX/UI)
import { Disc3 } from 'lucide-react';
import { Link } from 'react-router';
import { ROOM_TYPES } from '../config/constants';
import { yearLabel } from '../lib/format';
import { roomPath } from '../lib/routes';
import DuckAvatar from './DuckAvatar';
import { Badge, Skeleton } from './ui';

const MAX_AVATARS = 5;

const karaokeStatus = (room) =>
  room.nowPlaying ? `กำลังเล่น: ${room.nowPlaying}` : 'คิวว่าง · จองเพลงแรกได้เลย';

const RoomCard = ({ room }) => {
  const type = ROOM_TYPES[room.type];
  const full = room.memberCount >= room.capacity;
  const shown = room.members.slice(0, MAX_AVATARS);
  const hiddenCount = room.memberCount - shown.length;
  const karaoke = room.type === 'karaoke';
  const status = karaoke ? karaokeStatus(room) : null;

  return (
    <Link
      to={roomPath(room)}
      className="card group flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:border-duck-300"
      aria-label={`${room.name} ${type.label} ${yearLabel(room.yearFilter)} ${status ? `${status} ` : ''}${full ? 'ห้องเต็มแล้ว' : `${room.memberCount} จาก ${room.capacity} คน`}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-duck-800 dark:text-duck-300"
          aria-hidden
        >
          <type.icon size={24} />
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Badge tone={karaoke ? 'beak' : room.type === 'private' ? 'calm' : 'duck'}>
            {type.label}
          </Badge>
          <Badge tone="muted">{yearLabel(room.yearFilter)}</Badge>
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-lg font-medium group-hover:text-duck-800 dark:group-hover:text-duck-300">
          {room.name}
        </h3>
        {karaoke ? (
          <p
            className={`flex min-w-0 items-center gap-1.5 text-sm ${room.nowPlaying ? 'font-semibold text-beak-700 dark:text-beak-300' : 'text-muted'}`}
          >
            <Disc3
              size={16}
              className={`shrink-0 ${room.nowPlaying ? 'animate-spin [animation-duration:3s]' : ''}`}
              aria-hidden="true"
            />
            <span className="truncate">{status}</span>
          </p>
        ) : (
          <p className="text-sm text-muted">{type.description}</p>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between">
        <div className="flex -space-x-2">
          {shown.map((m) => (
            <DuckAvatar
              key={m.userId}
              avatar={m.avatar}
              size={32}
              className="ring-2 ring-surface"
              label={m.nickname}
            />
          ))}
          {hiddenCount > 0 && (
            <span className="relative grid h-8 min-w-8 place-items-center rounded-full bg-surface-2 px-1.5 text-xs font-bold text-muted ring-2 ring-surface">
              +{hiddenCount}
            </span>
          )}
        </div>
        <span className={`text-sm font-semibold ${full ? 'text-danger' : 'text-muted'}`}>
          {full ? 'เต็มแล้ว' : `${room.memberCount}/${room.capacity} คน`}
        </span>
      </div>
    </Link>
  );
};

/** โครงการ์ดห้องระหว่างโหลด ขนาดเท่าการ์ดจริง หน้าจะไม่กระโดดตอนข้อมูลมา */
export const RoomCardSkeleton = () => {
  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-14" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          <Skeleton className="h-8 w-8 ring-2 ring-surface" />
          <Skeleton className="h-8 w-8 ring-2 ring-surface" />
        </div>
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
};

export default RoomCard;
