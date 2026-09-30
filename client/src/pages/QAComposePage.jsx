import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import QuestionForm from '../components/qa/QuestionForm';
import { createQuestion } from '../api/questions';
import { errorMessage } from '../lib/api';
import { toast } from '../stores/uiStore';

const QAComposePage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (payload) => {
    setSubmitting(true);
    try {
      const { data } = await createQuestion(payload);
      toast('โพสต์คำถามแล้ว รอเพื่อน ๆ มาช่วยตอบนะ', 'success');
      navigate(`/qa/${data.question.id}`, { replace: true });
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        to="/qa"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft size={16} /> กลับไปที่บอร์ด
      </Link>
      <div className="card p-6">
        <h1 className="mb-1 text-2xl font-medium">ตั้งคำถามใหม่</h1>
        <p className="mb-6 text-sm text-muted">
          ไม่มีคำถามไหนโง่ ถามได้ทุกเรื่อง ทั้งการเรียน โปรเจกต์ และการใช้ชีวิต
        </p>
        <QuestionForm onSubmit={submit} submitting={submitting} />
      </div>
    </div>
  );
};

export default QAComposePage;
