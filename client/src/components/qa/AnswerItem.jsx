// คำตอบ 1 รายการในหน้ารายละเอียดคำถาม: เจ้าของแก้ไขได้ เจ้าของหรือผู้ดูแลลบได้ คนอื่นกดรายงานได้
import { Pencil, Trash } from 'lucide-react';
import { useState } from 'react';
import { LIMITS } from '../../config/constants';
import { removeAnswer, updateAnswer } from '../../api/answers';
import { toastError } from '../../lib/api';
import { confirmDialog } from '../../lib/dialog';
import { timeAgo, yearLabel } from '../../lib/format';
import { selectIsModerator, useAuthStore } from '../../stores/authStore';
import DuckAvatar from '../DuckAvatar';
import { ReportButton } from '../ReportModal';
import { Button, IconButton } from '../ui';

const AnswerItem = ({ answer, onUpdated, onDeleted }) => {
  const isModerator = useAuthStore(selectIsModerator);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(answer.content);
  const [busy, setBusy] = useState(false);
  const edited = new Date(answer.updatedAt) - new Date(answer.createdAt) > 1000;

  const save = async () => {
    setBusy(true);
    try {
      const { data } = await updateAnswer(answer.id, { content: content.trim() });
      onUpdated(data.answer);
      setEditing(false);
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const confirmed = await confirmDialog({
      title: 'ลบคำตอบนี้ใช่ไหม?',
      confirmText: 'ลบคำตอบ',
      icon: Trash,
      danger: true,
    });
    if (!confirmed) return;
    try {
      await removeAnswer(answer.id);
      onDeleted(answer.id);
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <li className="flex gap-3">
      <DuckAvatar avatar={answer.author.avatar} size={40} label={answer.author.nickname} />
      <div className="min-w-0 flex-1 rounded-3xl rounded-tl-md bg-surface p-4 ring-1 ring-line">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-sm">
            <span className="font-semibold">{answer.author.nickname}</span>
            {answer.author.year && (
              <span className="text-muted"> · {yearLabel(answer.author.year)}</span>
            )}
            <span className="text-muted">
              {' '}
              · {timeAgo(answer.createdAt)}
              {edited && ' (แก้ไขแล้ว)'}
            </span>
          </p>
          <div className="-mt-1 -mr-1 flex">
            {answer.isMine && !editing && (
              <IconButton
                icon={Pencil}
                label="แก้ไข"
                size={32}
                iconSize={16}
                onClick={() => setEditing(true)}
              />
            )}
            {(answer.isMine || isModerator) && (
              <IconButton icon={Trash} label="ลบ" size={32} iconSize={16} onClick={remove} />
            )}
            {!answer.isMine && (
              <ReportButton
                target={{ type: 'answer', id: answer.id, label: 'คำตอบนี้' }}
                size={32}
              />
            )}
          </div>
        </div>
        {editing ? (
          <div className="mt-2 space-y-2">
            <textarea
              className="input min-h-24"
              maxLength={LIMITS.postContentMax}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                ยกเลิก
              </Button>
              <Button size="sm" loading={busy} disabled={!content.trim()} onClick={save}>
                บันทึก
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 break-words whitespace-pre-wrap">{answer.content}</p>
        )}
      </div>
    </li>
  );
};

export default AnswerItem;
