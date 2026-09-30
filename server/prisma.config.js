// ตั้งค่า Prisma CLI (Prisma 7) — อ่าน DATABASE_URL จาก server/.env
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
