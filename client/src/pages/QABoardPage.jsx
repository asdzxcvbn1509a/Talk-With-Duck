// Open Q&A Board: กระดานทิ้งคำถาม ตอบได้ไม่จำกัดจำนวนคน (ข้อ 3.5.7)
import { CloudOff, MessageCircleQuestionMark, Pin, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { TopicFilter, YearFilter } from '../components/Filters';
import QuestionCard from '../components/qa/QuestionCard';
import { Button, EmptyState, Spinner } from '../components/ui';
import { listQuestions } from '../api/questions';
import { useApiQuery } from '../hooks/useApiQuery';
import { errorMessage } from '../lib/api';
import { toast, useUiStore } from '../stores/uiStore';

const SORTS = [
  ['latest', 'ล่าสุด'],
  ['popular', 'ได้ใจมากสุด'],
  ['unanswered', 'รอคำตอบ'],
];

const QABoardPage = () => {
  const filter = useUiStore((s) => s.qaFilter);
  const setFilter = useUiStore((s) => s.setQaFilter);
  const params = {
    year: filter.year ?? undefined,
    topic: filter.topic ?? undefined,
    sort: filter.sort,
  };
  const { data, error: loadError, loading, setData } = useApiQuery(listQuestions, params);
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
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-medium sm:text-3xl">
            <Pin size={26} className="shrink-0 text-beak-500" /> บอร์ดฝากคำถาม
          </h1>
          <p className="text-muted">ทิ้งคำถามไว้ แล้วกลับมาดูคำตอบจากเพื่อนและรุ่นพี่ได้ตลอดเวลา</p>
        </div>
        <Link
          to="/qa/new"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-duck-400 px-5 font-semibold text-[#3B2F1E] shadow-(--shadow-soft) transition hover:bg-duck-300"
        >
          <Plus size={18} /> ตั้งคำถาม
        </Link>
      </header>

      <div className="space-y-2">
        <div
          className="flex gap-1 rounded-full bg-surface-2 p-1 text-sm font-semibold sm:w-fit"
          role="tablist"
          aria-label="เรียงลำดับ"
        >
          {SORTS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter.sort === key}
              onClick={() => setFilter({ sort: key })}
              className={`flex-1 rounded-full px-2 py-2 transition sm:flex-none sm:px-4 ${filter.sort === key ? 'bg-surface shadow' : 'text-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <YearFilter value={filter.year} onChange={(year) => setFilter({ year })} />
        <TopicFilter value={filter.topic} onChange={(topic) => setFilter({ topic })} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted">
          <Spinner />
        </div>
      ) : error ? (
        <EmptyState icon={CloudOff} title="โหลดบอร์ดไม่สำเร็จ">
          {error}
        </EmptyState>
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestionMark}
          title={
            filter.sort === 'unanswered'
              ? 'ทุกคำถามมีคนตอบแล้ว เยี่ยมมาก!'
              : 'ยังไม่มีคำถามในหมวดนี้'
          }
          action={
            <Link
              to="/qa/new"
              className="font-semibold text-calm-600 hover:underline dark:text-calm-300"
            >
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
    </div>
  );
};

export default QABoardPage;
