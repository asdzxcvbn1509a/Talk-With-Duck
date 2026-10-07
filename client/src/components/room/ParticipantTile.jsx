// ตัวแทนผู้ใช้ในห้อง: อวาตาร์เป็ด + วงคลื่นเรืองแสงเมื่อกำลังพูด + สถานะไมค์
import { Crown, MicOff } from 'lucide-react';
import { memo } from 'react';
import { SPEAKING_THRESHOLD } from '../../lib/rtc/levels';
import { useRoomStore } from '../../stores/roomStore';
import DuckAvatar from '../DuckAvatar';
import { ReportButton } from '../ReportModal';
import KickButton from './KickButton';
import VolumeControl from './VolumeControl';

const ParticipantTile = ({
  member,
  isMe,
  isHost,
  online = true,
  connecting = false,
  size = 88,
  compact = false,
  canKick = false,
}) => {
  // อ่านระดับเสียงของคนนี้เอง: ตอนมีคนพูด render ใหม่เฉพาะช่องของคนนั้น ไม่ใช่ทั้งห้อง
  const level = useRoomStore((s) => s.levels[member.userId] ?? 0);
  const speaking = !member.isMuted && level > SPEAKING_THRESHOLD;
  const status = !online ? 'หลุดการเชื่อมต่อ' : connecting ? 'กำลังเชื่อมต่อเสียง…' : '';
  return (
    <div
      className={`group relative flex flex-col items-center gap-2 rounded-(--radius-card) text-center ${compact ? 'p-2' : 'p-3'}`}
    >
      <div className="relative">
        <DuckAvatar
          avatar={member.avatar}
          size={size}
          speaking={speaking}
          level={level}
          dimmed={!online}
          label={member.nickname}
        />
        {member.isMuted && (
          <span
            className="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full bg-danger-strong text-white ring-4 ring-bg"
            title="ปิดไมค์"
          >
            <MicOff size={16} />
          </span>
        )}
        {isHost && (
          <span
            className="absolute -top-2 -left-1 flex h-7 w-7 items-center justify-center rounded-full bg-duck-400 text-on-duck ring-4 ring-bg"
            title="เจ้าของห้อง"
          >
            <Crown size={14} />
          </span>
        )}
      </div>
      <div className="min-w-0 max-w-full">
        <p className="truncate font-semibold">
          {member.nickname}
          {isMe && <span className="font-normal text-muted"> (คุณ)</span>}
        </p>
        {/* แบบย่อ (ห้องคาราโอเกะ) ช่องแคบ: สถานะอยู่บรรทัดเดียวแล้วตัดด้วย … ดูเต็มได้จาก title */}
        <p
          className={`text-xs text-muted ${compact ? 'truncate' : ''}`}
          title={status || undefined}
        >
          ปี {member.year}
          {status && ` · ${status}`}
        </p>
      </div>
      {!isMe && (
        <div className="flex items-center gap-0.5">
          <VolumeControl member={member} />
          {/* เฉพาะเจ้าของห้องกลุ่ม/คาราโอเกะ (ParticipantGrid เป็นคนตัดสิน) */}
          {canKick && <KickButton member={member} />}
        </div>
      )}
      {/* จอที่ใช้เมาส์ซ่อนปุ่มรายงานจนกว่าจะชี้ จอสัมผัส (รวมแท็บเล็ต) แสดงจาง ๆ ไว้ตลอดเพราะไม่มี hover */}
      {!isMe && (
        <ReportButton
          target={{ type: 'user', id: member.userId, label: member.nickname }}
          size={32}
          className="absolute top-1 right-1 opacity-60 group-hover:opacity-100 focus-visible:opacity-100 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100"
        />
      )}
    </div>
  );
};

// memo: รายชื่อ render ใหม่ (เช่น มีคนเข้าห้อง) แล้วช่องที่ข้อมูลไม่เปลี่ยนไม่ต้อง render ตาม
export default memo(ParticipantTile);
