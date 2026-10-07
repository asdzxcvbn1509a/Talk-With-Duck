// แถบควบคุมด้านล่าง: ปุ่มไมค์และปุ่มออกจากห้องขนาดใหญ่ มองเห็นชัด (Autonomy & Boundary Control)
// ปุ่มไมค์มีคำบอกสถานะใต้ปุ่ม ไอคอนไมค์สีแดงอย่างเดียวอ่านได้ทั้ง "ปิดอยู่" และ "กดเพื่อปิด"
import { LogOut, MessageCircle, Mic, MicOff } from 'lucide-react';

// สถานะไมค์ → หน้าตาปุ่ม · ไม่ได้รับสิทธิ์ใช้ไมค์ใช้สีกลาง ๆ แยกจากการปิดไมค์เอง (สีแดง)
// label บอกทั้งสถานะและผลของการกด (ไม่ใช้ aria-pressed คู่กับ label ที่เปลี่ยนไปมา โปรแกรมอ่านหน้าจอจะอ่านสับสน)
const micView = ({ muted, micAvailable }) => {
  if (!micAvailable) {
    return {
      icon: MicOff,
      caption: 'ขอใช้ไมค์',
      label: 'ยังไม่ได้รับสิทธิ์ใช้ไมค์ แตะเพื่อขอสิทธิ์',
      className: 'border border-line bg-surface-2 text-muted',
    };
  }
  if (muted) {
    return {
      icon: MicOff,
      caption: 'ไมค์ปิดอยู่',
      label: 'ไมค์ปิดอยู่ แตะเพื่อเปิดไมค์',
      className: 'bg-danger-strong text-white',
    };
  }
  return {
    icon: Mic,
    caption: 'ไมค์เปิด',
    label: 'ไมค์เปิดอยู่ แตะเพื่อปิดไมค์',
    className: 'bg-calm-600 text-white',
  };
};

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
  const mic = micView({ muted, micAvailable });
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-start justify-center gap-2.5 px-4 pt-3 pb-2 sm:gap-5">
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={mic.label}
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-lg transition active:scale-95 sm:h-18 sm:w-18 ${mic.className}`}
          >
            <mic.icon size={26} />
          </button>
          <span className="text-xs font-semibold whitespace-nowrap text-muted" aria-hidden="true">
            {mic.caption}
          </span>
        </div>

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
