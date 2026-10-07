// รูปแบบข้อมูลที่แต่ละ endpoint รับได้ (ตรวจด้วย zod ผ่าน middleware/validate.js)
import { z } from 'zod';
import { AVATAR_KEYS, LIMITS, RESERVED_NICKNAMES, STICKER_KEYS } from './config/constants.js';

const nickname = z
  .string()
  .trim()
  .min(LIMITS.nicknameMin, `ชื่อเล่นต้องยาว ${LIMITS.nicknameMin}–${LIMITS.nicknameMax} ตัวอักษร`)
  .max(LIMITS.nicknameMax, `ชื่อเล่นต้องยาว ${LIMITS.nicknameMin}–${LIMITS.nicknameMax} ตัวอักษร`)
  .refine((v) => !RESERVED_NICKNAMES.includes(v.toLowerCase()), 'ชื่อเล่นนี้สงวนไว้ ลองชื่ออื่นนะ');
const year = z.coerce.number().int().min(1, 'เลือกชั้นปี 1–4').max(4, 'เลือกชั้นปี 1–4');
const avatar = z.enum(AVATAR_KEYS, 'เลือกอวาตาร์เป็ดจากรายการ');
const optionalYear = z.preprocess(
  (v) => (v === '' || v === 'all' ? undefined : v),
  year.optional(),
);
// ช่องที่ไม่ได้กรอก (ว่างหรือมีแต่ช่องว่าง) = ไม่ได้ส่งมา
const blankToUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const idParam = z.object({ id: z.uuid('รหัสไม่ถูกต้อง') });

// ---------- Auth ----------
// credential = ID token จากปุ่ม Google · profile ส่งมาเฉพาะตอนเข้าครั้งแรก (ตั้งชื่อเล่น/ชั้นปี/เป็ด)
export const profileBody = z.object({ nickname, year, avatar });
export const googleBody = z.object({
  credential: z.string().min(1, 'ไม่พบข้อมูลจาก Google').max(4096),
  profile: profileBody.optional(),
});
export const devLoginBody = z.object({ userId: z.uuid('รหัสไม่ถูกต้อง') });

// ---------- Me ----------
export const updateMeBody = z
  .object({ nickname: nickname.optional(), avatar: avatar.optional(), year: year.optional() })
  .refine((v) => Object.keys(v).length > 0, 'ไม่มีข้อมูลที่จะแก้ไข');

// ---------- Rooms ----------
export const roomType = z.enum(['private', 'group', 'karaoke']);
export const listRoomsQuery = z.object({ type: roomType.optional(), year: optionalYear });
export const createRoomBody = z.object({
  name: z.string().trim().min(1, 'ตั้งชื่อห้องก่อนนะ').max(LIMITS.roomNameMax, 'ชื่อห้องยาวเกินไป'),
  type: roomType,
  yearFilter: year.nullable().optional(),
});
export const quickMatchBody = z.object({ year: year.nullable().optional() });
export const listMessagesQuery = z.object({ before: z.iso.datetime().optional() });
export const sendMessageBody = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    content: z
      .string()
      .trim()
      .min(1, 'พิมพ์ข้อความก่อนนะ')
      .max(LIMITS.messageMax, 'ข้อความยาวเกินไป'),
  }),
  z.object({ type: z.literal('sticker'), content: z.enum(STICKER_KEYS) }),
]);

// ---------- Karaoke ----------
export const searchQuery = z.object({
  q: z.string().trim().min(1, 'พิมพ์ชื่อเพลงก่อนนะ').max(100),
});
export const resolveBody = z.object({ url: z.string().trim().min(1).max(300) });
export const addSongBody = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, 'รหัสวิดีโอไม่ถูกต้อง'),
  title: z.string().trim().min(1).max(200),
  thumbnail: z.url().max(500).optional().nullable(),
});
export const songParams = z.object({ id: z.uuid(), songId: z.uuid() });
export const nextSongBody = z.object({ reason: z.enum(['done', 'skipped']).default('done') });

// ---------- Q&A ----------
export const topic = z.enum(['study', 'project', 'internship', 'life', 'other']);
export const listQuestionsQuery = z.object({
  year: optionalYear,
  topic: z.preprocess((v) => (v === '' || v === 'all' ? undefined : v), topic.optional()),
  sort: z.enum(['latest', 'popular', 'unanswered']).default('latest'),
  // ค้นหาจากหัวข้อและรายละเอียดของคำถาม
  q: z.preprocess(blankToUndefined, z.string().trim().max(100, 'คำค้นยาวเกินไป').optional()),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
const title = z
  .string()
  .trim()
  .min(5, 'หัวข้อสั้นเกินไป (อย่างน้อย 5 ตัวอักษร)')
  .max(LIMITS.questionTitleMax, 'หัวข้อยาวเกินไป');
const postContent = z
  .string()
  .trim()
  .min(1, 'พิมพ์รายละเอียดก่อนนะ')
  .max(LIMITS.postContentMax, 'ข้อความยาวเกินไป');
export const createQuestionBody = z.object({
  title,
  content: postContent,
  tagYear: year.nullable().optional(),
  topic: topic.default('other'),
  isAnonymous: z.boolean().default(false),
});
export const updateQuestionBody = z
  .object({
    title: title.optional(),
    content: postContent.optional(),
    tagYear: year.nullable().optional(),
    topic: topic.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'ไม่มีข้อมูลที่จะแก้ไข');
export const createAnswerBody = z.object({
  content: postContent,
  isAnonymous: z.boolean().default(false),
});
export const updateAnswerBody = z.object({ content: postContent });

// ---------- Reports / Admin ----------
export const createReportBody = z.object({
  targetType: z.enum(['question', 'answer', 'message', 'user', 'room']),
  targetId: z.uuid(),
  reason: z.enum(['harassment', 'hate', 'sexual', 'spam', 'self_harm', 'other']),
  details: z.string().trim().max(LIMITS.reportDetailsMax).optional(),
});
export const listReportsQuery = z.object({
  status: z.enum(['pending', 'actioned', 'dismissed']).default('pending'),
});
export const reviewReportBody = z.object({ action: z.enum(['hide', 'ban', 'dismiss']) });
// สถิติตามช่วงเวลา (เช่น เฉพาะช่วง Duck Community Week): from รวมเวลานั้น ส่วน to ไม่รวม
export const statsQuery = z
  .object({ from: z.iso.datetime().optional(), to: z.iso.datetime().optional() })
  .refine(
    ({ from, to }) => !from || !to || new Date(from) < new Date(to),
    'วันเริ่มต้นต้องมาก่อนวันสิ้นสุด',
  );
