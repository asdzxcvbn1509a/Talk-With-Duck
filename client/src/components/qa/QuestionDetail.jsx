// คำถามในหน้ารายละเอียด (ตอนไม่ได้แก้ไข): ป้ายหัวข้อ/ชั้นปี ปุ่มแก้ไข/ลบ/รายงาน เนื้อหา ผู้ถาม และปุ่มส่งใจ
// แก้ไข ลบ และส่งใจ ทำที่หน้า QADetailPage ผ่าน onEdit / onDelete / onLoveChange
import { EyeOff, Pencil, Trash } from 'lucide-react';
import { TOPICS } from '../../config/constants';
import { timeAgo, yearLabel } from '../../lib/format';
import DuckAvatar from '../DuckAvatar';
import { ReportButton } from '../ReportModal';
import { Badge, IconButton } from '../ui';
import LoveButton from './LoveButton';

const QuestionDetail = ({ question, canDelete, onEdit, onDelete, onLoveChange }) => {
  const topic = TOPICS[question.topic] ?? TOPICS.other;

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge>
            <topic.icon size={14} /> {topic.label}
          </Badge>
          {question.tagYear && <Badge tone="calm">{yearLabel(question.tagYear)}</Badge>}
          {question.isAnonymous && (
            <Badge tone="muted">
              <EyeOff size={12} /> ไม่เปิดเผยตัวตน
            </Badge>
          )}
        </div>
        <div className="-mt-1 -mr-2 flex">
          {question.isMine && <IconButton icon={Pencil} label="แก้ไข" onClick={onEdit} />}
          {canDelete && <IconButton icon={Trash} label="ลบ" onClick={onDelete} />}
          {!question.isMine && (
            <ReportButton target={{ type: 'question', id: question.id, label: question.title }} />
          )}
        </div>
      </div>
      <h1 className="text-2xl font-medium">{question.title}</h1>
      <p className="break-words whitespace-pre-wrap">{question.content}</p>
      <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
          <DuckAvatar avatar={question.author.avatar} size={32} label={question.author.nickname} />
          <span className="min-w-0">
            <span className="font-semibold text-ink">{question.author.nickname}</span>
            {question.author.year && ` · ${yearLabel(question.author.year)}`}
            <br />
            {timeAgo(question.createdAt)}
          </span>
        </span>
        <LoveButton question={question} onChange={onLoveChange} />
      </div>
    </>
  );
};

export default QuestionDetail;
