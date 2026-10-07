import {
  ClipboardCheck,
  ExternalLink,
  Flag,
  LifeBuoy,
  Lock,
  LogOut,
  Monitor,
  Moon,
  Send,
  Shield,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import DuckAvatar from '../components/DuckAvatar';
import { AvatarPicker, YearPicker } from '../components/ProfilePickers';
import { Button, Field, PageTitle, Segmented } from '../components/ui';
import { LIMITS } from '../config/constants';
import { contactUrl, surveyUrl } from '../config/links';
import { errorMessage } from '../lib/api';
import { logout, updateProfile } from '../lib/auth';
import { roomSession } from '../lib/roomSession';
import { useAuthStore } from '../stores/authStore';
import { toast, useUiStore } from '../stores/uiStore';

const THEME_OPTIONS = [
  { value: 'system', label: 'ตามเครื่อง', icon: Monitor },
  { value: 'light', label: 'สว่าง', icon: Sun },
  { value: 'dark', label: 'มืด', icon: Moon },
];

const MENU_ROW_CLASS = 'flex items-center gap-3 px-6 py-4 hover:bg-surface-2';

// ลิงก์ออกนอกเว็บ (แบบประเมิน/ช่องทางติดต่อ): เปิดแท็บใหม่ และบอกผู้ใช้ด้วยไอคอนกับข้อความสำหรับโปรแกรมอ่านหน้าจอ
const ExternalRow = ({ href, icon: IconComponent, children }) => {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={MENU_ROW_CLASS}>
      <IconComponent size={20} /> {children}
      <span className="sr-only"> (เปิดในแท็บใหม่)</span>
      <ExternalLink size={16} className="ml-auto shrink-0 text-muted" aria-hidden="true" />
    </a>
  );
};

const MePage = () => {
  const user = useAuthStore((s) => s.user);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nickname: user.nickname,
    year: user.year,
    avatar: user.avatar,
  });
  const [saving, setSaving] = useState(false);
  const dirty =
    form.nickname !== user.nickname || form.year !== user.year || form.avatar !== user.avatar;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ ...form, nickname: form.nickname.trim() });
      toast('บันทึกโปรไฟล์แล้ว', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    try {
      await roomSession.leave();
    } catch {
      // ออกจากห้องไม่สำเร็จ: ยังออกจากระบบต่อได้ (server เคลียร์สมาชิกที่หลุดให้เอง)
    }
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageTitle title="โปรไฟล์ของฉัน" />
      <section className="card flex items-center gap-4 p-6">
        <DuckAvatar avatar={form.avatar} size={80} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-medium">{form.nickname || 'ชื่อเล่น'}</h1>
          <p className="text-muted">ปี {form.year}</p>
          <p
            className="mt-1 flex items-center gap-1 text-xs text-muted"
            title="อีเมลนี้เห็นเฉพาะคุณ"
          >
            <Lock size={12} className="shrink-0" />
            <span className="truncate">{user.email}</span>
          </p>
        </div>
      </section>

      <form onSubmit={save} className="card space-y-5 p-6">
        <h2 className="text-lg font-medium">แก้ไขโปรไฟล์</h2>
        <Field label="ชื่อเล่น" htmlFor="nickname">
          <input
            id="nickname"
            className="input"
            maxLength={LIMITS.nicknameMax}
            value={form.nickname}
            onChange={(e) => setForm({ ...form, nickname: e.target.value })}
          />
        </Field>
        <div>
          <span className="label">ชั้นปี</span>
          <YearPicker value={form.year} onChange={(year) => setForm({ ...form, year })} />
        </div>
        <div>
          <span className="label">อวาตาร์เป็ด</span>
          <AvatarPicker value={form.avatar} onChange={(avatar) => setForm({ ...form, avatar })} />
        </div>
        <Button type="submit" className="w-full" loading={saving} disabled={!dirty}>
          บันทึก
        </Button>
      </form>

      <section className="card space-y-3 p-6">
        <div>
          <h2 className="text-lg font-medium">การแสดงผล</h2>
          <p className="text-sm text-muted">โหมดมืดช่วยให้สบายตาตอนกลางคืน มีผลเฉพาะเครื่องนี้</p>
        </div>
        <Segmented label="โหมดสี" options={THEME_OPTIONS} value={theme} onChange={setTheme} />
      </section>

      <nav className="card divide-y divide-line overflow-hidden">
        <Link to="/guidelines" className={MENU_ROW_CLASS}>
          <Shield size={20} /> ข้อตกลงพื้นที่ปลอดภัย
        </Link>
        <Link to="/guidelines#help" className={MENU_ROW_CLASS}>
          <LifeBuoy size={20} /> ช่องทางขอความช่วยเหลือ
        </Link>
        {/* ลิงก์ภายนอกแสดงเฉพาะเมื่อทีมตั้งค่าไว้ (config/links.js) */}
        {surveyUrl() && (
          <ExternalRow href={surveyUrl()} icon={ClipboardCheck}>
            ตอบแบบประเมินความพึงพอใจ
          </ExternalRow>
        )}
        {contactUrl() && (
          <ExternalRow href={contactUrl()} icon={Send}>
            ติดต่อทีมผู้ดูแล
          </ExternalRow>
        )}
        {user.role === 'moderator' && (
          <Link to="/admin/reports" className={MENU_ROW_CLASS}>
            <Flag size={20} /> จัดการรายงาน (ผู้ดูแล)
          </Link>
        )}
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 px-6 py-4 text-left text-danger hover:bg-danger-soft"
        >
          <LogOut size={20} /> ออกจากระบบ
        </button>
      </nav>
    </div>
  );
};

export default MePage;
