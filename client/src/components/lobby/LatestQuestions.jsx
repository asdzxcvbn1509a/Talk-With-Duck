// คำถามล่าสุด 3 ข้อบนหน้าหลัก: ทางลัดไปบอร์ดฝากคำถาม (ตารางที่ 3.4)
import { Pin } from 'lucide-react';
import { Link } from 'react-router';
import { TOPICS } from '../../config/constants';
import { listQuestions } from '../../api/questions';
import { useApiQuery } from '../../hooks/useApiQuery';
import { timeAgo } from '../../lib/format';
import { Skeleton, SkeletonGroup } from '../ui';

const LATEST_QUESTIONS = { limit: 3 };

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

export default LatestQuestions;
