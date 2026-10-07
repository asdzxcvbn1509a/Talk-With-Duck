// Open Q&A Board: ตั้งกระทู้ ตอบได้ไม่จำกัดจำนวนคน กดถูกใจ และโหมดไม่เปิดเผยตัวตน (ข้อ 3.5.7)
import { prisma } from '../lib/prisma.js';
import { presentAnswer, presentQuestion, publicUserSelect } from '../utils/present.js';
import { forbidden, notFound } from '../utils/httpError.js';
import { isModerator } from '../utils/roles.js';

const userSelect = { select: publicUserSelect };

const questionInclude = (viewer) => ({
  user: userSelect,
  _count: { select: { answers: { where: { isHidden: false } } } },
  loves: { where: { userId: viewer.id }, select: { userId: true } },
});

const questionNotFound = () => notFound('QUESTION_NOT_FOUND', 'ไม่พบคำถามนี้ (อาจถูกลบไปแล้ว)');

/** คำถามที่ยังแสดงบนบอร์ด (ไม่มี หรือถูกผู้ดูแลซ่อน = 404) · db เป็น prisma หรือ tx ของ transaction ก็ได้ */
const findVisibleQuestion = async (db, id) => {
  const question = await db.question.findUnique({ where: { id } });
  if (!question || question.isHidden) throw questionNotFound();
  return question;
};

/** แก้ไข/ลบโพสต์ได้เฉพาะเจ้าของ · allowModerator: ผู้ดูแลลบได้ด้วย */
const assertCanModify = (post, viewer, message, { allowModerator = false } = {}) => {
  if (post.userId !== viewer.id && !(allowModerator && isModerator(viewer))) {
    throw forbidden('NOT_OWNER', message);
  }
};

/**
 * ค้นจากหัวข้อและรายละเอียด (ไม่สนตัวพิมพ์เล็ก/ใหญ่ของภาษาอังกฤษ)
 * Prisma ส่ง contains ไปเป็น LIKE โดยไม่ escape ให้: ต้องใส่ \ หน้า % และ _ เอง
 * ไม่อย่างนั้นค้น "%" จะได้ทุกคำถาม
 */
const searchFilter = (q) => {
  if (!q) return {};
  const match = { contains: q.replace(/[\\%_]/g, '\\$&'), mode: 'insensitive' };
  return { OR: [{ title: match }, { content: match }] };
};

export const listQuestions = async (viewer, { year, topic, sort, q, cursor, limit }) => {
  const where = {
    isHidden: false,
    tagYear: year,
    topic,
    ...(sort === 'unanswered' ? { answers: { none: { isHidden: false } } } : {}),
    ...searchFilter(q),
  };
  const orderBy =
    sort === 'popular'
      ? [{ loveCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]
      : [{ createdAt: 'desc' }, { id: 'desc' }];

  const rows = await prisma.question.findMany({
    where,
    orderBy,
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: questionInclude(viewer),
  });
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  return {
    items: items.map((q) => presentQuestion(q, viewer)),
    nextCursor: hasMore ? items.at(-1).id : null,
  };
};

export const getQuestion = async (viewer, id) => {
  const question = await prisma.question.findUnique({
    where: { id },
    include: {
      ...questionInclude(viewer),
      answers: {
        where: { isHidden: false },
        orderBy: { createdAt: 'asc' },
        include: { user: userSelect },
      },
    },
  });
  if (!question || (question.isHidden && !isModerator(viewer))) throw questionNotFound();
  return {
    ...presentQuestion(question, viewer),
    answers: question.answers.map((a) => presentAnswer(a, viewer)),
  };
};

export const createQuestion = async (viewer, data) => {
  const question = await prisma.question.create({
    data: { ...data, userId: viewer.id },
    include: questionInclude(viewer),
  });
  return presentQuestion(question, viewer);
};

const loadOwnQuestion = async (viewer, id, options) => {
  const question = await findVisibleQuestion(prisma, id);
  assertCanModify(question, viewer, 'แก้ไข/ลบได้เฉพาะคำถามของตัวเอง', options);
  return question;
};

export const updateQuestion = async (viewer, id, data) => {
  await loadOwnQuestion(viewer, id);
  const question = await prisma.question.update({
    where: { id },
    data,
    include: questionInclude(viewer),
  });
  return presentQuestion(question, viewer);
};

export const deleteQuestion = async (viewer, id) => {
  await loadOwnQuestion(viewer, id, { allowModerator: true });
  await prisma.question.delete({ where: { id } });
};

export const createAnswer = async (viewer, questionId, data) => {
  await findVisibleQuestion(prisma, questionId);
  const answer = await prisma.answer.create({
    data: { ...data, questionId, userId: viewer.id },
    include: { user: userSelect },
  });
  return presentAnswer(answer, viewer);
};

const loadOwnAnswer = async (viewer, id, options) => {
  const answer = await prisma.answer.findUnique({ where: { id } });
  if (!answer || answer.isHidden) throw notFound('ANSWER_NOT_FOUND', 'ไม่พบคำตอบนี้');
  assertCanModify(answer, viewer, 'แก้ไข/ลบได้เฉพาะคำตอบของตัวเอง', options);
  return answer;
};

export const updateAnswer = async (viewer, id, data) => {
  await loadOwnAnswer(viewer, id);
  const answer = await prisma.answer.update({ where: { id }, data, include: { user: userSelect } });
  return presentAnswer(answer, viewer);
};

export const deleteAnswer = async (viewer, id) => {
  await loadOwnAnswer(viewer, id, { allowModerator: true });
  await prisma.answer.delete({ where: { id } });
};

/** ปุ่ม Give Love: กดครั้งแรกเพิ่ม กดซ้ำเพื่อยกเลิก */
export const toggleLove = async (viewer, questionId) => {
  return prisma.$transaction(async (tx) => {
    await findVisibleQuestion(tx, questionId);

    const key = { questionId_userId: { questionId, userId: viewer.id } };
    const existing = await tx.questionLove.findUnique({ where: key });
    if (existing) {
      await tx.questionLove.delete({ where: key });
    } else {
      await tx.questionLove.create({ data: { questionId, userId: viewer.id } });
    }
    const updated = await tx.question.update({
      where: { id: questionId },
      data: { loveCount: existing ? { decrement: 1 } : { increment: 1 } },
    });
    return { loved: !existing, loveCount: updated.loveCount };
  });
};
