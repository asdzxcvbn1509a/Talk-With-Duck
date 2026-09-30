// PrismaClient ตัวเดียวของทั้ง server (Prisma 7 ต่อฐานข้อมูลผ่าน driver adapter ของ pg)
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';
import { withoutSslMode } from '../utils/databaseUrl.js';

const sslOptions = () => {
  if (!env.databaseSsl) return undefined;
  // Supabase ใช้ CA ของตัวเอง ถ้าไม่ได้ใส่ CA มาจะเข้ารหัสแต่ไม่ตรวจใบรับรอง
  return env.DATABASE_SSL_CA ? { ca: env.DATABASE_SSL_CA } : { rejectUnauthorized: false };
};

const adapter = new PrismaPg({
  connectionString: env.databaseSsl ? withoutSslMode(env.DATABASE_URL) : env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  ssl: sslOptions(),
});

export const prisma = new PrismaClient({ adapter });
