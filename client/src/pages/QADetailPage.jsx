// รายละเอียดคำถาม: คำถาม + คำตอบทั้งหมด + ช่องพิมพ์ตอบ
// ส่วนแสดงผลอยู่ใน components/qa/ (QuestionDetail, AnswerItem, AnswerComposer) หน้านี้ดูแลการโหลด แก้ไข และลบ
import { ArrowLeft, SearchX, Trash } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import AnswerComposer from '../components/qa/AnswerComposer';
import AnswerItem from '../components/qa/AnswerItem';
import QuestionDetail from '../components/qa/QuestionDetail';
import QuestionForm from '../components/qa/QuestionForm';
import { EmptyState, LoadError, PageTitle, Skeleton, SkeletonGroup } from '../components/ui';
import { readQuestion, removeQuestion, updateQuestion } from '../api/questions';
import { useApiQuery } from '../hooks/useApiQuery';
import { errorCode, errorMessage, toastError } from '../lib/api';
import { confirmDialog } from '../lib/dialog';
import { selectIsModerator, useAuthStore } from '../stores/authStore';
import { toast } from '../stores/uiStore';

// โครงคำถามระหว่างโหลด (ขนาดใกล้ของจริง หน้าจะไม่กระโดดตอนข้อมูลมา)
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
  const isModerator = useAuthStore(selectIsModerator);
  const { data, error, setData, retry } = useApiQuery(readQuestion, id);
  const question = data?.question ?? null;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  // ไม่ใช้หัวข้อคำถามเป็นชื่อแท็บ (ดู PageTitle)
  const pageTitle = <PageTitle title="คำถาม" />;

  if (error && errorCode(error) === 'QUESTION_NOT_FOUND') {
    return (
      <>
        {pageTitle}
        <EmptyState
          icon={SearchX}
          title={errorMessage(error)}
          action={
            <Link to="/qa" className="link">
              กลับไปที่บอร์ด
            </Link>
          }
        />
      </>
    );
  }
  if (error) {
    return (
      <>
        {pageTitle}
        <LoadError title="โหลดคำถามไม่สำเร็จ" message={errorMessage(error)} onRetry={retry} />
      </>
    );
  }
  if (!question) {
    return (
      <>
        {pageTitle}
        <QuestionSkeleton />
      </>
    );
  }

  const patchQuestion = (patch) => setData((d) => ({ question: { ...d.question, ...patch } }));

  const saveEdit = async (payload) => {
    setSaving(true);
    try {
      const { data } = await updateQuestion(id, payload);
      patchQuestion(data.question);
      setEditing(false);
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const confirmed = await confirmDialog({
      title: 'ลบคำถามนี้ใช่ไหม?',
      text: 'คำตอบทั้งหมดของคำถามนี้จะถูกลบไปด้วย',
      confirmText: 'ลบคำถาม',
      icon: Trash,
      danger: true,
    });
    if (!confirmed) return;
    try {
      await removeQuestion(id);
      toast('ลบคำถามแล้ว', 'success');
      navigate('/qa', { replace: true });
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {pageTitle}
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
          <QuestionDetail
            question={question}
            canDelete={question.isMine || isModerator}
            onEdit={() => setEditing(true)}
            onDelete={remove}
            onLoveChange={(_id, patch) => patchQuestion(patch)}
          />
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
