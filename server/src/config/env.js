// อ่านและตรวจค่าตัวแปรสภาพแวดล้อมทั้งหมดของ server ในที่เดียว (ข้อ 3.5.1 ข้อ 7)
import 'dotenv/config';
import { z } from 'zod';
import { parseEmailDomains } from '../utils/emailDomain.js';

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  // โดเมนของหน้าเว็บที่อนุญาตให้เรียก API/Socket.IO คั่นด้วย , ได้หลายโดเมน
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  // จำนวน proxy ที่อยู่หน้า server (Render = 1, Vercel rewrite + Render = 2)
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),

  DATABASE_URL: z.string().min(1, 'ต้องตั้งค่า DATABASE_URL'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(5),
  // 'true' = ใช้ SSL (Supabase) · ใส่ DATABASE_SSL_CA เพื่อตรวจใบรับรองแบบเต็ม
  DATABASE_SSL: z.enum(['true', 'false']).default('false'),
  DATABASE_SSL_CA: optional,

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),

  // โดเมนอีเมลที่เข้าสู่ระบบได้ คั่นด้วย , · * (หรือเว้นว่าง) = บัญชี Google ใดก็ได้
  ALLOWED_EMAIL_DOMAINS: z.string().default('*'),

  // OAuth Client ID ของปุ่ม "Sign in with Google" (ค่าเดียวกับ VITE_GOOGLE_CLIENT_ID ฝั่งหน้าเว็บ)
  GOOGLE_CLIENT_ID: optional,
  // 'true' = เปิดปุ่มบัญชีทดสอบในหน้าเข้าสู่ระบบ ใช้ได้เฉพาะ NODE_ENV=development
  DEV_LOGIN: z.enum(['true', 'false']).default('false'),

  YOUTUBE_API_KEY: optional,

  TURN_URLS: optional,
  TURN_USERNAME: optional,
  TURN_CREDENTIAL: optional,

  GROUP_ROOM_MAX: z.coerce.number().int().min(5).max(20).default(10),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ ค่าใน server/.env ไม่ถูกต้อง:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

const raw = parsed.data;

/** บัญชีทดสอบเข้าได้โดยไม่ต้องใช้ Google จึงเปิดได้แค่ตอนพัฒนาในเครื่อง (ตอนเทสต์และบนเว็บจริงปิดเสมอ) */
export const isDevLoginEnabled = ({ DEV_LOGIN, NODE_ENV }) => {
  return DEV_LOGIN === 'true' && NODE_ENV === 'development';
};

if (raw.NODE_ENV === 'production') {
  const problems = [
    !raw.GOOGLE_CLIENT_ID && 'ต้องตั้งค่า GOOGLE_CLIENT_ID ไม่งั้นจะไม่มีใครเข้าสู่ระบบได้',
    raw.DEV_LOGIN === 'true' && 'ห้ามตั้ง DEV_LOGIN=true บนเว็บจริง (ใครก็เข้าบัญชีของคนอื่นได้)',
  ].filter(Boolean);
  if (problems.length > 0) {
    console.error('❌ ค่าใน server/.env ไม่ถูกต้อง:\n' + problems.map((p) => `✖ ${p}`).join('\n'));
    process.exit(1);
  }
}

export const env = {
  ...raw,
  isProd: raw.NODE_ENV === 'production',
  isTest: raw.NODE_ENV === 'test',
  clientOrigins: raw.CLIENT_ORIGIN.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  allowedEmailDomains: parseEmailDomains(raw.ALLOWED_EMAIL_DOMAINS),
  cookieSecure: raw.COOKIE_SECURE ? raw.COOKIE_SECURE === 'true' : raw.NODE_ENV === 'production',
  databaseSsl: raw.DATABASE_SSL === 'true',
  devLogin: isDevLoginEnabled(raw),
};
