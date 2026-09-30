// แถบควบคุมด้านล่าง: ปุ่มไมค์และปุ่มออกจากห้องขนาดใหญ่ มองเห็นชัด (Autonomy & Boundary Control)
import { LogOut, MessageCircle, Mic, MicOff } from 'lucide-react';

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
      <div className="mx-auto flex max-w-3xl items-center justify-center gap-3 px-4 py-3 sm:gap-5">
        <button
          type="button"
          onClick={onToggleMute}
          aria-pressed={!muted}
          aria-label={!micAvailable ? 'เปิดไมโครโฟน' : muted ? 'เปิดไมค์' : 'ปิดไมค์'}
          className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full text-xs font-semibold shadow-lg transition active:scale-95 sm:h-[72px] sm:w-[72px] ${
            muted ? 'bg-danger text-white' : 'bg-calm-500 text-white'
          }`}
        >
          {muted ? <MicOff size={26} /> : <Mic size={26} />}
        </button>

        {onToggleChat && (
          <button
            type="button"
            onClick={onToggleChat}
            aria-pressed={chatOpen}
            aria-label="แชท"
            className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line transition ${chatOpen ? 'bg-duck-100 text-duck-700 dark:bg-surface-2' : 'bg-surface text-ink'}`}
          >
            <MessageCircle size={22} />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 rounded-full bg-beak-500 px-1.5 text-xs font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        )}

        {extra}

        <button
          type="button"
          onClick={onLeave}
          className="flex h-14 items-center gap-2 rounded-full bg-[#3B2F1E] px-4 font-semibold whitespace-nowrap text-white transition hover:bg-danger active:scale-95 sm:px-6 dark:bg-surface-2"
        >
          <LogOut size={20} /> ออกจากห้อง
        </button>
      </div>
    </div>
  );
};

export default ControlBar;
