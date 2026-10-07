// Refresh Token: สตริงสุ่มที่เก็บเป็น hash ในฐานข้อมูล หมุนใหม่ทุกครั้งที่ใช้
// ถ้า token ที่ถูกหมุนไปแล้วถูกนำมาใช้ซ้ำ (หลังพ้นช่วงผ่อนผัน) ถือว่าอาจถูกขโมย → เพิกถอนทั้งตระกูล
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import {
  BANNED_MESSAGE,
  REFRESH_REUSE_GRACE_MS,
  SESSION_EXPIRED_MESSAGE,
} from '../config/constants.js';
import { prisma } from '../lib/prisma.js';
import { hmac, randomToken } from '../lib/crypto.js';
import { signAccessToken } from '../lib/jwt.js';
import { unauthorized } from '../utils/httpError.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const sessionExpired = () => unauthorized('SESSION_EXPIRED', SESSION_EXPIRED_MESSAGE);

const createRefreshToken = async (db, userId, familyId) => {
  const raw = randomToken();
  await db.refreshToken.create({
    data: {
      userId,
      familyId,
      tokenHash: hmac(raw),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_DAYS * DAY_MS),
    },
  });
  return raw;
};

/** ออก token ชุดใหม่ (ตอนเข้าสู่ระบบ) */
export const issueSession = async (user) => {
  const refreshToken = await createRefreshToken(prisma, user.id, crypto.randomUUID());
  return { accessToken: signAccessToken(user), refreshToken };
};

/** ใช้ refresh token เก่าแลก token ชุดใหม่ */
export const rotateSession = async (rawToken) => {
  if (!rawToken) throw sessionExpired();

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hmac(rawToken) },
    include: { user: true },
  });
  // ถูกเพิกถอนแล้ว (ออกจากระบบ ฯลฯ) หรือหมดอายุ = ใช้ไม่ได้ทันที ไม่มีช่วงผ่อนผัน
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) throw sessionExpired();

  // token ที่ถูกแลกไปแล้วถูกนำมาใช้ซ้ำหลังพ้นช่วงผ่อนผัน = อาจถูกขโมย → เพิกถอนทั้งตระกูล
  if (stored.rotatedAt && Date.now() - stored.rotatedAt.getTime() >= REFRESH_REUSE_GRACE_MS) {
    await revokeFamily(stored.familyId);
    throw sessionExpired();
  }

  const { user } = stored;
  if (user.isBanned) {
    await revokeFamily(stored.familyId);
    throw unauthorized('BANNED', BANNED_MESSAGE);
  }

  const refreshToken = await prisma.$transaction(async (tx) => {
    if (!stored.rotatedAt) {
      await tx.refreshToken.update({ where: { id: stored.id }, data: { rotatedAt: new Date() } });
    }
    return createRefreshToken(tx, user.id, stored.familyId);
  });

  return { user, accessToken: signAccessToken(user), refreshToken };
};

export const revokeFamily = async (familyId) => {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

/** ออกจากระบบ: เพิกถอนตระกูลของ token นี้ */
export const revokeByRawToken = async (rawToken) => {
  if (!rawToken) return;
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hmac(rawToken) } });
  if (stored) await revokeFamily(stored.familyId);
};

/** เพิกถอนทุกเซสชันของผู้ใช้ (ถูกแบน หรือแทนแถวที่สมัครค้าง) */
export const revokeAllForUser = async (userId) => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};
