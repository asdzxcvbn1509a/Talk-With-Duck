import {
  CircleAlert,
  CircleCheck,
  House,
  Info,
  MessageCircleQuestionMark,
  Music,
  Shield,
  User,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigation } from 'react-router';
import { useModeratorAlerts } from '../hooks/useModeratorAlerts';
import { useAuthStore, selectIsModerator } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import DuckAvatar from './DuckAvatar';

const NAV = [
  { to: '/lobby', label: 'หน้าหลัก', icon: House },
  { to: '/karaoke', label: 'คาราโอเกะ', icon: Music },
  { to: '/qa', label: 'บอร์ดคำถาม', icon: MessageCircleQuestionMark },
  { to: '/me', label: 'ฉัน', icon: User },
];

// ห้องที่กำลังคุยอยู่: ซ่อนเมนูด้านล่างเพื่อให้โฟกัสกับบทสนทนา (Progressive Disclosure)
const FOCUS_ROUTES = [/^\/room\//, /^\/karaoke\/[^/]+$/];

// ไอคอนบอกประเภทของ toast ด้วย ไม่ให้ผู้ใช้ต้องแยกจากสีอย่างเดียว
const TOAST_TONES = {
  info: { className: 'bg-ink text-bg', icon: Info },
  success: { className: 'bg-calm-700 text-white', icon: CircleCheck },
  error: { className: 'bg-danger-strong text-white', icon: CircleAlert },
};

export const Toaster = () => {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-60 flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const tone = TOAST_TONES[t.tone] ?? TOAST_TONES.info;
        return (
          <button
            type="button"
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto flex max-w-md animate-pop items-start gap-2 rounded-2xl px-4 py-3 text-left text-sm font-medium shadow-lg ${tone.className}`}
          >
            <tone.icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{t.message}</span>
          </button>
        );
      })}
    </div>
  );
};

export const WakingBanner = () => {
  const waking = useUiStore((s) => s.waking);
  if (!waking) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-6"
      role="status"
    >
      <div className="flex items-center gap-3 rounded-3xl bg-surface px-5 py-3 text-sm shadow-lg ring-1 ring-line sm:rounded-full">
        <img src="/duck.svg" alt="" className="h-7 w-7 animate-float" />
        กำลังปลุกเป็ด… (เซิร์ฟเวอร์เพิ่งตื่น อาจใช้เวลาสักครู่)
      </div>
    </div>
  );
};

// จำนวนรายงานที่รอตรวจบนเมนูผู้ดูแล (โปรแกรมอ่านหน้าจออ่านเป็นประโยค)
const PendingBadge = ({ count }) => {
  return (
    <>
      <span
        className="min-w-5 rounded-full bg-danger-strong px-1.5 text-center text-xs leading-5 font-bold text-white"
        aria-hidden="true"
      >
        {count > 99 ? '99+' : count}
      </span>
      <span className="sr-only">รายงานรอตรวจ {count} รายการ</span>
    </>
  );
};

const Layout = () => {
  const user = useAuthStore((s) => s.user);
  const isModerator = useAuthStore(selectIsModerator);
  const pendingReports = useUiStore((s) => s.reportSummary.pending);
  // ผู้ดูแล: รู้เมื่อมีรายงานใหม่ทุกหน้า และเมนูบอกจำนวนที่รอตรวจ
  useModeratorAlerts(isModerator);
  const showPending = isModerator && pendingReports > 0;
  const { pathname } = useLocation();
  const focus = FOCUS_ROUTES.some((re) => re.test(pathname));
  // กำลังโหลดโค้ดของหน้าถัดไป (lazy route): หน้าเดิมยังแสดงอยู่ แสดงแถบบาง ๆ ให้รู้ว่ากดติดแล้ว
  const navigating = useNavigation().state === 'loading';

  return (
    <div className="min-h-dvh">
      {navigating && (
        <div
          className="fixed inset-x-0 top-0 z-70 h-1 animate-pulse bg-duck-400"
          role="progressbar"
          aria-label="กำลังเปิดหน้า"
        />
      )}
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link
            to="/lobby"
            className="flex items-center gap-2"
            aria-label="Talk With Duck หน้าหลัก"
          >
            <img src="/duck.svg" alt="" className="h-9 w-9" />
            <span className="font-display text-lg leading-tight">
              มัลติเล่า มัลติฟัง
              <span className="block text-xs font-sans font-semibold tracking-wide text-muted">
                Talk With Duck
              </span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="เมนูหลัก">
            {NAV.slice(0, 3).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-duck-100 text-duck-800 dark:bg-surface-2 dark:text-duck-300'
                      : 'text-muted hover:text-ink'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
            {isModerator && (
              <NavLink
                to="/admin/reports"
                title="ผู้ดูแล"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-duck-100 text-duck-800 dark:bg-surface-2 dark:text-duck-300'
                      : 'text-muted hover:text-ink'
                  }`
                }
              >
                <Shield size={18} />
                {/* จอแท็บเล็ตเหลือแค่ไอคอน เมนูจะได้พอในแถวเดียว */}
                <span className="sr-only lg:not-sr-only">ผู้ดูแล</span>
                {showPending && <PendingBadge count={pendingReports} />}
              </NavLink>
            )}
          </nav>
          {user && (
            <Link
              to="/me"
              className="ml-auto flex items-center gap-2 rounded-full py-1 pr-1 pl-3 hover:bg-surface-2 md:ml-2"
              aria-label="โปรไฟล์ของฉัน"
            >
              {/* ชื่อเล่นซ่อนช่วง md ที่เมนูด้านบนใช้พื้นที่เต็มแถว และตัดด้วย … ถ้ายาว */}
              <span className="hidden max-w-40 truncate text-sm font-semibold sm:inline md:hidden lg:inline">
                {user.nickname}
              </span>
              <DuckAvatar avatar={user.avatar} size={36} />
            </Link>
          )}
        </div>
      </header>

      {/* เว้นที่ด้านล่างให้แถบควบคุมในห้อง/เมนูล่าง รวมแถบ Home ของ iPhone ด้วย เนื้อหาท้ายหน้าจะได้ไม่โดนบัง */}
      <main
        className={`mx-auto max-w-6xl px-4 pt-5 ${
          focus
            ? 'pb-[calc(9.5rem+env(safe-area-inset-bottom))]'
            : 'pb-[calc(7rem+env(safe-area-inset-bottom))] md:pb-12'
        }`}
      >
        <Outlet />
      </main>

      {!focus && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
          aria-label="เมนูหลัก"
        >
          <div className="grid grid-cols-4">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-xs ${isActive ? 'font-bold text-ink' : 'font-semibold text-muted'}`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* เมนูที่เลือกอยู่มีแคปซูลสีเหลืองรองหลังไอคอน (ชื่อเมนูใช้สีตัวอักษรปกติ อ่านง่ายกว่าตัวอักษรสีเหลือง) */}
                    <span
                      className={`relative flex h-7 w-14 items-center justify-center rounded-full transition ${
                        isActive
                          ? 'bg-duck-200 text-on-duck dark:bg-duck-700/40 dark:text-duck-200'
                          : ''
                      }`}
                    >
                      <item.icon size={22} />
                      {/* จอมือถือไม่มีเมนูผู้ดูแล: จุดแดงที่ "ฉัน" บอกว่ามีรายงานรอตรวจ (เข้าได้จากหน้า "ฉัน") */}
                      {item.to === '/me' && showPending && (
                        <span className="absolute top-0 right-2.5 h-2.5 w-2.5 rounded-full bg-danger-strong ring-2 ring-surface" />
                      )}
                    </span>
                    {item.label}
                    {item.to === '/me' && showPending && (
                      <span className="sr-only"> (รายงานรอตรวจ {pendingReports} รายการ)</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
