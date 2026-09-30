// รันครั้งเดียวก่อนเทสต์ทั้งหมด: สร้างฐานข้อมูลทดสอบ (ถ้ายังไม่มี) และรัน migration ที่ยังไม่ได้รัน
// ไม่ล้างข้อมูลทั้งฐาน: แต่ละไฟล์เทสต์ล้างตารางของตัวเองด้วย resetDb() ใน tests/helpers.js
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
import { resolveTestDatabaseUrl } from './testDb.js';

const setup = () => {
  dotenv.config({ quiet: true });
  const url = resolveTestDatabaseUrl();
  if (!url) {
    console.warn(
      '\n⚠️  ยังไม่ได้ตั้ง DATABASE_URL ใน server/.env — ข้าม integration test (รันเฉพาะ unit test)\n',
    );
    return;
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error('ฐานข้อมูลเทสต์ต้องเป็นคนละฐานกับ DATABASE_URL (เทสต์จะล้างข้อมูลทั้งหมด)');
  }
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: url },
  });
};

export default setup;
