// รายละเอียดกระทู้: คำถาม + คำตอบทั้งหมด + ช่องพิมพ์ตอบ
import { ArrowLeft, EyeOff, Pencil, SearchX, Send, Trash } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import DuckAvatar from '../components/DuckAvatar';
import AnswerItem from '../components/qa/AnswerItem';
import LoveButton from '../components/qa/LoveButton';
import QuestionForm from '../components/qa/QuestionForm';
import { ReportButton } from '../components/ReportModal';
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  LoadError,
  Skeleton,
  SkeletonGroup,
  Toggle,
} from '../components/ui';
import { LIMITS, TOPICS } from '../config/constants';
import { createAnswer, readQuestion, removeQuestion, updateQuestion } from '../api/questions';
import { useApiQuery } from '../hooks/useApiQuery';
import { errorCode, errorMessage } from '../lib/api';
import { confirmDialog } from '../lib/dialog';
import { timeAgo, yearLabel } from '../lib/format';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/uiStore';

const AnswerComposer = ({ questionId, onCreated }) => {
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data } = await createAnswer(questionId, { content: content.trim(), isAnonymous });
      onCreated(data.answer);
      setContent('');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <label htmlFor="answer" className="label">
        ช่วยตอบ / ส่งกำลังใจ
      </label>
      <textarea
        id="answer"
        className="input min-h-28"
        maxLength={LIMITS.postContentMax}
        placeholder="แชร์ประสบการณ์ ให้คำแนะนำ หรือแค่บอกว่า “เราเข้าใจนะ” ก็มีความหมายแล้ว"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Toggle
          id="a-anon"
          checked={isAnonymous}
          onChange={setIsAnonymous}
          label="ตอบแบบไม่เปิดเผยตัวตน"
        />
        <Button type="submit" icon={Send} loading={sending} disabled={!content.trim()}>
          ส่งคำตอบ
        </Button>
      </div>
    </form>
  );
};

// โครงกระทู้ระหว่างโหลด (ขนาดใกล้ของจริง หน้าจะไม่กระโดดตอนข้อมูลมา)
const QuestionSkeleton = () => {
  return (
    <SkeletonGroup className="mx-auto max-w-2xl space-y-5">
      <Skeleton className="h-4 w-28" />
      <div className="card space-y-4 p-6">
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-14" />
        </div>
        <Skeleton className="h-7 w-4/5" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex items-center justify-between border-t border-line pt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-11 w-24" />
        </div>
      </div>
    </SkeletonGroup>
  );
};

const QADetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isModerator = useAuthStore((s) => s.user?.role === 'moderator');
  const { data, error, setData, retry } = useApiQuery(readQuestion, id);
  const question = data?.question ?? null;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (error && errorCode(error) === 'QUESTION_NOT_FOUND') {
    return (
      <EmptyState
        icon={SearchX}
        title={errorMessage(error)}
        action={
          <Link to="/qa" className="link">
            กลับไปที่บอร์ด
          </Link>
        }
      />
    );
  }
  if (error) {
    return <LoadError title="โหลดกระทู้ไม่สำเร็จ" message={errorMessage(error)} onRetry={retry} />;
  }
  if (!question) return <QuestionSkeleton />;

  const topic = TOPICS[question.topic] ?? TOPICS.other;
  const patchQuestion = (patch) => setData((d) => ({ question: { ...d.question, ...patch } }));

  const saveEdit = async (payload) => {
    setSaving(true);
    try {
      const { data } = await updateQuestion(id, payload);
      patchQuestion(data.question);
      setEditing(false);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const confirmed = await confirmDialog({
      title: 'ลบกระทู้นี้ใช่ไหม?',
      text: 'คำตอบทั้งหมดในกระทู้จะถูกลบไปด้วย',
      confirmText: 'ลบกระทู้',
      icon: Trash,
      danger: true,
    });
    if (!confirmed) return;
    try {
      await removeQuestion(id);
      toast('ลบกระทู้แล้ว', 'success');
      navigate('/qa', { replace: true });
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        to="/qa"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft size={16} /> กลับไปที่บอร์ด
      </Link>

      <article className="card space-y-4 p-6">
        {editing ? (
          <QuestionForm
            initial={question}
            onSubmit={saveEdit}
            submitting={saving}
            submitLabel="บันทึก"
            allowAnonymous={false}
            onCancel={() => setEditing(false)}
          />
        ) : (
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
                {question.isMine && (
                  <IconButton icon={Pencil} label="แก้ไข" onClick={() => setEditing(true)} />
                )}
                {(question.isMine || isModerator) && (
                  <IconButton icon={Trash} label="ลบ" onClick={remove} />
                )}
                {!question.isMine && (
                  <ReportButton
                    target={{ type: 'question', id: question.id, label: question.title }}
                  />
                )}
              </div>
            </div>
            <h1 className="text-2xl font-medium">{question.title}</h1>
            <p className="break-words whitespace-pre-wrap">{question.content}</p>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
                <DuckAvatar
                  avatar={question.author.avatar}
                  size={32}
                  label={question.author.nickname}
                />
                <span className="min-w-0">
                  <span className="font-semibold text-ink">{question.author.nickname}</span>
                  {question.author.year && ` · ${yearLabel(question.author.year)}`}
                  <br />
                  {timeAgo(question.createdAt)}
                </span>
              </span>
              <LoveButton question={question} onChange={(_id, patch) => patchQuestion(patch)} />
            </div>
          </>
        )}
      </article>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">
          {question.answers.length > 0
            ? `${question.answers.length} คำตอบ`
            : 'ยังไม่มีคำตอบ เป็นคนแรกที่ช่วยตอบนะ'}
        </h2>
        <ul className="space-y-3">
          {question.answers.map((a) => (
            <AnswerItem
              key={a.id}
              answer={a}
              onUpdated={(updated) =>
                patchQuestion({
                  answers: question.answers.map((x) => (x.id === updated.id ? updated : x)),
                })
              }
              onDeleted={(answerId) =>
                patchQuestion({ answers: question.answers.filter((x) => x.id !== answerId) })
              }
            />
          ))}
        </ul>
        <AnswerComposer
          questionId={question.id}
          onCreated={(answer) => patchQuestion({ answers: [...question.answers, answer] })}
        />
      </section>
    </div>
  );
};

export default QADetailPage;
