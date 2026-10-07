// Open Q&A Board: กระดานทิ้งคำถาม ตอบได้ไม่จำกัดจำนวนคน (ข้อ 3.5.7)
import { Pin, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { buttonClass } from '../components/buttonClass';
import { TopicFilter, YearFilter } from '../components/Filters';
import QuestionCard, { QuestionCardSkeleton } from '../components/qa/QuestionCard';
import { Button, EmptyState, LoadError, Segmented, SkeletonGroup } from '../components/ui';
import { listQuestions } from '../api/questions';
import { useApiQuery } from '../hooks/useApiQuery';
import { errorMessage } from '../lib/api';
import { toast, useUiStore } from '../stores/uiStore';

const SORTS = [
  { value: 'latest', label: 'ล่าสุด' },
  { value: 'popular', label: 'ได้ใจมากสุด' },
  { value: 'unanswered', label: 'รอคำตอบ' },
];

const QABoardPage = () => {
  const filter = useUiStore((s) => s.qaFilter);
  const setFilter = useUiStore((s) => s.setQaFilter);
  const params = {
    year: filter.year ?? undefined,
    topic: filter.topic ?? undefined,
    sort: filter.sort,
  };
  const { data, error: loadError, loading, setData, retry } = useApiQuery(listQuestions, params);
  const items = data?.items ?? [];
  const nextCursor = data?.nextCursor ?? null;
  const error = loadError ? errorMessage(loadError) : null;
  const [loadingMore, setLoadingMore] = useState(false);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data: page } = await listQuestions({ ...params, cursor: nextCursor });
      setData((prev) => ({ items: [...prev.items, ...page.items], nextCursor: page.nextCursor }));
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const onLoveChange = (id, patch) =>
    setData((prev) => ({
      ...prev,
      items: prev.items.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    }));

  return (
    // มือถือ: เว้นที่ท้ายหน้าให้ปุ่ม "ตั้งคำถาม" แบบลอย ไม่บังปุ่มโหลดเพิ่ม
    <div className="space-y-5 pb-16 md:pb-0">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-medium sm:text-3xl">
            <Pin size={26} className="shrink-0 text-beak-500" /> บอร์ดฝากคำถาม
          </h1>
          <p className="text-muted">ทิ้งคำถามไว้ แล้วกลับมาดูคำตอบจากเพื่อนและรุ่นพี่ได้ตลอดเวลา</p>
        </div>
        {/* max-md:hidden (ไม่ใช่ hidden md:inline-flex): buttonClass มี inline-flex อยู่แล้ว ต้องใช้ variant ถึงจะชนะ */}
        <Link to="/qa/new" className={buttonClass({ className: 'max-md:hidden' })}>
          <Plus size={18} /> ตั้งคำถาม
        </Link>
      </header>

      <div className="space-y-2">
        <Segmented
          label="เรียงลำดับ"
          options={SORTS}
          value={filter.sort}
          onChange={(sort) => setFilter({ sort })}
          fit
        />
        <YearFilter value={filter.year} onChange={(year) => setFilter({ year })} />
        <TopicFilter value={filter.topic} onChange={(topic) => setFilter({ topic })} />
      </div>

      {loading ? (
        <SkeletonGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <QuestionCardSkeleton key={i} />
          ))}
        </SkeletonGroup>
      ) : error ? (
        <LoadError title="โหลดบอร์ดไม่สำเร็จ" message={error} onRetry={retry} />
      ) : items.length === 0 ? (
        <EmptyState
          mascot="duck-glasses"
          title={
            filter.sort === 'unanswered'
              ? 'ทุกคำถามมีคนตอบแล้ว เยี่ยมมาก!'
              : 'ยังไม่มีคำถามในหมวดนี้'
          }
          action={
            <Link to="/qa/new" className="link">
              เป็นคนแรกที่ตั้งคำถาม
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((q, i) => (
              <QuestionCard key={q.id} question={q} index={i} onLoveChange={onLoveChange} />
            ))}
          </div>
          {nextCursor && (
            <div className="flex justify-center">
              <Button variant="outline" icon={Plus} onClick={loadMore} loading={loadingMore}>
                โหลดเพิ่ม
              </Button>
            </div>
          )}
        </>
      )}

      {/* มือถือ: ปุ่มตั้งคำถามลอยอยู่เหนือเมนูล่าง เลื่อนลงไปไกลแค่ไหนก็กดได้ (จอกว้างใช้ปุ่มบนหัวหน้า) */}
      <Link
        to="/qa/new"
        className={buttonClass({
          size: 'lg',
          className: 'fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 md:hidden',
        })}
      >
        <Plus size={22} /> ตั้งคำถาม
      </Link>
    </div>
  );
};

export default QABoardPage;
