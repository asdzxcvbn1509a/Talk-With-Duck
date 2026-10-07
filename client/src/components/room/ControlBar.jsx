// แถบควบคุมด้านล่าง: ปุ่มไมค์ (MicButton) และปุ่มออกจากห้องขนาดใหญ่ มองเห็นชัด (Autonomy & Boundary Control)
import { LogOut, MessageCircle } from 'lucide-react';
import MicButton from './MicButton';

const ControlBar = ({
  muted,
  micAvailable,
  onToggleMute,
  onLeave,
  onToggleChat,
  chatOpen,
  unread = 0,
  extra,
}) => {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-start justify-center gap-2.5 px-4 pt-3 pb-2 sm:gap-5">
        <MicButton muted={muted} micAvailable={micAvailable} onToggle={onToggleMute} />

        {onToggleChat && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onToggleChat}
              aria-pressed={chatOpen}
              aria-label={unread > 0 ? `แชท (${unread} ข้อความใหม่)` : 'แชท'}
              className={`relative mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line transition sm:mt-2 ${chatOpen ? 'bg-duck-100 text-duck-800 dark:bg-surface-2 dark:text-duck-300' : 'bg-surface text-ink'}`}
            >
              <MessageCircle size={22} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-beak-500 px-1.5 text-xs font-bold text-on-duck">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
            <span className="text-xs font-semibold text-muted" aria-hidden="true">
              แชท
            </span>
          </div>
        )}

        {extra}

        <button
          type="button"
          onClick={onLeave}
          className="mt-1 flex h-14 items-center gap-2 rounded-full bg-ink px-4 font-semibold whitespace-nowrap text-bg transition hover:bg-danger-strong hover:text-white active:scale-95 sm:mt-2 sm:px-6"
        >
          <LogOut size={20} /> ออกจากห้อง
        </button>
      </div>
    </div>
  );
};

export default ControlBar;
