import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken } from '../../src/lib/jwt.js';
import { presentAnswer, presentQuestion, publicUser } from '../../src/utils/present.js';
import { isDevLoginEnabled } from '../../src/config/env.js';
import { googleBody, sendMessageBody } from '../../src/schemas.js';

const user = { id: '11111111-1111-4111-8111-111111111111', role: 'member', year: 2 };

describe('JWT access token', () => {
  it('ออกแล้วตรวจกลับได้ข้อมูลเดิม', () => {
    const token = signAccessToken(user);
    expect(verifyAccessToken(token)).toEqual({ id: user.id, role: 'member', year: 2 });
  });

  it('ปฏิเสธ token ที่เซ็นด้วย secret อื่น', () => {
    const forged = jwt.sign({ role: 'moderator' }, 'another-secret-another-secret-12345', {
      subject: user.id,
      issuer: 'talk-with-duck',
    });
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it('ปฏิเสธ token ที่หมดอายุ', () => {
    const expired = jwt.sign({ role: 'member' }, process.env.JWT_ACCESS_SECRET, {
      subject: user.id,
      issuer: 'talk-with-duck',
      expiresIn: -10,
    });
    expect(() => verifyAccessToken(expired)).toThrow(jwt.TokenExpiredError);
  });

  it('ปฏิเสธ token ที่ไม่ได้เซ็น (alg: none)', () => {
    const unsigned = jwt.sign({ role: 'moderator', sub: user.id, iss: 'talk-with-duck' }, null, {
      algorithm: 'none',
    });
    expect(() => verifyAccessToken(unsigned)).toThrow();
  });
});

describe('การซ่อนตัวตนบน Q&A', () => {
  const author = {
    id: 'author-id',
    nickname: 'เป็ดตัวจริง',
    avatar: 'duck-cap',
    year: 3,
    email: 'real.name@mail.kmutt.ac.th',
  };
  const base = {
    id: 'q1',
    userId: author.id,
    user: author,
    title: 'หัวข้อ',
    content: 'เนื้อหา',
    tagYear: 3,
    topic: 'study',
    loveCount: 2,
    _count: { answers: 1 },
    loves: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('โพสต์แบบไม่ระบุตัวตนไม่หลุด id/ชื่อ/อีเมลของเจ้าของ', () => {
    const presented = presentQuestion({ ...base, isAnonymous: true }, { id: 'someone-else' });
    const json = JSON.stringify(presented);
    expect(presented.author.nickname).toBe('เป็ดนิรนาม');
    expect(json).not.toContain(author.id);
    expect(json).not.toContain(author.nickname);
    expect(json).not.toContain(author.email);
    expect(presented.isMine).toBe(false);
  });

  it('เจ้าของเห็นว่าเป็นโพสต์ของตัวเองแม้จะไม่ระบุตัวตน', () => {
    const presented = presentQuestion({ ...base, isAnonymous: true }, { id: author.id });
    expect(presented.isMine).toBe(true);
    expect(presented.author.id).toBeNull();
  });

  it('โพสต์ปกติแสดงชื่อเล่นแต่ไม่แสดงอีเมล', () => {
    const presented = presentAnswer(
      {
        id: 'a1',
        questionId: 'q1',
        userId: author.id,
        user: author,
        content: 'x',
        isAnonymous: false,
      },
      null,
    );
    expect(presented.author.nickname).toBe('เป็ดตัวจริง');
    expect(JSON.stringify(presented)).not.toContain(author.email);
    expect(publicUser(author)).not.toHaveProperty('email');
  });
});

describe('schemas', () => {
  const profile = { nickname: 'เป็ดน้อย', year: 1, avatar: 'duck-classic' };
  const withProfile = (patch) => ({
    credential: 'google-id-token',
    profile: { ...profile, ...patch },
  });

  it('รับ credential จาก Google ทั้งแบบมีและไม่มีโปรไฟล์', () => {
    expect(googleBody.safeParse({ credential: 'google-id-token' }).success).toBe(true);
    expect(googleBody.safeParse(withProfile({})).success).toBe(true);
    expect(googleBody.safeParse({ profile }).success).toBe(false);
  });

  it('ปฏิเสธชั้นปีนอก 1–4 อวาตาร์แปลก และชื่อสงวน', () => {
    expect(googleBody.safeParse(withProfile({ year: 5 })).success).toBe(false);
    expect(googleBody.safeParse(withProfile({ avatar: 'cat' })).success).toBe(false);
    expect(googleBody.safeParse(withProfile({ nickname: 'เป็ดนิรนาม' })).success).toBe(false);
  });

  it('สติกเกอร์ต้องอยู่ในรายการที่กำหนด', () => {
    expect(sendMessageBody.safeParse({ type: 'sticker', content: 'heart' }).success).toBe(true);
    expect(sendMessageBody.safeParse({ type: 'sticker', content: '<script>' }).success).toBe(false);
    expect(sendMessageBody.safeParse({ type: 'text', content: '   ' }).success).toBe(false);
  });
});

describe('ปุ่มบัญชีทดสอบ (DEV_LOGIN)', () => {
  it.each([
    ['development', 'true', true],
    ['development', 'false', false],
    ['test', 'true', false],
    ['production', 'true', false],
  ])('NODE_ENV=%s + DEV_LOGIN=%s → เปิด %s', (NODE_ENV, DEV_LOGIN, expected) => {
    expect(isDevLoginEnabled({ NODE_ENV, DEV_LOGIN })).toBe(expected);
  });
});
