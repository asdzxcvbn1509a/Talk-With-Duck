// Open Q&A Board: ตั้งกระทู้ ตอบได้ไม่จำกัดจำนวนคน กดถูกใจ และโหมดไม่เปิดเผยตัวตน (ข้อ 3.5.7)
import { prisma } from '../lib/prisma.js';
import { presentAnswer, presentQuestion } from '../utils/present.js';
import { forbidden, notFound } from '../utils/httpError.js';

const userSelect = { select: { id: true, nickname: true, avatar: true, year: true } };

const questionInclude = (viewer) => ({
  user: userSelect,
  _count: { select: { answers: { where: { isHidden: false } } } },
  loves: { where: { userId: viewer.id }, select: { userId: true } },
});

const questionNotFound = () => notFound('QUESTION_NOT_FOUND', 'ไม่พบคำถามนี้ (อาจถูกลบไปแล้ว)');
const isModerator = (viewer) => viewer.role === 'moderator';

export const listQuestions = async (viewer, { year, topic, sort, cursor, limit }) => {
  const where = {
    isHidden: false,
    tagYear: year,
    topic,
    ...(sort === 'unanswered' ? { answers: { none: { isHidden: false } } } : {}),
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

const loadOwnQuestion = async (viewer, id, { allowModerator = false } = {}) => {
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question || question.isHidden) throw questionNotFound();
  if (question.userId !== viewer.id && !(allowModerator && isModerator(viewer))) {
    throw forbidden('NOT_OWNER', 'แก้ไข/ลบได้เฉพาะคำถามของตัวเอง');
  }
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
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || question.isHidden) throw questionNotFound();
  const answer = await prisma.answer.create({
    data: { ...data, questionId, userId: viewer.id },
    include: { user: userSelect },
  });
  return presentAnswer(answer, viewer);
};

const loadOwnAnswer = async (viewer, id, { allowModerator = false } = {}) => {
  const answer = await prisma.answer.findUnique({ where: { id } });
  if (!answer || answer.isHidden) throw notFound('ANSWER_NOT_FOUND', 'ไม่พบคำตอบนี้');
  if (answer.userId !== viewer.id && !(allowModerator && isModerator(viewer))) {
    throw forbidden('NOT_OWNER', 'แก้ไข/ลบได้เฉพาะคำตอบของตัวเอง');
  }
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
    const question = await tx.question.findUnique({ where: { id: questionId } });
    if (!question || question.isHidden) throw questionNotFound();

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
