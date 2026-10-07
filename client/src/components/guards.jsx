// ตัวกั้นเส้นทาง: ต้องล็อกอิน → ต้องยอมรับข้อตกลงการใช้งานก่อนใช้ครั้งแรก → (บางหน้า) ต้องเป็นผู้ดูแล
import { Navigate, Outlet, useLocation } from 'react-router';
import { selectIsModerator, useAuthStore } from '../stores/authStore';
import { Spinner } from './ui';

export const FullPageLoader = ({ label = 'กำลังโหลด…' }) => {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-muted">
      <img src="/duck.svg" alt="" className="h-16 w-16 animate-float" />
      <div className="flex items-center gap-2">
        <Spinner size={18} /> {label}
      </div>
    </div>
  );
};

export const RequireAuth = () => {
  // ใช้ selector: ไม่ render ทั้งแอปใหม่ทุกครั้งที่ต่ออายุ access token
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
};

export const RequireGuidelines = () => {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();
  if (!user.acceptedGuidelinesAt) {
    return <Navigate to="/guidelines" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
};

export const RequireModerator = () => {
  const isModerator = useAuthStore(selectIsModerator);
  if (!isModerator) return <Navigate to="/lobby" replace />;
  return <Outlet />;
};

/** หน้าเข้าสู่ระบบ: ถ้าล็อกอินแล้วพาไปหน้าหลัก */
export const GuestOnly = () => {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  if (status === 'loading') return <FullPageLoader />;
  if (user) return <Navigate to="/lobby" replace />;
  return <Outlet />;
};
