// ปุ่ม "Sign in with Google" ที่ Google วาดให้ (Google Identity Services)
// กดแล้วได้ ID token (credential) ทาง onCredential ให้หน้าเว็บส่งต่อไปให้ server ตรวจ
import { CircleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { loadGoogleIdentity } from '../lib/googleIdentity';
import { Spinner } from './ui';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Notice = ({ children }) => {
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-sm" role="alert">
      <CircleAlert size={18} className="mt-0.5 shrink-0 text-beak-500" />
      <span>{children}</span>
    </p>
  );
};

const GoogleSignInButton = ({ onCredential }) => {
  const containerRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const [status, setStatus] = useState(CLIENT_ID ? 'loading' : 'missing');

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;
    const mount = async () => {
      try {
        const googleId = await loadGoogleIdentity();
        if (cancelled) return;
        googleId.initialize({
          client_id: CLIENT_ID,
          callback: ({ credential }) => onCredentialRef.current(credential),
          ux_mode: 'popup',
          context: 'signin',
        });
        const container = containerRef.current;
        googleId.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'center',
          locale: 'th',
          width: Math.min(container.offsetWidth || 320, 400),
        });
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('failed');
      }
    };
    mount();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'missing') {
    return (
      <Notice>
        {import.meta.env.DEV
          ? 'ยังไม่ได้ตั้ง VITE_GOOGLE_CLIENT_ID ใน client/.env ปุ่ม Google จึงยังใช้ไม่ได้ (ดูขั้นตอนใน docs/deploy.md) ระหว่างนี้ใช้บัญชีทดสอบด้านล่างได้'
          : 'ระบบเข้าสู่ระบบยังไม่พร้อมใช้งาน ลองใหม่ภายหลังหรือแจ้งทีมผู้ดูแล'}
      </Notice>
    );
  }

  return (
    <div>
      {/* color-scheme: light ให้ตรงกับ iframe ของ Google: โหมดมืดหน้าเว็บเป็น color-scheme dark
          ถ้าไม่ตรงกัน เบราว์เซอร์จะวาดพื้นขาวทึบเป็นกรอบสี่เหลี่ยมรอบปุ่ม */}
      <div ref={containerRef} className="flex min-h-11 w-full justify-center scheme-light" />
      {status === 'loading' && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted">
          <Spinner size={16} /> กำลังโหลดปุ่ม Google…
        </p>
      )}
      {status === 'failed' && (
        <Notice>โหลดปุ่ม Google ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วรีเฟรชหน้านี้อีกครั้ง</Notice>
      )}
    </div>
  );
};

export default GoogleSignInButton;
