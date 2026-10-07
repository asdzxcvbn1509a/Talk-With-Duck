// ช่องพิมพ์ตอบใต้คำถาม ตอบแบบไม่เปิดเผยตัวตนได้ (ตอบได้ไม่จำกัดจำนวนคน ข้อ 3.5.7)
import { Send } from 'lucide-react';
import { useState } from 'react';
import { LIMITS } from '../../config/constants';
import { createAnswer } from '../../api/questions';
import { toastError } from '../../lib/api';
import { Button, Toggle } from '../ui';

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
      toastError(err);
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
          description={
            isAnonymous
              ? 'คนอื่นจะเห็นเป็น “เป็ดนิรนาม” · เลี่ยงรายละเอียดที่ทำให้คนอื่นเดาได้ว่าเป็นใคร'
              : undefined
          }
        />
        <Button type="submit" icon={Send} loading={sending} disabled={!content.trim()}>
          ส่งคำตอบ
        </Button>
      </div>
    </form>
  );
};

export default AnswerComposer;
