import { House, MessageCircleQuestionMark, Music, Shield, User } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigation } from 'react-router';
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

export const Toaster = () => {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  const tones = {
    info: 'bg-ink text-bg',
    success: 'bg-calm-600 text-white',
    error: 'bg-danger text-white',
  };
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <button
          type="button"
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto max-w-md animate-pop rounded-2xl px-4 py-3 text-left text-sm font-medium shadow-lg ${tones[t.tone] ?? tones.info}`}
        >
          {t.message}
        </button>
      ))}
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

const Layout = () => {
  const user = useAuthStore((s) => s.user);
  const isModerator = useAuthStore(selectIsModerator);
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
                      ? 'bg-duck-100 text-duck-700 dark:bg-surface-2 dark:text-duck-300'
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
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted hover:text-ink"
              >
                <Shield size={18} />
                {/* จอแท็บเล็ตเหลือแค่ไอคอน เมนูจะได้พอในแถวเดียว */}
                <span className="sr-only lg:not-sr-only">ผู้ดูแล</span>
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

      <main className={`mx-auto max-w-6xl px-4 pt-5 ${focus ? 'pb-32' : 'pb-28 md:pb-12'}`}>
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
                  `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-duck-600 dark:text-duck-300' : 'text-muted'}`
                }
              >
                <item.icon size={22} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
};

export default Layout;
