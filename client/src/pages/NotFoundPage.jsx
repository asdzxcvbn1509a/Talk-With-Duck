import { Link } from 'react-router';
import { buttonClass } from '../components/buttonClass';
import { PageTitle } from '../components/ui';

const NotFoundPage = () => {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <PageTitle title="ไม่พบหน้านี้" />
      <img src="/duck.svg" alt="" className="h-24 w-24 animate-float" />
      <h1 className="text-3xl font-medium">เป็ดหลงทาง</h1>
      <p className="text-muted">ไม่พบหน้าที่คุณตามหา</p>
      <Link to="/lobby" className={buttonClass({ size: 'lg' })}>
        กลับหน้าหลัก
      </Link>
    </div>
  );
};

export default NotFoundPage;
