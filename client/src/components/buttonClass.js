// หน้าตาปุ่มของแอป ใช้ร่วมกันระหว่าง <Button> (ui.jsx) กับปุ่มในหน้าต่างยืนยัน (lib/dialog.jsx)
// และลิงก์ที่หน้าตาเป็นปุ่ม เช่น <Link className={buttonClass()}>
// สีตัวอักษรบนปุ่มต้องต่างจากพื้นปุ่มอย่างน้อย 4.5:1 (calm ใช้ calm-700 เพราะตัวอักษรขาวบน calm-500 ได้แค่ 2.9:1)
const variants = {
  primary: 'bg-duck-400 text-on-duck hover:bg-duck-300 active:bg-duck-500 shadow-(--shadow-soft)',
  calm: 'bg-calm-700 text-white hover:bg-calm-800 active:bg-calm-800',
  ghost: 'bg-transparent text-ink hover:bg-surface-2',
  soft: 'bg-surface-2 text-ink hover:bg-duck-100 dark:hover:bg-surface',
  danger: 'bg-danger-strong text-white hover:brightness-110',
  outline: 'border border-line bg-surface text-ink hover:bg-surface-2',
};
const sizes = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-base gap-2',
  lg: 'h-14 px-6 text-lg gap-2.5',
};

export const buttonClass = ({ variant = 'primary', size = 'md', className = '' } = {}) =>
  `inline-flex items-center justify-center rounded-full font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;
