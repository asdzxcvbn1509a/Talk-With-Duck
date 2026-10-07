// แถบแจ้งเมื่อการเชื่อมต่อกับห้องหลุด (เน็ตสะดุด/สลับ Wi-Fi) ระหว่างนั้นเพื่อนอาจไม่ได้ยินเสียงเรา
// socket.io ต่อใหม่ให้เอง พอต่อได้ roomSession เข้าห้องใหม่และแถบนี้หายไปเอง
import { WifiOff } from 'lucide-react';
import { useRoomStore } from '../../stores/roomStore';
import { Spinner } from '../ui';

const ConnectionBanner = () => {
  const connected = useRoomStore((s) => s.connected);
  if (connected) return null;
  return (
    <div
      className="sticky top-16 z-20 mb-4 flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-bg shadow-lg"
      role="status"
    >
      <WifiOff size={18} className="shrink-0" aria-hidden="true" />
      <span className="flex-1">
        การเชื่อมต่อหลุด กำลังเชื่อมต่อใหม่… ระหว่างนี้เพื่อนอาจไม่ได้ยินเสียงคุณ
      </span>
      <span aria-hidden="true" className="shrink-0">
        <Spinner size={16} />
      </span>
    </div>
  );
};

export default ConnectionBanner;
