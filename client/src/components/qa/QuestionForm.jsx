// ฟอร์มตั้ง/แก้ไขกระทู้คำถาม พร้อมแท็กชั้นปี หัวข้อ และโหมดไม่เปิดเผยตัวตน
import { useState } from 'react';
import { LIMITS, TOPICS, YEARS } from '../../config/constants';
import { Button, Chip, Field, Toggle } from '../ui';

const QuestionForm = ({
  initial,
  onSubmit,
  submitting,
  submitLabel = 'โพสต์คำถาม',
  allowAnonymous = true,
  onCancel,
}) => {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    content: initial?.content ?? '',
    tagYear: initial?.tagYear ?? null,
    topic: initial?.topic ?? 'study',
    isAnonymous: initial?.isAnonymous ?? false,
  });
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = (e) => {
    e.preventDefault();
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      tagYear: form.tagYear,
      topic: form.topic,
    };
    onSubmit(allowAnonymous ? { ...payload, isAnonymous: form.isAnonymous } : payload);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="หัวข้อคำถาม" htmlFor="q-title">
        <input
          id="q-title"
          className="input"
          maxLength={LIMITS.questionTitleMax}
          placeholder="เช่น ควรเตรียมตัวหาที่ฝึกงานตั้งแต่ตอนไหนดี"
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          required
        />
      </Field>
      <Field
        label="รายละเอียด"
        htmlFor="q-content"
        hint={`${form.content.length}/${LIMITS.postContentMax}`}
      >
        <textarea
          id="q-content"
          className="input min-h-40"
          maxLength={LIMITS.postContentMax}
          placeholder="เล่าสถานการณ์ให้เพื่อน ๆ เข้าใจ จะได้ช่วยตอบได้ตรงจุด"
          value={form.content}
          onChange={(e) => set({ content: e.target.value })}
          required
        />
      </Field>
      <div>
        <span className="label">หัวข้อ</span>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TOPICS).map(([key, t]) => (
            <Chip key={key} active={form.topic === key} onClick={() => set({ topic: key })}>
              <t.icon size={16} /> {t.label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <span className="label">อยากได้คำตอบจากชั้นปีไหน / เกี่ยวกับปีไหน</span>
        <div className="flex flex-wrap gap-2">
          <Chip active={!form.tagYear} onClick={() => set({ tagYear: null })}>
            ทุกชั้นปี
          </Chip>
          {YEARS.map((y) => (
            <Chip key={y} active={form.tagYear === y} onClick={() => set({ tagYear: y })}>
              ปี {y}
            </Chip>
          ))}
        </div>
      </div>
      {allowAnonymous && (
        <div className="rounded-2xl bg-surface-2 p-4">
          <Toggle
            id="q-anon"
            checked={form.isAnonymous}
            onChange={(isAnonymous) => set({ isAnonymous })}
            label="ถามแบบไม่เปิดเผยตัวตน"
            description="คนอื่นจะเห็นเป็น “เป็ดนิรนาม” (ผู้ดูแลเห็นได้เฉพาะเมื่อมีการรายงาน)"
          />
        </div>
      )}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            ยกเลิก
          </Button>
        )}
        <Button
          type="submit"
          loading={submitting}
          disabled={form.title.trim().length < 5 || !form.content.trim()}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default QuestionForm;
