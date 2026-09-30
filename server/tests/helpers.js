import crypto from 'node:crypto';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { signAccessToken } from '../src/lib/jwt.js';

export const hasTestDb = process.env.TWD_HAS_TEST_DB === '1';

export const app = createApp();
export const api = () => request(app);

const TABLES = [
  'reports',
  'song_queue',
  'question_loves',
  'answers',
  'questions',
  'messages',
  'room_members',
  'rooms',
  'refresh_tokens',
  'users',
];

export const resetDb = async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABLES.map((t) => `"${t}"`).join(', ')} CASCADE`);
};

let counter = 0;

/** สร้างผู้ใช้ที่ยืนยันอีเมลและยอมรับข้อตกลงแล้ว พร้อม access token */
export const createUser = async (overrides = {}) => {
  counter += 1;
  const user = await prisma.user.create({
    data: {
      email: `user${counter}-${crypto.randomUUID().slice(0, 8)}@mail.kmutt.ac.th`,
      nickname: `เป็ดทดสอบ${counter}`,
      avatar: 'duck-classic',
      year: 1,
      emailVerifiedAt: new Date(),
      acceptedGuidelinesAt: new Date(),
      ...overrides,
    },
  });
  return { user, token: signAccessToken(user) };
};

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });
