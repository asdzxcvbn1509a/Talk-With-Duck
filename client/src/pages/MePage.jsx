// หน้า "ฉัน": แก้โปรไฟล์ เลือกโหมดสี ลิงก์ข้อตกลง/ช่วยเหลือ/นโยบาย ออกจากระบบ และลบบัญชี
import {
  ClipboardCheck,
  ExternalLink,
  Flag,
  LifeBuoy,
  Lock,
  LockKeyhole,
  LogOut,
  Monitor,
  Moon,
  Send,
  Shield,
  Sun,
  UserX,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import DuckAvatar from '../components/DuckAvatar';
import { AvatarPicker, YearPicker } from '../components/ProfilePickers';
import { Badge, Button, Field, NewTabLink, PageTitle, Segmented } from '../components/ui';
import { LIMITS } from '../config/constants';
import { contactUrl, surveyUrl } from '../config/links';
import { toastError } from '../lib/api';
import { deleteAccount, logout, updateProfile } from '../lib/auth';
import { confirmDialog } from '../lib/dialog';
import { roomSession } from '../lib/roomSession';
import { selectIsModerator, useAuthStore } from '../stores/authStore';
import { toast, useUiStore } from '../stores/uiStore';

const THEME_OPTIONS = [
  { value: 'system', label: 'ตามเครื่อง', icon: Monitor },
  { value: 'light', label: 'สว่าง', icon: Sun },
  { value: 'dark', label: 'มืด', icon: Moon },
];

const MENU_ROW_CLASS = 'flex items-center gap-3 px-6 py-4 hover:bg-surface-2';

// ลิงก์ออกนอกเว็บ (แบบประเมิน/ช่องทางติดต่อ): เปิดแท็บใหม่ และมีไอคอนบอกท้ายแถว
const ExternalRow = ({ href, icon: IconComponent, children }) => {
  return (
    <NewTabLink href={href} className={MENU_ROW_CLASS}>
      <IconComponent size={20} /> {children}
      <ExternalLink size={16} className="ml-auto shrink-0 text-muted" aria-hidden="true" />
    </NewTabLink>
  );
};

const MePage = () => {
  const user = useAuthStore((s) => s.user);
  const isModerator = useAuthStore(selectIsModerator);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const pendingReports = useUiStore((s) => s.reportSummary.pending);
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
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
      toastError(err);
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

  const removeAccount = async () => {
    const confirmed = await confirmDialog({
      title: 'ลบบัญชีถาวรใช่ไหม?',
      text: 'คำถาม คำตอบ ข้อความแชท ใจที่ส่ง และเพลงที่จองไว้จะถูกลบทั้งหมด กู้คืนไม่ได้',
      confirmText: 'ลบบัญชี',
      icon: UserX,
      danger: true,
    });
    if (!confirmed) return;
    setDeleting(true);
    try {
      await roomSession.leave();
    } catch {
      // ออกจากห้องไม่สำเร็จ: ลบบัญชีต่อได้ (server พาออกจากห้องให้ตอนลบบัญชีอยู่แล้ว)
    }
    try {
      await deleteAccount();
      toast('ลบบัญชีแล้ว ขอบคุณที่เคยแวะมาที่บ่อเป็ดนะ', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      toastError(err);
      setDeleting(false);
    }
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
        <Link to="/privacy" className={MENU_ROW_CLASS}>
          <LockKeyhole size={20} /> นโยบายความเป็นส่วนตัว
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
        {isModerator && (
          <Link to="/admin/reports" className={MENU_ROW_CLASS}>
            <Flag size={20} /> จัดการรายงาน (ผู้ดูแล)
            {pendingReports > 0 && (
              <Badge tone="danger" className="ml-auto">
                รอตรวจ {pendingReports}
              </Badge>
            )}
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

      <section className="card space-y-3 p-6" aria-labelledby="delete-account">
        <h2 id="delete-account" className="text-lg font-medium">
          ลบบัญชี
        </h2>
        {isModerator ? (
          <p className="text-sm text-muted">
            บัญชีผู้ดูแลลบเองไม่ได้ ถ้าจะเลิกเป็นผู้ดูแล ให้ทีมเปลี่ยนสิทธิ์เป็นสมาชิกก่อน
          </p>
        ) : (
          <>
            <p className="text-sm text-muted">
              คำถาม คำตอบ ข้อความแชท ใจที่ส่ง และเพลงที่จองไว้จะถูกลบทั้งหมด กู้คืนไม่ได้
              ส่วนรายงานที่เคยส่งยังอยู่ให้ผู้ดูแลจัดการต่อโดยไม่บอกว่าใครส่ง · เข้าด้วย Google
              อีกครั้งได้ แต่จะเป็นบัญชีใหม่
            </p>
            <Button variant="danger" icon={UserX} loading={deleting} onClick={removeAccount}>
              ลบบัญชีของฉัน
            </Button>
          </>
        )}
        <Link to="/privacy" className="link block text-sm">
          ระบบเก็บข้อมูลอะไรบ้าง
        </Link>
      </section>
    </div>
  );
};

export default MePage;
