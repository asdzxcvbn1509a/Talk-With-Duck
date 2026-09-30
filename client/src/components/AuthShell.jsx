// กรอบหน้าเข้าสู่ระบบ/ตั้งโปรไฟล์ครั้งแรก: เป็ดตัวใหญ่ต้อนรับ + การ์ดฟอร์ม
const AuthShell = ({ title, subtitle, children, footer }) => {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-duck-100 via-bg to-calm-50 px-4 py-10 dark:from-surface-2 dark:via-bg dark:to-bg">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/duck.svg" alt="" className="mb-3 h-20 w-20 animate-float drop-shadow" />
          <p className="font-display text-sm tracking-wide text-muted">
            มัลติเล่า มัลติฟัง · Talk With Duck
          </p>
          <h1 className="mt-1 text-3xl font-medium">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
        </div>
        <div className="card p-6 sm:p-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  );
};

export default AuthShell;
