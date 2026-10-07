// Duck Karaoke Lounge: ซ้าย = วิดีโอ/เนื้อเพลง · ขวา = คิวเพลงและแชทพร้อมสติกเกอร์ (ข้อ 3.5.6 ข้อ 6)
import { Crown, ListMusic, MessageCircle, MicVocal, Users } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useParams } from 'react-router';
import KaraokePlayer from '../components/karaoke/KaraokePlayer';
import SongQueue from '../components/karaoke/SongQueue';
import SongSearch from '../components/karaoke/SongSearch';
import { ReportButton } from '../components/ReportModal';
import ChatPanel from '../components/room/ChatPanel';
import ConnectionBanner from '../components/room/ConnectionBanner';
import ControlBar from '../components/room/ControlBar';
import LeaveRoomDialog from '../components/room/LeaveRoomDialog';
import ParticipantGrid from '../components/room/ParticipantGrid';
import PreJoin from '../components/room/PreJoin';
import RoomStatusScreen from '../components/room/RoomStatusScreen';
import ShareRoomButton from '../components/room/ShareRoomButton';
import { Badge, PageTitle, Segmented } from '../components/ui';
import { useLeaveRoomGuard } from '../hooks/useLeaveRoomGuard';
import { useRoomLifecycle } from '../hooks/useRoomLifecycle';
import { yearLabel } from '../lib/format';
import { roomSession } from '../lib/roomSession';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';

// จอแคบแสดงทีละส่วน: คิวเพลง หรือ แชท (จอกว้างแสดงทั้งสองส่วนพร้อมกัน)
const PANELS = [
  { value: 'queue', label: 'คิวเพลง', icon: ListMusic },
  { value: 'chat', label: 'แชท', icon: MessageCircle },
];

const KaraokeRoomPage = () => {
  const { id } = useParams();
  const lifecycle = useRoomLifecycle(id, { backTo: '/karaoke' });
  const { status, preview } = lifecycle;
  const leaveGuard = useLeaveRoomGuard(id, lifecycle.leave);
  const me = useAuthStore((s) => s.user);
  const room = useRoomStore((s) => s.room);
  const hostId = useRoomStore((s) => s.hostId);
  const members = useRoomStore((s) => s.members);
  const muted = useRoomStore((s) => s.muted);
  const micAvailable = useRoomStore((s) => s.micAvailable);
  const error = useRoomStore((s) => s.error);
  const [tab, setTab] = useState('queue');
  // ไม่ใช้ชื่อห้องเป็นชื่อแท็บ (ดู PageTitle)
  const pageTitle = <PageTitle title="ห้องคาราโอเกะ" />;

  if (preview && preview.type !== 'karaoke') return <Navigate to={`/room/${id}`} replace />;

  const ended =
    ['closed', 'replaced', 'left', 'kicked'].includes(status) ||
    (status === 'error' && !lifecycle.joinError);
  if (ended && !lifecycle.joining) {
    return (
      <>
        {pageTitle}
        <RoomStatusScreen
          status={status}
          error={error}
          backTo="/karaoke"
          onRetry={() => lifecycle.join({ withMic: true })}
        />
      </>
    );
  }
  if (status !== 'joined' || !room) {
    return (
      <>
        {pageTitle}
        <PreJoin {...lifecycle} onJoin={lifecycle.join} backTo="/karaoke" />
      </>
    );
  }

  const isHost = hostId === me.id;

  return (
    <div className="space-y-4">
      {pageTitle}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-beak-700 dark:text-beak-300">
            <MicVocal size={16} /> Duck Karaoke Lounge
          </p>
          <h1 className="truncate text-2xl font-medium">{room.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge tone="muted">{yearLabel(room.yearFilter)}</Badge>
            <span className="flex items-center gap-1">
              <Users size={16} /> {members.length}/{room.capacity}
            </span>
            {isHost && (
              <Badge tone="duck">
                <Crown size={12} /> คุณคือเจ้าของห้อง
              </Badge>
            )}
          </div>
        </div>
        <div className="flex shrink-0">
          <ShareRoomButton roomName={room.name} />
          <ReportButton target={{ type: 'room', id: room.id, label: room.name }} />
        </div>
      </header>

      <ConnectionBanner />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 space-y-4">
          <KaraokePlayer roomId={room.id} isHost={isHost} />
          <div className="card p-3">
            <ParticipantGrid compact tileSize={56} />
          </div>
        </section>

        <aside className="flex min-h-0 min-w-0 flex-col gap-4">
          <Segmented
            label="แสดงส่วน"
            options={PANELS}
            value={tab}
            onChange={setTab}
            className="lg:hidden"
          />
          <div className={`card space-y-4 p-4 ${tab === 'queue' ? '' : 'hidden lg:block'}`}>
            <h2 className="font-display text-lg">จองเพลง</h2>
            <SongSearch roomId={room.id} />
            <h2 className="font-display text-lg">คิวเพลง</h2>
            <div className="max-h-80 overflow-y-auto">
              <SongQueue roomId={room.id} isHost={isHost} />
            </div>
          </div>
          <ChatPanel
            title="แชท & ส่งกำลังใจ"
            className={`card h-[60dvh] lg:h-[420px] ${tab === 'chat' ? '' : 'hidden lg:flex'}`}
          />
        </aside>
      </div>

      <ControlBar
        muted={muted}
        micAvailable={micAvailable}
        onToggleMute={() => roomSession.toggleMute()}
        onLeave={leaveGuard.requestLeave}
      />
      <LeaveRoomDialog {...leaveGuard.dialog} />
    </div>
  );
};

export default KaraokeRoomPage;
