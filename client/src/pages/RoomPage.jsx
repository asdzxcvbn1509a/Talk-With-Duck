// ห้องพูดคุย 1-1 (Private Duck Room) และห้องกลุ่ม 5+ คน (Group Hangout Room) — ข้อ 3.5.5
import { Link, Lock, Users } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useParams } from 'react-router';
import { ReportButton } from '../components/ReportModal';
import ChatPanel from '../components/room/ChatPanel';
import ControlBar from '../components/room/ControlBar';
import LeaveRoomDialog from '../components/room/LeaveRoomDialog';
import ParticipantGrid from '../components/room/ParticipantGrid';
import PreJoin from '../components/room/PreJoin';
import RoomStatusScreen from '../components/room/RoomStatusScreen';
import { Badge } from '../components/ui';
import { ROOM_TYPES } from '../config/constants';
import { useLeaveRoomGuard } from '../hooks/useLeaveRoomGuard';
import { useRoomLifecycle } from '../hooks/useRoomLifecycle';
import { useUnread } from '../hooks/useUnread';
import { yearLabel } from '../lib/format';
import { roomSession } from '../lib/roomSession';
import { useRoomStore } from '../stores/roomStore';
import { toast } from '../stores/uiStore';

const WaitingForFriend = () => {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast('คัดลอกลิงก์ห้องแล้ว ส่งให้เพื่อนที่อยากคุยด้วยได้เลย', 'success');
    } catch {
      toast('คัดลอกไม่สำเร็จ ลองคัดลอกจากแถบที่อยู่แทนนะ', 'error');
    }
  };
  return (
    <div className="mx-auto mt-6 max-w-sm rounded-(--radius-card) border border-dashed border-line p-5 text-center">
      <img src="/duck.svg" alt="" className="mx-auto h-14 w-14 animate-float" />
      <p className="mt-2 font-medium">รอเพื่อนอีกคนเข้ามา…</p>
      <p className="text-sm text-muted">ห้องนี้จะแสดงในหน้าหลัก หรือส่งลิงก์ให้เพื่อนก็ได้</p>
      <button
        type="button"
        onClick={copy}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-calm-600 hover:underline dark:text-calm-300"
      >
        <Link size={16} /> คัดลอกลิงก์ห้อง
      </button>
    </div>
  );
};

const RoomPage = () => {
  const { id } = useParams();
  const lifecycle = useRoomLifecycle(id);
  const { status, preview } = lifecycle;
  const leaveGuard = useLeaveRoomGuard(id, lifecycle.leave);
  const room = useRoomStore((s) => s.room);
  const members = useRoomStore((s) => s.members);
  const muted = useRoomStore((s) => s.muted);
  const micAvailable = useRoomStore((s) => s.micAvailable);
  const error = useRoomStore((s) => s.error);
  // จอใหญ่เปิดแชทไว้ข้าง ๆ เลย จอมือถือซ่อนไว้ก่อน (Progressive Disclosure)
  const [chatOpen, setChatOpen] = useState(
    () => window.matchMedia?.('(min-width: 1024px)').matches ?? false,
  );
  const unread = useUnread(chatOpen);

  if (preview?.type === 'karaoke') return <Navigate to={`/karaoke/${id}`} replace />;

  // หลุดระหว่างอยู่ในห้อง (ถ้าเข้าห้องไม่สำเร็จตั้งแต่แรก PreJoin จะแสดงสาเหตุเอง)
  const ended =
    ['closed', 'replaced', 'left'].includes(status) || (status === 'error' && !lifecycle.joinError);
  if (ended && !lifecycle.joining) {
    return (
      <RoomStatusScreen
        status={status}
        error={error}
        onRetry={() => lifecycle.join({ withMic: true })}
      />
    );
  }
  if (status !== 'joined' || !room) return <PreJoin {...lifecycle} onJoin={lifecycle.join} />;

  const type = ROOM_TYPES[room.type];

  return (
    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">
      <section className="min-w-0">
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-medium">{room.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              <Badge>
                <type.icon size={14} /> {type.label}
              </Badge>
              <Badge tone="muted">{yearLabel(room.yearFilter)}</Badge>
              <span className="flex items-center gap-1">
                <Users size={16} /> {members.length}/{room.capacity}
              </span>
            </div>
          </div>
          <ReportButton target={{ type: 'room', id: room.id, label: room.name }} />
        </header>

        <div className="card p-4 sm:p-6">
          <ParticipantGrid tileSize={room.type === 'private' ? 112 : 88} />
          {room.type === 'private' && members.length < 2 && <WaitingForFriend />}
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Lock size={12} className="shrink-0" /> เรื่องเล่าจบในห้อง · ห้ามอัดเสียงหรือแคปหน้าจอ
        </p>
      </section>

      {chatOpen && (
        <>
          <button
            type="button"
            aria-label="ปิดแชท"
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setChatOpen(false)}
          />
          <ChatPanel
            onClose={() => setChatOpen(false)}
            className="card fixed inset-x-0 bottom-0 z-40 h-[75dvh] rounded-b-none pb-[env(safe-area-inset-bottom)] lg:sticky lg:top-20 lg:z-auto lg:h-[calc(100dvh-12rem)] lg:rounded-b-(--radius-card) lg:pb-0"
          />
        </>
      )}

      <ControlBar
        muted={muted}
        micAvailable={micAvailable}
        onToggleMute={() => roomSession.toggleMute()}
        onLeave={leaveGuard.requestLeave}
        onToggleChat={() => setChatOpen((v) => !v)}
        chatOpen={chatOpen}
        unread={unread}
      />
      <LeaveRoomDialog {...leaveGuard.dialog} />
    </div>
  );
};

export default RoomPage;
