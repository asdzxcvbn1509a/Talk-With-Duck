// ปุ่มเปิด-ปิดไมโครโฟน (ข้อ 3.5.3: MicButton) ขนาดใหญ่ มองเห็นชัด อยู่ในแถบควบคุมของห้อง
// มีคำบอกสถานะใต้ปุ่ม เพราะไอคอนไมค์สีแดงอย่างเดียวอ่านได้ทั้ง "ปิดอยู่" และ "กดเพื่อปิด"
import { Mic, MicOff } from 'lucide-react';

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

const MicButton = ({ muted, micAvailable, onToggle }) => {
  const mic = micView({ muted, micAvailable });
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onToggle}
        aria-label={mic.label}
        className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full shadow-lg transition active:scale-95 sm:h-18 sm:w-18 ${mic.className}`}
      >
        <mic.icon size={26} />
      </button>
      <span className="text-xs font-semibold whitespace-nowrap text-muted" aria-hidden="true">
        {mic.caption}
      </span>
    </div>
  );
};

export default MicButton;
