import { Link } from 'react-router';

const NotFoundPage = () => {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <img src="/duck.svg" alt="" className="h-24 w-24 animate-float" />
      <h1 className="text-3xl font-medium">เป็ดหลงทาง</h1>
      <p className="text-muted">ไม่พบหน้าที่คุณตามหา</p>
      <Link to="/lobby" className="rounded-full bg-duck-400 px-6 py-3 font-semibold text-[#3B2F1E]">
        กลับหน้าหลัก
      </Link>
    </div>
  );
};

export default NotFoundPage;
