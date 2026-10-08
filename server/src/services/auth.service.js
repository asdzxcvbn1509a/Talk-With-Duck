// ระบบสมาชิก: เข้าสู่ระบบด้วยบัญชี Google → ออก session ด้วย JWT ของเราเอง (ข้อ 3.5.4)
// จำกัดเฉพาะบางโดเมนได้ด้วย ALLOWED_EMAIL_DOMAINS (เช่น mail.kmutt.ac.th) ค่าเริ่มต้นรับทุกโดเมน
// เก็บแค่อีเมลกับรหัสบัญชี Google (sub) ไม่เก็บชื่อจริงหรือรูปจาก Google เพื่อคงความเป็นนิรนาม
import { BANNED_MESSAGE } from '../config/constants.js';
import { env } from '../config/env.js';
import { verifyGoogleCredential } from '../lib/google.js';
import { prisma } from '../lib/prisma.js';
import { isAllowedEmail, normalizeEmail } from '../utils/emailDomain.js';
import { badRequest, forbidden, notFound } from '../utils/httpError.js';
import { issueSession, revokeAllForUser } from './token.service.js';

const assertAllowedDomain = (email) => {
  if (!isAllowedEmail(email, env.allowedEmailDomains)) {
    const domains = env.allowedEmailDomains.map((d) => `@${d}`).join(', ');
    throw badRequest('EMAIL_DOMAIN_NOT_ALLOWED', `ใช้ได้เฉพาะบัญชีของมหาวิทยาลัย (${domains})`);
  }
};

/**
 * Google เป็นเจ้าของอีเมลตัวจริงเมื่อ email_verified และ (เป็น @gmail.com หรือ hd ตรงกับโดเมนของอีเมล)
 * hd บอกว่าเป็นบัญชีของ Google Workspace องค์กรนั้นจริง ไม่ใช่บัญชีที่คนอื่นเอาอีเมลไปสมัคร
 */
const assertGoogleOwnsEmail = (payload, email) => {
  const domain = email.slice(email.lastIndexOf('@') + 1);
  const verified = payload.email_verified === true || payload.email_verified === 'true';
  if (!verified || (domain !== 'gmail.com' && payload.hd !== domain)) {
    throw forbidden(
      'GOOGLE_ACCOUNT_NOT_ALLOWED',
      'บัญชี Google นี้ยืนยันเจ้าของอีเมลไม่ได้ ใช้บัญชี Gmail หรือบัญชี Google ของมหาวิทยาลัยหรือองค์กรแทน',
    );
  }
};

const assertNotBanned = (user) => {
  if (user.isBanned) {
    throw forbidden('BANNED', BANNED_MESSAGE);
  }
};

/**
 * หาบัญชีเดิม: ผูกกับ Google แล้ว หรือบัญชีที่ยืนยันอีเมลแล้วด้วยอีเมลนี้ (เช่น บัญชีจาก seed)
 * แถวที่ยังไม่ยืนยันอีเมล (สมัครค้างไว้ในระบบ OTP เดิม ซึ่งใครก็พิมพ์อีเมลของคนอื่นได้) ไม่นับเป็นบัญชี
 */
const findExistingUser = async (sub, email) => {
  const bySub = await prisma.user.findUnique({ where: { googleSub: sub } });
  if (bySub) return bySub;

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (!byEmail?.emailVerifiedAt) return null;
  if (byEmail.googleSub && byEmail.googleSub !== sub) {
    throw forbidden('ACCOUNT_MISMATCH', 'อีเมลนี้ผูกกับบัญชี Google อื่นอยู่ ติดต่อทีมผู้ดูแลนะ');
  }
  return prisma.user.update({ where: { id: byEmail.id }, data: { googleSub: sub } });
};

/** สร้างบัญชีใหม่ ถ้ามีแถวที่สมัครค้างไว้ด้วยอีเมลนี้ ให้ใช้แถวเดิมแต่แทนข้อมูลด้วยของเจ้าของอีเมลตัวจริง */
const saveNewAccount = async (email, sub, profile) => {
  const data = {
    googleSub: sub,
    ...profile,
    emailVerifiedAt: new Date(),
    acceptedGuidelinesAt: null,
  };
  const leftover = await prisma.user.findUnique({ where: { email } });
  if (!leftover) return prisma.user.create({ data: { email, ...data } });

  await revokeAllForUser(leftover.id);
  return prisma.user.update({ where: { id: leftover.id }, data });
};

/**
 * เข้าสู่ระบบด้วย ID token จากปุ่ม Google
 * - บัญชีเดิม → ออก session
 * - บัญชีใหม่ที่ยังไม่ส่ง profile → { needsProfile: true, email } ให้หน้าเว็บถามชื่อเล่น/ชั้นปี/เป็ดก่อน
 * - บัญชีใหม่ที่ส่ง profile มาแล้ว → สร้างบัญชีแล้วออก session
 */
export const signInWithGoogle = async ({ credential, profile }) => {
  const payload = await verifyGoogleCredential(credential);
  const email = normalizeEmail(payload.email);
  assertAllowedDomain(email);
  assertGoogleOwnsEmail(payload, email);

  const existing = await findExistingUser(payload.sub, email);
  if (existing) {
    assertNotBanned(existing);
    return { user: existing, ...(await issueSession(existing)) };
  }

  if (!profile) return { needsProfile: true, email };

  const user = await saveNewAccount(email, payload.sub, profile);
  return { user, created: true, ...(await issueSession(user)) };
};

// ---------- บัญชีทดสอบ (route มีเฉพาะเมื่อ env.devLogin ดู routes/auth.routes.js) ----------
// ใช้ได้เฉพาะบัญชีจาก seed: ยืนยันอีเมลแล้วแต่ไม่ได้ผูกกับบัญชี Google (googleSub = null)
// บัญชีจริงที่เคยเข้าด้วย Google สวมรอยผ่านปุ่มนี้ไม่ได้ แม้ server ตอน dev จะเปิดให้คนในวง Wi-Fi เดียวกันเรียก
// (npm run dev:https ใช้ --host) และถ้า DEV_LOGIN หลุดไปเปิดบนเว็บจริงก็ไม่มีบัญชีให้สวมรอย

export const listDevAccounts = async () => {
  return prisma.user.findMany({
    where: { isBanned: false, emailVerifiedAt: { not: null }, googleSub: null },
    orderBy: [{ role: 'desc' }, { year: 'asc' }, { createdAt: 'asc' }],
    take: 20,
    select: { id: true, email: true, nickname: true, avatar: true, year: true, role: true },
  });
};

export const devLogin = async ({ userId }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.emailVerifiedAt || user.googleSub) throw notFound('USER_NOT_FOUND', 'ไม่พบบัญชีนี้');
  assertNotBanned(user);
  return { user, ...(await issueSession(user)) };
};
