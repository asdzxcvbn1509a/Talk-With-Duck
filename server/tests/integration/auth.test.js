import { beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyGoogleCredential } from '../../src/lib/google.js';
import { prisma } from '../../src/lib/prisma.js';
import { devLogin, listDevAccounts } from '../../src/services/auth.service.js';
import { issueSession } from '../../src/services/token.service.js';
import { unauthorized } from '../../src/utils/httpError.js';
import { api, bearer, createUser, hasTestDb, resetDb } from '../helpers.js';

// ไม่ต่อ Google จริงในเทสต์: จำลองผลการตรวจ ID token ด้วย googleAccount()
vi.mock('../../src/lib/google.js', () => ({ verifyGoogleCredential: vi.fn() }));

const email = 'new.duck@mail.kmutt.ac.th';
const profile = { nickname: 'เป็ดมาใหม่', year: 1, avatar: 'duck-bow' };

const googleAccount = (overrides = {}) => {
  verifyGoogleCredential.mockResolvedValue({
    sub: 'google-sub-1',
    email,
    email_verified: true,
    hd: 'mail.kmutt.ac.th',
    ...overrides,
  });
};

const signIn = (body = {}) => {
  return api()
    .post('/api/auth/google')
    .send({ credential: 'google-id-token', ...body });
};

/** บัญชีใหม่ที่ตั้งโปรไฟล์แล้ว (ได้ session กลับมา) */
const signUp = async () => {
  googleAccount();
  return signIn({ profile });
};

const cookieOf = (res) =>
  res.headers['set-cookie']?.find((c) => c.startsWith('twd_rt='))?.split(';')[0];

describe.skipIf(!hasTestDb)('ระบบสมาชิกและ JWT (ตาราง 3.5 แถวที่ 1)', () => {
  beforeEach(async () => {
    await resetDb();
    verifyGoogleCredential.mockReset();
  });

  it('เข้าด้วย Google ครั้งแรก → ตั้งโปรไฟล์ → ใช้ token → refresh → logout', async () => {
    googleAccount();
    const first = await signIn();
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ needsProfile: true, email });
    expect(cookieOf(first)).toBeUndefined();
    expect(await prisma.user.count()).toBe(0);

    const created = await signIn({ profile });
    expect(created.status).toBe(201);
    expect(created.body.user).toMatchObject({ email, nickname: 'เป็ดมาใหม่', year: 1 });
    expect(created.headers['set-cookie'].join(';')).toMatch(/HttpOnly/i);
    const cookie1 = cookieOf(created);

    const me = await api().get('/api/me').set(bearer(created.body.accessToken));
    expect(me.status).toBe(200);
    expect(me.body.user.acceptedGuidelinesAt).toBeNull();

    // ครั้งต่อไปเข้าได้เลยโดยไม่ต้องตั้งโปรไฟล์ใหม่
    const again = await signIn();
    expect(again.status).toBe(200);
    expect(again.body.user.id).toBe(created.body.user.id);

    const refreshed = await api().post('/api/auth/refresh').set('Cookie', cookie1);
    expect(refreshed.status).toBe(200);
    const cookie2 = cookieOf(refreshed);
    expect(cookie2).not.toBe(cookie1);

    const out = await api().post('/api/auth/logout').set('Cookie', cookie2);
    expect(out.status).toBe(204);
    const afterLogout = await api().post('/api/auth/refresh').set('Cookie', cookie2);
    expect(afterLogout.status).toBe(401);
  });

  it.each([
    [
      'บัญชี Gmail ทั่วไป',
      { email: 'duck@gmail.com', hd: undefined },
      400,
      'EMAIL_DOMAIN_NOT_ALLOWED',
    ],
    [
      'อีเมลมหาวิทยาลัยที่ไม่ใช่บัญชีของ Workspace (ไม่มี hd)',
      { hd: undefined },
      403,
      'GOOGLE_ACCOUNT_NOT_ALLOWED',
    ],
    ['อีเมลที่ Google ยังไม่ยืนยัน', { email_verified: false }, 403, 'GOOGLE_ACCOUNT_NOT_ALLOWED'],
  ])('ปฏิเสธ%s', async (_label, overrides, status, code) => {
    googleAccount(overrides);
    const res = await signIn({ profile });
    expect(res.status).toBe(status);
    expect(res.body.error.code).toBe(code);
    expect(await prisma.user.count()).toBe(0);
  });

  it('ID token จาก Google ไม่ถูกต้อง → 401', async () => {
    verifyGoogleCredential.mockRejectedValue(unauthorized('GOOGLE_TOKEN_INVALID', 'ไม่ผ่าน'));
    const res = await signIn();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('GOOGLE_TOKEN_INVALID');
  });

  it('โปรไฟล์ไม่ถูกต้อง → 400 และยังไม่สร้างบัญชี', async () => {
    googleAccount();
    const res = await signIn({ profile: { ...profile, year: 7 } });
    expect(res.status).toBe(400);
    expect(await prisma.user.count()).toBe(0);
  });

  it('บัญชีเดิมที่อีเมลตรงกัน → ผูกกับบัญชี Google แล้วเข้าได้เลย', async () => {
    const { user } = await createUser({ email, nickname: 'เป็ดรุ่นแรก' });
    googleAccount();
    const res = await signIn();
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: user.id, nickname: 'เป็ดรุ่นแรก' });
    const linked = await prisma.user.findUnique({ where: { id: user.id } });
    expect(linked.googleSub).toBe('google-sub-1');
  });

  it('แถวที่สมัครค้างไว้ในระบบเดิม (ยังไม่ยืนยันอีเมล) ไม่นับเป็นบัญชี: ต้องตั้งโปรไฟล์ใหม่และใช้แถวเดิม', async () => {
    const { user: leftover } = await createUser({
      email,
      nickname: 'ชื่อที่คนอื่นตั้ง',
      year: 4,
      emailVerifiedAt: null,
      acceptedGuidelinesAt: null,
    });
    const { refreshToken } = await issueSession(leftover);
    googleAccount();

    const first = await signIn();
    expect(first.body).toEqual({ needsProfile: true, email });

    const created = await signIn({ profile });
    expect(created.status).toBe(201);
    expect(created.body.user).toMatchObject({ id: leftover.id, nickname: 'เป็ดมาใหม่', year: 1 });
    expect(await prisma.user.count()).toBe(1);
    const saved = await prisma.user.findUnique({ where: { id: leftover.id } });
    expect(saved.googleSub).toBe('google-sub-1');
    expect(saved.emailVerifiedAt).not.toBeNull();

    // session ที่เคยออกให้แถวเดิมต้องใช้ไม่ได้อีก
    const oldSession = await api()
      .post('/api/auth/refresh')
      .set('Cookie', `twd_rt=${refreshToken}`);
    expect(oldSession.status).toBe(401);
  });

  it('บัญชีทดสอบไม่รวมแถวที่ยังไม่ยืนยันอีเมล', async () => {
    const { user: verified } = await createUser();
    const { user: leftover } = await createUser({ emailVerifiedAt: null });

    const accounts = await listDevAccounts();
    expect(accounts.map((a) => a.id)).toEqual([verified.id]);
    await expect(devLogin({ userId: leftover.id })).rejects.toMatchObject({ status: 404 });
    await expect(devLogin({ userId: verified.id })).resolves.toMatchObject({
      user: { id: verified.id },
    });
  });

  it('บัญชีทดสอบมีเฉพาะบัญชีจาก seed: บัญชีที่ผูกกับ Google แล้วสวมรอยผ่านปุ่มนี้ไม่ได้', async () => {
    const { user: seeded } = await createUser();
    const { user: real } = await createUser({ googleSub: 'google-sub-real-account' });

    const accounts = await listDevAccounts();
    expect(accounts.map((a) => a.id)).toEqual([seeded.id]);
    await expect(devLogin({ userId: real.id })).rejects.toMatchObject({ status: 404 });
  });

  it('อีเมลที่ผูกกับบัญชี Google อื่นอยู่แล้ว → 403', async () => {
    await createUser({ email, googleSub: 'someone-else' });
    googleAccount();
    const res = await signIn();
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_MISMATCH');
  });

  it('บัญชีที่ถูกระงับเข้าไม่ได้', async () => {
    await createUser({ email, googleSub: 'google-sub-1', isBanned: true });
    googleAccount();
    const res = await signIn();
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('BANNED');
    expect(cookieOf(res)).toBeUndefined();
  });

  it('ใช้ refresh token เก่าซ้ำหลังพ้นช่วงผ่อนผัน = เพิกถอนทั้งตระกูล', async () => {
    const cookie1 = cookieOf(await signUp());
    const refreshed = await api().post('/api/auth/refresh').set('Cookie', cookie1);
    const cookie2 = cookieOf(refreshed);

    // จำลองว่า token แรกถูกหมุนไปนานแล้ว
    await prisma.refreshToken.updateMany({
      where: { rotatedAt: { not: null } },
      data: { rotatedAt: new Date(Date.now() - 60_000) },
    });

    const reuse = await api().post('/api/auth/refresh').set('Cookie', cookie1);
    expect(reuse.status).toBe(401);
    const legit = await api().post('/api/auth/refresh').set('Cookie', cookie2);
    expect(legit.status).toBe(401);
  });

  it('เปิดสองแท็บแล้ว refresh พร้อมกัน (ภายในช่วงผ่อนผัน) ต้องไม่หลุดออกจากระบบ', async () => {
    const cookie1 = cookieOf(await signUp());
    const [a, b] = await Promise.all([
      api().post('/api/auth/refresh').set('Cookie', cookie1),
      api().post('/api/auth/refresh').set('Cookie', cookie1),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
  });

  it('ปุ่มบัญชีทดสอบใช้ไม่ได้นอกโหมดพัฒนา (route ไม่มีอยู่)', async () => {
    const { user } = await createUser();
    expect((await api().get('/api/auth/dev-accounts')).status).toBe(404);
    const res = await api().post('/api/auth/dev-login').send({ userId: user.id });
    expect(res.status).toBe(404);
    expect(cookieOf(res)).toBeUndefined();
  });

  it('refresh ตอนเปิดเว็บ: ไม่มี cookie = ยังไม่ได้เข้าสู่ระบบ (204) ส่วน cookie ที่ใช้ไม่ได้ = 401 และลบ cookie', async () => {
    const guest = await api().post('/api/auth/refresh');
    expect(guest.status).toBe(204);
    expect(guest.headers['set-cookie']).toBeUndefined();

    const stale = await api().post('/api/auth/refresh').set('Cookie', 'twd_rt=not-a-real-token');
    expect(stale.status).toBe(401);
    expect(stale.body.error.code).toBe('SESSION_EXPIRED');
    expect(cookieOf(stale)).toBe('twd_rt=');
  });

  it('เรียก API ที่ต้องล็อกอินโดยไม่มี token ได้ 401', async () => {
    const res = await api().get('/api/me');
    expect(res.status).toBe(401);
  });
});
