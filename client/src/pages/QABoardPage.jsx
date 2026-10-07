// Open Q&A Board: กระดานทิ้งคำถาม ตอบได้ไม่จำกัดจำนวนคน ค้นหาด้วยคำได้ (ข้อ 3.5.7)
import { FilterX, Pin, Plus, Search, SearchX, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { buttonClass } from '../components/buttonClass';
import { TopicFilter, YearFilter } from '../components/Filters';
import QuestionCard, { QuestionCardSkeleton } from '../components/qa/QuestionCard';
import {
  Button,
  EmptyState,
  IconButton,
  LoadError,
  PageTitle,
  Segmented,
  SkeletonGroup,
} from '../components/ui';
import { listQuestions } from '../api/questions';
import { useApiQuery } from '../hooks/useApiQuery';
import { errorMessage } from '../lib/api';
import { toast, useUiStore } from '../stores/uiStore';

const SORTS = [
  { value: 'latest', label: 'ล่าสุด' },
  { value: 'popular', label: 'ได้ใจมากสุด' },
  { value: 'unanswered', label: 'รอคำตอบ' },
];

// รอให้หยุดพิมพ์ก่อนค่อยค้น จะได้ไม่ยิงคำขอทุกตัวอักษร
const SEARCH_DELAY_MS = 400;

// บอร์ดว่าง: แยกตามว่าค้นหรือกรองปี/หัวข้ออยู่หรือเปล่า (ไม่ได้กรองแต่บอกว่า "ในหมวดนี้" จะทำให้งง)
const emptyTitle = (sort, filtered, q) => {
  if (q) {
    const what = sort === 'unanswered' ? 'คำถามที่รอคำตอบ' : 'คำถาม';
    return `ไม่พบ${what}ที่มีคำว่า “${q}”${filtered ? ' ในหมวดนี้' : ''}`;
  }
  if (sort === 'unanswered') {
    return filtered ? 'คำถามในหมวดนี้มีคนตอบครบแล้ว' : 'ทุกคำถามมีคนตอบแล้ว เยี่ยมมาก!';
  }
  return filtered ? 'ยังไม่มีคำถามในหมวดนี้' : 'ยังไม่มีคำถามบนบอร์ด';
};

const emptyLinkText = (sort, q) => {
  if (q) return 'ตั้งคำถามนี้เลย';
  return sort === 'unanswered' ? 'ตั้งคำถามใหม่' : 'เป็นคนแรกที่ตั้งคำถาม';
};

const QABoardPage = () => {
  const filter = useUiStore((s) => s.qaFilter);
  const setFilter = useUiStore((s) => s.setQaFilter);
  // คำที่กำลังพิมพ์ · ส่งไปค้นจริง (filter.q) หลังหยุดพิมพ์
  const [text, setText] = useState(filter.q);
  const params = {
    year: filter.year ?? undefined,
    topic: filter.topic ?? undefined,
    sort: filter.sort,
    q: filter.q || undefined,
  };

  useEffect(() => {
    const q = text.trim();
    if (q === filter.q) return undefined;
    const timer = setTimeout(() => setFilter({ q }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, filter.q, setFilter]);

  // กด Enter: ค้นทันทีไม่ต้องรอ
  const submitSearch = (e) => {
    e.preventDefault();
    setFilter({ q: text.trim() });
  };

  const clearSearch = () => {
    setText('');
    setFilter({ q: '' });
  };
  const { data, error: loadError, loading, setData, retry } = useApiQuery(listQuestions, params);
  const items = data?.items ?? [];
  const nextCursor = data?.nextCursor ?? null;
  const error = loadError ? errorMessage(loadError) : null;
  const filtered = Boolean(filter.year || filter.topic);
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
      <PageTitle title="บอร์ดคำถาม" />
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
        <form role="search" onSubmit={submitSearch} className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            className="input pr-12 pl-11"
            inputMode="search"
            enterKeyHint="search"
            maxLength={100}
            placeholder="ค้นหาคำถาม เช่น ฝึกงาน"
            aria-label="ค้นหาคำถาม"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {text && (
            <IconButton
              icon={X}
              label="ล้างคำค้นหา"
              size={36}
              iconSize={18}
              className="absolute top-1/2 right-2 -translate-y-1/2"
              onClick={clearSearch}
            />
          )}
        </form>
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
          title={emptyTitle(filter.sort, filtered, filter.q)}
          action={
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
              {filter.q && (
                <Button variant="soft" icon={SearchX} onClick={clearSearch}>
                  ล้างการค้นหา
                </Button>
              )}
              {filtered && (
                <Button
                  variant="soft"
                  icon={FilterX}
                  onClick={() => setFilter({ year: null, topic: null })}
                >
                  ล้างตัวกรอง
                </Button>
              )}
              <Link to="/qa/new" className="link">
                {emptyLinkText(filter.sort, filter.q)}
              </Link>
            </div>
          }
        >
          {filter.q && 'ลองคำที่สั้นลงหรือคำอื่น หรือตั้งเป็นคำถามใหม่ให้เพื่อน ๆ ช่วยตอบ'}
        </EmptyState>
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
