// ตั้งโปรไฟล์ตอนเข้าครั้งแรก: ชื่อเล่น + ชั้นปี + น้องเป็ด
// ไม่ใช้ชื่อจริงหรือรูปจากบัญชี Google เลย (Frictionless Entry & Anonymity)
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { AVATARS, LIMITS } from '../config/constants';
import { AvatarPicker, YearPicker } from './ProfilePickers';
import { Button, Field } from './ui';

const randomAvatar = () => AVATARS[Math.floor(Math.random() * AVATARS.length)].key;

const ProfileSetupForm = ({ email, loading, error, onSubmit, onCancel }) => {
  const [form, setForm] = useState(() => ({ nickname: '', year: null, avatar: randomAvatar() }));
  const [missing, setMissing] = useState('');
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.year) return setMissing('เลือกชั้นปีก่อนนะ');
    setMissing('');
    onSubmit({ ...form, nickname: form.nickname.trim() });
  };

  const message = missing || error;

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <p className="rounded-2xl bg-surface-2 px-4 py-3 text-sm">
        เข้าด้วย <strong className="break-all text-ink">{email}</strong>
        <span className="block text-muted">คนอื่นจะไม่เห็นอีเมลนี้ เห็นแค่ชื่อเล่นกับน้องเป็ด</span>
      </p>
      <Field
        label="ชื่อเล่นในคอมมูนิตี้"
        htmlFor="nickname"
        hint="เพื่อน ๆ จะเห็นชื่อนี้ เปลี่ยนได้ภายหลัง"
      >
        <input
          id="nickname"
          className="input"
          maxLength={LIMITS.nicknameMax}
          placeholder="เช่น เป็ดขี้เซา"
          value={form.nickname}
          onChange={(e) => set({ nickname: e.target.value })}
          required
        />
      </Field>
      <div>
        <span className="label">ชั้นปีที่ศึกษา</span>
        <YearPicker value={form.year} onChange={(year) => set({ year })} />
      </div>
      <div>
        <span className="label">เลือกน้องเป็ดของคุณ</span>
        <AvatarPicker value={form.avatar} onChange={(avatar) => set({ avatar })} />
      </div>
      {message && (
        <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {message}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" loading={loading}>
        เริ่มใช้งาน
      </Button>
      <Button variant="ghost" icon={ArrowLeft} className="w-full" onClick={onCancel}>
        ใช้บัญชีอื่น
      </Button>
    </form>
  );
};

export default ProfileSetupForm;
