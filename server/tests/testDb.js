// หา URL ของฐานข้อมูลสำหรับเทสต์:
// ใช้ TEST_DATABASE_URL ถ้าตั้งไว้ ไม่งั้นใช้ DATABASE_URL เดียวกันแต่ต่อท้ายชื่อฐานข้อมูลด้วย _test
const isPlaceholder = (url) => !url || url.includes('YOUR_PASSWORD');

export const resolveTestDatabaseUrl = (env = process.env) => {
  if (!isPlaceholder(env.TEST_DATABASE_URL)) return env.TEST_DATABASE_URL;
  if (isPlaceholder(env.DATABASE_URL)) return null;
  const url = new URL(env.DATABASE_URL);
  const name = url.pathname.replace(/^\//, '') || 'postgres';
  url.pathname = `/${name}_test`;
  return url.toString();
};
