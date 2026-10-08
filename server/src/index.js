// จุดเริ่มต้นของ server: Express (REST API) + Socket.IO บนพอร์ตเดียวกัน
import http from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { initRealtime } from './realtime/index.js';
import { prisma } from './lib/prisma.js';

const app = createApp();
const server = http.createServer(app);
const io = initRealtime(server);

server.listen(env.PORT, () => {
  console.log(
    `🦆 Talk With Duck API พร้อมใช้งานที่ http://localhost:${env.PORT} (${env.NODE_ENV})`,
  );
  if (!env.GOOGLE_CLIENT_ID) {
    console.warn('⚠️  ยังไม่ได้ตั้ง GOOGLE_CLIENT_ID — ปุ่มเข้าสู่ระบบด้วย Google จะใช้ไม่ได้');
  }
  if (env.devLogin) {
    console.warn(
      '⚠️  DEV_LOGIN เปิดอยู่ — เข้าบัญชีไหนก็ได้โดยไม่ต้องใช้ Google (ใช้ในเครื่องเท่านั้น)',
    );
  }
});

const shutdown = async (signal) => {
  console.log(`\n${signal} — กำลังปิด server...`);
  io.close();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// กันพลาดชั้นสุดท้าย: Promise ที่ไม่มีใครจับ error ให้บันทึก log แทนการปิด server ทั้งตัว
// (ค่าเริ่มต้นของ Node คือจบ process ทุกห้องจะหลุดพร้อมกัน) · event ของ socket จับ error ใน realtime/index.js แล้ว
process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection', err);
});
