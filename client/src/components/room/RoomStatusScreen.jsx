// หน้าจอเมื่อหลุดจากห้องด้วยเหตุต่าง ๆ (ห้องปิด / เปิดซ้ำในแท็บอื่น / เชื่อมต่อไม่สำเร็จ)
import { AppWindow, CloudOff, DoorClosed, Hand, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { Button, EmptyState } from '../ui';

const SCREENS = {
  closed: {
    icon: DoorClosed,
    title: 'ห้องนี้ปิดแล้ว',
    body: 'ขอบคุณที่มาคุยกันนะ แวะมาใหม่ได้เสมอ',
  },
  moderated: {
    icon: ShieldAlert,
    title: 'ผู้ดูแลปิดห้องนี้แล้ว',
    body: 'ห้องนี้ถูกปิดเพื่อรักษาพื้นที่ปลอดภัยของทุกคน',
  },
  replaced: {
    icon: AppWindow,
    title: 'คุณเปิดห้องนี้ในอีกแท็บหนึ่ง',
    body: 'ใช้งานต่อในแท็บใหม่ได้เลย หรือกดเข้าห้องอีกครั้งเพื่อย้ายกลับมาที่นี่',
  },
  left: {
    icon: Hand,
    title: 'คุณออกจากห้องนี้แล้ว',
    body: 'อาจเพราะเข้าห้องอื่นจากอีกแท็บ หรือการเชื่อมต่อหลุดนานเกินไป',
  },
  error: {
    icon: CloudOff,
    title: 'เชื่อมต่อห้องไม่สำเร็จ',
    body: 'ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง',
  },
};

const RoomStatusScreen = ({ status, error, onRetry, backTo = '/lobby' }) => {
  const screen =
    SCREENS[status === 'closed' && error === 'moderated' ? 'moderated' : status] ?? SCREENS.error;
  return (
    <div className="mx-auto max-w-md pt-8">
      <EmptyState
        icon={screen.icon}
        title={screen.title}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {onRetry && ['replaced', 'error', 'left'].includes(status) && (
              <Button onClick={onRetry}>เข้าห้องอีกครั้ง</Button>
            )}
            <Link to={backTo} className="link inline-flex h-11 items-center rounded-full px-5">
              กลับไปเลือกห้อง
            </Link>
          </div>
        }
      >
        {screen.body}
      </EmptyState>
    </div>
  );
};

export default RoomStatusScreen;
