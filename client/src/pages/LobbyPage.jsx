// หน้าหลัก (Lobby): กิจกรรมประจำวัน · ตัวกรองชั้นปี/ประเภทห้อง · รายการห้อง · ทางลัดไปบอร์ด Q&A
import { ExternalLink, FilterX, Hand, Pin, Plus, Shuffle } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import CreateRoomModal from '../components/CreateRoomModal';
import { RoomTypeFilter, YearFilter } from '../components/Filters';
import RoomCard, { RoomCardSkeleton } from '../components/RoomCard';
import {
  Button,
  EmptyState,
  LoadError,
  PageTitle,
  Skeleton,
  SkeletonGroup,
  Spinner,
} from '../components/ui';
import { activityFor } from '../config/dailyActivities';
import { TOPICS } from '../config/constants';
import { listQuestions } from '../api/questions';
import { quickMatch } from '../api/rooms';
import { useApiQuery } from '../hooks/useApiQuery';
import { useLobbyRooms } from '../hooks/useLobbyRooms';
import { errorMessage } from '../lib/api';
import { timeAgo } from '../lib/format';
import { roomPath } from '../lib/routes';
import { useAuthStore } from '../stores/authStore';
import { toast, useUiStore } from '../stores/uiStore';

const LATEST_QUESTIONS = { limit: 3 };

const ACTIVITY_CARD_CLASS =
  'relative block overflow-hidden rounded-(--radius-card) bg-gradient-to-br from-duck-300 via-duck-400 to-beak-400 p-6 text-on-duck shadow-(--shadow-soft)';

const DailyActivityCard = () => {
  const activity = activityFor();
  const content = (
    <>
      <p className="flex items-center gap-1.5 text-sm font-semibold opacity-80">
        <activity.icon size={16} />
        {activity.special ? 'Duck Community Week' : 'กิจกรรมวันนี้'}
        {activity.href && <ExternalLink size={14} aria-hidden="true" />}
      </p>
      <h2 className="mt-1 max-w-[80%] text-2xl font-medium">{activity.title}</h2>
      <p className="mt-2 max-w-[75%] text-on-duck/80">
        {activity.detail}
        {activity.href && <span className="sr-only"> (เปิดในแท็บใหม่)</span>}
      </p>
      <img
        src="/duck.svg"
        alt=""
        className="absolute -right-4 -bottom-6 h-24 w-24 rotate-12 opacity-90 sm:h-32 sm:w-32"
      />
    </>
  );

  // แบบประเมิน (Google Forms) เป็นเว็บภายนอก: เปิดแท็บใหม่ ผู้ใช้จะได้ไม่หลุดจากบ่อเป็ด
  return activity.href ? (
    <a
      href={activity.href}
      target="_blank"
      rel="noopener noreferrer"
      className={ACTIVITY_CARD_CLASS}
    >
      {content}
    </a>
  ) : (
    <Link to={activity.to} className={ACTIVITY_CARD_CLASS}>
      {content}
    </Link>
  );
};

const LatestQuestions = () => {
  const { data, error, loading } = useApiQuery(listQuestions, LATEST_QUESTIONS);
  const items = data?.items ?? [];

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <Pin size={20} className="text-beak-500" /> บอร์ดฝากคำถาม
        </h2>
        <Link to="/qa" className="link text-sm">
          ดูทั้งหมด
        </Link>
      </div>
      {loading ? (
        <SkeletonGroup className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </SkeletonGroup>
      ) : error || items.length === 0 ? (
        <p className="text-sm text-muted">
          {error
            ? 'โหลดคำถามล่าสุดไม่สำเร็จ ดูทั้งหมดได้ที่บอร์ด'
            : 'ยังไม่มีคำถาม เป็นคนแรกที่ทิ้งคำถามไว้สิ'}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((q) => {
            const topic = TOPICS[q.topic] ?? TOPICS.other;
            return (
              <li key={q.id}>
                <Link
                  to={`/qa/${q.id}`}
                  className="flex items-center gap-3 rounded-2xl p-2 hover:bg-surface-2"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-duck-100 text-duck-800 dark:bg-surface-2 dark:text-duck-300">
                    <topic.icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{q.title}</span>
                    <span className="text-xs text-muted">
                      {q.answerCount} คำตอบ · {timeAgo(q.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

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
      toast(errorMessage(err), 'error');
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
