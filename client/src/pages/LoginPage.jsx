// เข้าสู่ระบบด้วยบัญชี Google · เข้าครั้งแรกจะให้ตั้งชื่อเล่น/ชั้นปี/น้องเป็ดก่อน
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import AuthShell from '../components/AuthShell';
import DevAccounts from '../components/DevAccounts';
import GoogleSignInButton from '../components/GoogleSignInButton';
import ProfileSetupForm from '../components/ProfileSetupForm';
import { Spinner } from '../components/ui';
import { errorCode, errorMessage } from '../lib/api';
import { signInWithGoogle } from '../lib/auth';

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
      subtitle="อยากเล่าก็เล่า อยากฟังก็ฟัง · เข้าสู่ระบบด้วยบัญชี Google"
      footer="เข้าครั้งแรกจะให้ตั้งชื่อเล่นและเลือกน้องเป็ด ระบบไม่ใช้ชื่อจริงหรือรูปจากบัญชี Google"
    >
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
      {/* {import.meta.env.DEV && <DevAccounts onSignedIn={enter} />} */}
    </AuthShell>
  );
};

export default LoginPage;
