// หน้าหลัก (Lobby): กิจกรรมประจำวัน · ตัวกรองชั้นปี/ประเภทห้อง · รายการห้อง · ทางลัดไปบอร์ด Q&A
// การ์ดกิจกรรมและคำถามล่าสุดอยู่ใน components/lobby/
import { FilterX, Hand, Plus, Shuffle } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import CreateRoomModal from '../components/CreateRoomModal';
import { RoomTypeFilter, YearFilter } from '../components/Filters';
import DailyActivityCard from '../components/lobby/DailyActivityCard';
import LatestQuestions from '../components/lobby/LatestQuestions';
import RoomCard, { RoomCardSkeleton } from '../components/RoomCard';
import { Button, EmptyState, LoadError, PageTitle, SkeletonGroup, Spinner } from '../components/ui';
import { quickMatch } from '../api/rooms';
import { useLobbyRooms } from '../hooks/useLobbyRooms';
import { toastError } from '../lib/api';
import { roomPath } from '../lib/routes';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';

const LobbyPage = () => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { year, type } = useUiStore((s) => s.lobbyFilter);
  const setFilter = useUiStore((s) => s.setLobbyFilter);
  const { rooms, loading, error, retry } = useLobbyRooms({ year, type });
  const [creating, setCreating] = useState(false);
  const [matching, setMatching] = useState(false);
  const filtered = Boolean(year || type);

  const startQuickMatch = async () => {
    setMatching(true);
    try {
      const { data } = await quickMatch({ year });
      navigate(roomPath(data.room), { state: { autoJoin: true } });
    } catch (err) {
      toastError(err);
    } finally {
      setMatching(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageTitle title="หน้าหลัก" />
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-medium sm:text-3xl">
          <span className="min-w-0">สวัสดี {user.nickname}</span>
          <Hand size={28} className="shrink-0 text-duck-500" />
        </h1>
        <p className="text-muted">วันนี้อยากเล่า หรืออยากฟัง?</p>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <DailyActivityCard />
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={startQuickMatch}
            disabled={matching}
            aria-busy={matching}
            className="card flex flex-col items-start justify-between gap-3 p-5 text-left transition hover:border-calm-300 disabled:cursor-wait"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-calm-100 text-calm-700 dark:bg-calm-700/30 dark:text-calm-200">
              {matching ? <Spinner size={20} /> : <Shuffle size={20} />}
            </span>
            <span>
              <span className="block font-display text-lg">สุ่มคุย 1-1</span>
              <span className="text-sm text-muted">
                {matching
                  ? 'กำลังหาเพื่อนที่พร้อมคุย…'
                  : year
                    ? `จับคู่กับคนที่อยากคุยเรื่องปี ${year}`
                    : 'จับคู่เพื่อนที่พร้อมฟัง'}
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="card flex flex-col items-start justify-between gap-3 p-5 text-left transition hover:border-duck-300"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-duck-100 text-duck-800 dark:bg-duck-700/30 dark:text-duck-200">
              <Plus size={20} />
            </span>
            <span>
              <span className="block font-display text-lg">เปิดห้องใหม่</span>
              <span className="text-sm text-muted">ตั้งวงคุย ทำงาน หรือร้องเพลง</span>
            </span>
          </button>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-medium">ห้องที่เปิดอยู่</h2>
          <span className="text-sm text-muted">
            {loading || error ? '' : `${rooms.length} ห้อง`}
          </span>
        </div>
        <YearFilter value={year} onChange={(y) => setFilter({ year: y })} />
        <RoomTypeFilter value={type} onChange={(t) => setFilter({ type: t })} />

        {loading ? (
          <SkeletonGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <RoomCardSkeleton key={i} />
            ))}
          </SkeletonGroup>
        ) : error ? (
          <LoadError title="โหลดรายการห้องไม่สำเร็จ" message={error} onRetry={retry} />
        ) : rooms.length === 0 ? (
          // ข้อความแยกตามว่ากรองอยู่หรือเปล่า: ไม่ได้กรองแต่บอกว่า "ไม่ตรงกับตัวกรอง" จะทำให้งง
          filtered ? (
            <EmptyState
              title="ยังไม่มีห้องที่ตรงกับตัวกรอง"
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant="soft"
                    icon={FilterX}
                    onClick={() => setFilter({ year: null, type: null })}
                  >
                    ล้างตัวกรอง
                  </Button>
                  <Button icon={Plus} onClick={() => setCreating(true)}>
                    เปิดห้องใหม่
                  </Button>
                </div>
              }
            >
              ลองดูห้องของทุกชั้นปี หรือเปิดห้องใหม่ตามที่เลือกไว้ให้เพื่อน ๆ เข้ามาคุยด้วย
            </EmptyState>
          ) : (
            <EmptyState
              title="ยังไม่มีห้องเปิดอยู่ตอนนี้"
              action={
                <Button icon={Plus} onClick={() => setCreating(true)}>
                  เปิดห้องแรกเลย
                </Button>
              }
            >
              เปิดห้องแล้วชวนเพื่อน ๆ มาคุย หรือกด{' '}
              <span className="whitespace-nowrap">“สุ่มคุย 1-1”</span>{' '}
              ด้านบนเพื่อหาเพื่อนที่พร้อมฟัง
            </EmptyState>
          )
        ) : (
          // grid-cols-1 (minmax(0, 1fr)): ชื่อห้องยาวที่ตัดด้วย … จะไม่ดันคอลัมน์ให้กว้างเกินจอมือถือ
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </section>

      <LatestQuestions />

      <CreateRoomModal
        key={creating ? 'open' : 'closed'}
        open={creating}
        onClose={() => setCreating(false)}
        defaultType={type ?? 'group'}
        defaultYear={year}
      />
    </div>
  );
};

export default LobbyPage;
