// การ์ดคำถามแบบ Sticky Note: แท็กชั้นปี/หัวข้อ ปุ่ม Give Love และจำนวนคำตอบ (ข้อ 2 UI Layout)
import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router';
import { TOPICS } from '../../config/constants';
import { timeAgo, yearLabel } from '../../lib/format';
import DuckAvatar from '../DuckAvatar';
import { Badge } from '../ui';
import LoveButton from './LoveButton';

// สีโพสต์อิทสลับกันให้บอร์ดดูมีชีวิตชีวา
const NOTE_TONES = [
  'bg-duck-50 dark:bg-surface',
  'bg-calm-50 dark:bg-surface',
  'bg-[#fff1e6] dark:bg-surface',
  'bg-[#eef5fd] dark:bg-surface',
];

const QuestionCard = ({ question, index = 0, onLoveChange }) => {
  const topic = TOPICS[question.topic] ?? TOPICS.other;
  const tone = NOTE_TONES[index % NOTE_TONES.length];

  return (
    <article
      className={`relative flex flex-col gap-3 rounded-(--radius-card) border border-line p-5 shadow-(--shadow-soft) transition hover:-translate-y-0.5 ${tone}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="duck">
          <topic.icon size={14} /> {topic.label}
        </Badge>
        {question.tagYear && <Badge tone="calm">{yearLabel(question.tagYear)}</Badge>}
        {question.isMine && <Badge tone="muted">ของฉัน</Badge>}
      </div>
      <Link to={`/qa/${question.id}`} className="after:absolute after:inset-0 after:content-['']">
        <h3 className="line-clamp-2 text-lg font-medium">{question.title}</h3>
      </Link>
      <p className="line-clamp-3 text-sm text-muted">{question.content}</p>
      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
          <DuckAvatar avatar={question.author.avatar} size={24} label={question.author.nickname} />
          <span className="truncate">{question.author.nickname}</span>
          <span aria-hidden>·</span>
          <span className="shrink-0">{timeAgo(question.createdAt)}</span>
        </span>
        <div className="relative z-10 flex items-center gap-1">
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${question.answerCount === 0 ? 'text-beak-600 dark:text-beak-300' : 'text-muted'}`}
          >
            <MessageCircle size={16} />{' '}
            {question.answerCount === 0 ? 'รอคำตอบ' : question.answerCount}
          </span>
          <LoveButton question={question} onChange={onLoveChange} compact />
        </div>
      </div>
    </article>
  );
};

export default QuestionCard;
