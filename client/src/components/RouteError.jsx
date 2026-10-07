// หน้าจอเมื่อเกิด error ในหน้าเว็บ (ErrorBoundary ของ router ทั้งแอป)
// กรณีที่พบบ่อยคือโหลดไฟล์ของหน้าไม่สำเร็จแม้รีโหลดเองแล้ว (PageLoadError จาก lib/lazyPage) เช่น เน็ตหลุดระหว่างเปลี่ยนหน้า
import { CloudOff, RotateCw, TriangleAlert } from 'lucide-react';
import { Link, useRouteError } from 'react-router';
import { PageLoadError } from '../lib/lazyPage';
import { Button, EmptyState } from './ui';

const RouteError = () => {
  const error = useRouteError();
  const chunkFailed = error instanceof PageLoadError;
  const detail = error?.cause ?? error;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <EmptyState
        icon={chunkFailed ? CloudOff : TriangleAlert}
        title={
          chunkFailed ? 'มีเว็บเวอร์ชันใหม่ หรือการเชื่อมต่อขัดข้อง' : 'เกิดข้อผิดพลาดบางอย่าง'
        }
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button icon={RotateCw} onClick={() => window.location.reload()}>
              โหลดหน้าใหม่
            </Button>
            <Link
              to="/lobby"
              reloadDocument
              className="link inline-flex h-11 items-center rounded-full px-5"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        }
      >
        {chunkFailed
          ? 'กดโหลดหน้าใหม่เพื่อใช้เวอร์ชันล่าสุด ถ้ายังไม่ได้ลองตรวจสอบอินเทอร์เน็ตอีกครั้ง'
          : 'ลองโหลดหน้าใหม่อีกครั้ง ถ้ายังเจออยู่แจ้งทีมผู้ดูแลได้เลย'}
        {import.meta.env.DEV && detail && (
          <span className="mt-3 block text-left font-mono text-xs break-all text-danger">
            {String(detail.stack ?? detail.message ?? detail)}
          </span>
        )}
      </EmptyState>
    </div>
  );
};

export default RouteError;
