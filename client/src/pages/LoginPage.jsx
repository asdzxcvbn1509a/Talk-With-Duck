// เข้าสู่ระบบด้วยบัญชี Google · เข้าครั้งแรกจะให้ตั้งชื่อเล่น/ชั้นปี/น้องเป็ดก่อน
import { AudioLines, MessageCircleQuestionMark, MicVocal } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import AuthShell from '../components/AuthShell';
import DevAccounts from '../components/DevAccounts';
import GoogleSignInButton from '../components/GoogleSignInButton';
import ProfileSetupForm from '../components/ProfileSetupForm';
import { PageTitle, Spinner } from '../components/ui';
import { contactUrl } from '../config/links';
import { errorCode, errorMessage } from '../lib/api';
import { signInWithGoogle } from '../lib/auth';

// คนที่มาจากลิงก์ที่เพื่อนแชร์ยังไม่รู้จักเว็บนี้: บอกสั้น ๆ ว่าเข้าไปแล้วทำอะไรได้ (อยู่ใต้ปุ่ม Google ปุ่มจะได้ไม่ตกขอบจอมือถือ)
const FEATURES = [
  {
    icon: AudioLines,
    title: 'คุยด้วยเสียง 1-1 หรือเป็นกลุ่ม',
    detail: 'เลือกห้องตามชั้นปี จะเปิดไมค์หรือแค่นั่งฟังก็ได้',
  },
  {
    icon: MicVocal,
    title: 'Duck Karaoke Lounge',
    detail: 'เปิดเพลงจาก YouTube ฟังพร้อมกัน ร้องด้วยกัน',
  },
  {
    icon: MessageCircleQuestionMark,
    title: 'บอร์ดฝากคำถาม',
    detail: 'ถามแบบไม่เปิดเผยตัวตนได้ เพื่อนและรุ่นพี่ช่วยตอบ',
  },
];

const FeatureList = () => {
  return (
    <ul className="mt-6 space-y-3 border-t border-line pt-5 text-left text-sm">
      {FEATURES.map((feature) => (
        <li key={feature.title} className="flex items-start gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-duck-100 text-duck-800 dark:bg-surface-2 dark:text-duck-300"
            aria-hidden="true"
          >
            <feature.icon size={18} />
          </span>
          <span>
            <span className="block font-semibold">{feature.title}</span>
            <span className="text-muted">{feature.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
};

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // บัญชีใหม่: เก็บ credential จาก Google ไว้ในหน่วยความจำระหว่างตั้งโปรไฟล์เท่านั้น
  const [signUp, setSignUp] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const enter = (user) => {
    const from = location.state?.from;
    navigate(user.acceptedGuidelinesAt ? (from ?? '/lobby') : '/guidelines', { replace: true });
  };

  const handleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithGoogle(credential);
      if (result.needsProfile) setSignUp({ credential, email: result.email });
      else enter(result.user);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const completeSignUp = async (profile) => {
    setError('');
    setLoading(true);
    try {
      const result = await signInWithGoogle(signUp.credential, profile);
      enter(result.user);
    } catch (err) {
      // token จาก Google หมดอายุ (ราว 1 ชั่วโมง): กลับไปกดปุ่ม Google ใหม่
      if (errorCode(err) === 'GOOGLE_TOKEN_INVALID') setSignUp(null);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const cancelSignUp = () => {
    setSignUp(null);
    setError('');
  };

  if (signUp) {
    return (
      <AuthShell
        title="มาเป็นเป็ดในบ่อเดียวกัน"
        subtitle="ตั้งชื่อเล่นกับเลือกน้องเป็ดก่อนเริ่ม ไม่ต้องใช้ชื่อจริง"
      >
        <PageTitle title="ตั้งโปรไฟล์" />
        <ProfileSetupForm
          email={signUp.email}
          loading={loading}
          error={error}
          onSubmit={completeSignUp}
          onCancel={cancelSignUp}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="เข้าสู่ระบบ"
      subtitle={
        // แยกบรรทัดเอง จอแคบจะได้ไม่ตัดกลางวลี "อยากเล่าก็เล่า อยากฟังก็ฟัง"
        <>
          พื้นที่ปลอดภัยของคนในสาขา ปี 1–4
          <span className="block">อยากเล่าก็เล่า อยากฟังก็ฟัง</span>
        </>
      }
      footer={
        <>
          เข้าครั้งแรกจะให้ตั้งชื่อเล่นและเลือกน้องเป็ด ระบบไม่ใช้ชื่อจริงหรือรูปจากบัญชี Google
          {/* ช่องทางติดต่อแสดงเมื่อทีมตั้ง VITE_CONTACT_URL ไว้ (เช่น บัญชีถูกระงับ หรืออีเมลผูกกับบัญชีอื่น) */}
          {contactUrl() && (
            <span className="mt-2 block">
              มีปัญหาในการเข้าสู่ระบบ?{' '}
              <a href={contactUrl()} target="_blank" rel="noopener noreferrer" className="link">
                ติดต่อทีมผู้ดูแล
                <span className="sr-only"> (เปิดในแท็บใหม่)</span>
              </a>
            </span>
          )}
        </>
      }
    >
      <PageTitle title="เข้าสู่ระบบ" />
      <GoogleSignInButton onCredential={handleCredential} />
      {loading && (
        <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted">
          <Spinner size={16} /> กำลังเข้าสู่ระบบ…
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <FeatureList />
      {import.meta.env.DEV && <DevAccounts onSignedIn={enter} />}
    </AuthShell>
  );
};

export default LoginPage;
