// การ์ดแสดงห้องสนทนาในหน้า Lobby (ป้ายชั้นปี ประเภทห้อง และจำนวนคน — Low Cognitive Load)
import { Link } from 'react-router';
import { ROOM_TYPES } from '../config/constants';
import { yearLabel } from '../lib/format';
import { roomPath } from '../lib/routes';
import DuckAvatar from './DuckAvatar';
import { Badge } from './ui';

const RoomCard = ({ room }) => {
  const type = ROOM_TYPES[room.type];
  const full = room.memberCount >= room.capacity;
  const shown = room.members.slice(0, 5);

  return (
    <Link
      to={roomPath(room)}
      className={`card group flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:border-duck-300 ${full ? 'opacity-70' : ''}`}
      aria-label={`${room.name} ${type.label} ${yearLabel(room.yearFilter)} ${room.memberCount} จาก ${room.capacity} คน`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-duck-700 dark:text-duck-300"
          aria-hidden
        >
          <type.icon size={24} />
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Badge
            tone={room.type === 'karaoke' ? 'beak' : room.type === 'private' ? 'calm' : 'duck'}
          >
            {type.label}
          </Badge>
          <Badge tone="muted">{yearLabel(room.yearFilter)}</Badge>
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-lg font-medium group-hover:text-duck-700 dark:group-hover:text-duck-300">
          {room.name}
        </h3>
        <p className="text-sm text-muted">{type.description}</p>
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
        </div>
        <span className={`text-sm font-semibold ${full ? 'text-danger' : 'text-muted'}`}>
          {full ? 'เต็มแล้ว' : `${room.memberCount}/${room.capacity} คน`}
        </span>
      </div>
    </Link>
  );
};

export default RoomCard;
