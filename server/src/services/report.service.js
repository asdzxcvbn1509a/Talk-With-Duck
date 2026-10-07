// ระบบแจ้งรายงานเนื้อหา/พฤติกรรมที่ไม่เหมาะสม และการตรวจสอบโดยผู้ดูแล (ข้อ 3.5.7)
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { disconnectUser, emitToModerators, emitToRoom, emitToUser } from '../realtime/hub.js';
import { publicUser } from '../utils/present.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { closeRoom, leaveRoom } from './room.service.js';
import { revokeAllForUser } from './token.service.js';

const userSelect = {
  select: { id: true, nickname: true, avatar: true, year: true, isBanned: true },
};

// ตารางของสิ่งที่ถูกรายงานแต่ละประเภท และข้อมูลเจ้าของตัวจริงที่ต้องโหลดมาด้วย
// (ผู้ดูแลต้องเห็นเจ้าของแม้โพสต์จะไม่ระบุตัวตน)
const targetTables = {
  question: { model: prisma.question, args: { include: { user: userSelect } } },
  answer: { model: prisma.answer, args: { include: { user: userSelect } } },
  message: { model: prisma.message, args: { include: { user: userSelect } } },
  user: { model: prisma.user, args: userSelect },
  room: { model: prisma.room, args: { include: { host: userSelect } } },
};

const targetKey = (type, id) => `${type}:${id}`;

const ownerOf = (type, target) => {
  if (type === 'user') return target;
  if (type === 'room') return target.host;
  return target.user;
};

const previewOf = (type, target) => {
  switch (type) {
    case 'question':
      return {
        title: target.title,
        content: target.content,
        isHidden: target.isHidden,
        questionId: target.id,
      };
    case 'answer':
      return { content: target.content, isHidden: target.isHidden, questionId: target.questionId };
    case 'message':
      return {
        content: target.content,
        type: target.type,
        isHidden: target.isHidden,
        roomId: target.roomId,
      };
    case 'user':
      return { nickname: target.nickname };
    case 'room':
      return { name: target.name, roomType: target.type, isActive: target.isActive };
    default:
      return {};
  }
};

const loadTarget = async (type, id) => {
  const { model, args } = targetTables[type];
  const target = await model.findUnique({ where: { id }, ...args });
  if (!target) throw notFound('TARGET_NOT_FOUND', 'ไม่พบสิ่งที่ต้องการรายงาน');
  return target;
};

/**
 * โหลดสิ่งที่ถูกรายงานของทุกรายการ ประเภทละ 1 query (ไม่เกิน 5 query)
 * แทนการโหลดทีละรายการ ซึ่งสูงสุด 200 query แย่ง connection ของฐานข้อมูลกับผู้ใช้คนอื่น
 * คืน Map ของ "ประเภท:id" → ข้อมูล (สิ่งที่ถูกลบไปแล้วจะไม่มีใน Map)
 */
const loadTargetsOf = async (reports) => {
  const idsByType = new Map();
  for (const r of reports) {
    if (!idsByType.has(r.targetType)) idsByType.set(r.targetType, new Set());
    idsByType.get(r.targetType).add(r.targetId);
  }

  const loaded = new Map();
  await Promise.all(
    [...idsByType].map(async ([type, ids]) => {
      const { model, args } = targetTables[type];
      const rows = await model.findMany({ where: { id: { in: [...ids] } }, ...args });
      for (const row of rows) loaded.set(targetKey(type, row.id), row);
    }),
  );
  return loaded;
};

export const createReport = async (reporter, { targetType, targetId, reason, details }) => {
  const target = await loadTarget(targetType, targetId);
  if (ownerOf(targetType, target)?.id === reporter.id) {
    throw badRequest('CANNOT_REPORT_SELF', 'รายงานเนื้อหาของตัวเองไม่ได้');
  }
  try {
    const report = await prisma.report.create({
      data: { reporterId: reporter.id, targetType, targetId, reason, details },
    });
    emitToModerators('admin:report-created', { id: report.id, targetType, reason });
    return report;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw conflict('ALREADY_REPORTED', 'คุณรายงานรายการนี้ไปแล้ว ขอบคุณที่ช่วยดูแลคอมมูนิตี้นะ');
    }
    throw err;
  }
};

/** จำนวนรายงานที่รอตรวจ ใช้ทำป้ายตัวเลขบนเมนูผู้ดูแล · urgent = หัวข้อเสี่ยงทำร้ายตัวเอง */
export const reportSummary = async () => {
  const [pending, urgent] = await Promise.all([
    prisma.report.count({ where: { status: 'pending' } }),
    prisma.report.count({ where: { status: 'pending', reason: 'self_harm' } }),
  ]);
  return { pending, urgent };
};

export const listReports = async ({ status }) => {
  const reports = await prisma.report.findMany({
    where: { status },
    include: { reporter: userSelect, reviewedBy: userSelect },
    orderBy: [{ createdAt: status === 'pending' ? 'asc' : 'desc' }],
    take: 200,
  });

  const counts = new Map();
  for (const r of reports) {
    const key = targetKey(r.targetType, r.targetId);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const targets = await loadTargetsOf(reports);

  return reports.map((r) => {
    const key = targetKey(r.targetType, r.targetId);
    const target = targets.get(key);
    const owner = target ? ownerOf(r.targetType, target) : null;
    return {
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt,
      reviewedAt: r.reviewedAt,
      reporter: publicUser(r.reporter),
      reviewedBy: publicUser(r.reviewedBy),
      sameTargetCount: counts.get(key),
      target: target ? { exists: true, ...previewOf(r.targetType, target) } : { exists: false },
      owner: owner ? { ...publicUser(owner), isBanned: owner.isBanned } : null,
    };
  });
};

const hideTarget = async (type, target) => {
  switch (type) {
    case 'question':
      await prisma.question.update({ where: { id: target.id }, data: { isHidden: true } });
      break;
    case 'answer':
      await prisma.answer.update({ where: { id: target.id }, data: { isHidden: true } });
      break;
    case 'message':
      await prisma.message.update({ where: { id: target.id }, data: { isHidden: true } });
      emitToRoom(target.roomId, 'chat:message-hidden', { id: target.id });
      break;
    case 'room':
      if (target.isActive) await closeRoom(target.id);
      break;
    default:
      throw badRequest('CANNOT_HIDE', 'รายการประเภทนี้ซ่อนไม่ได้ ใช้การระงับบัญชีแทน');
  }
};

export const banUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('USER_NOT_FOUND', 'ไม่พบผู้ใช้');
  if (user.role === 'moderator')
    throw badRequest('CANNOT_BAN_MODERATOR', 'ระงับบัญชีผู้ดูแลไม่ได้');

  await prisma.user.update({ where: { id: userId }, data: { isBanned: true } });
  await revokeAllForUser(userId);
  const memberships = await prisma.roomMember.findMany({
    where: { userId, leftAt: null },
    select: { roomId: true },
  });
  for (const { roomId } of memberships) await leaveRoom(roomId, userId);
  emitToUser(userId, 'auth:banned', {});
  disconnectUser(userId);
};

export const listBannedUsers = async () => {
  const users = await prisma.user.findMany({
    where: { isBanned: true },
    ...userSelect,
    orderBy: { nickname: 'asc' },
    take: 200,
  });
  return users.map(publicUser);
};

// ปลดระงับ: session ถูกเพิกถอนไปตอนระงับแล้ว ผู้ใช้ต้องเข้าสู่ระบบใหม่ · เนื้อหาที่ถูกซ่อนยังซ่อนอยู่
export const unbanUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('USER_NOT_FOUND', 'ไม่พบผู้ใช้');
  await prisma.user.update({ where: { id: userId }, data: { isBanned: false } });
};

export const reviewReport = async (moderator, reportId, { action }) => {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw notFound('REPORT_NOT_FOUND', 'ไม่พบรายการแจ้งรายงาน');

  if (action !== 'dismiss') {
    const target = await loadTarget(report.targetType, report.targetId);
    if (action === 'hide') await hideTarget(report.targetType, target);
    if (action === 'ban') {
      const owner = ownerOf(report.targetType, target);
      if (!owner) throw badRequest('NO_OWNER', 'ไม่พบเจ้าของเนื้อหานี้');
      await banUser(owner.id);
    }
  }

  // ปิดรายการแจ้งรายงานทุกอันที่ชี้ไปยังสิ่งเดียวกัน
  await prisma.report.updateMany({
    where: { targetType: report.targetType, targetId: report.targetId, status: 'pending' },
    data: {
      status: action === 'dismiss' ? 'dismissed' : 'actioned',
      reviewedById: moderator.id,
      reviewedAt: new Date(),
    },
  });
  // ผู้ดูแลคนอื่นที่ออนไลน์อยู่: อัปเดตป้ายตัวเลขและรายการรายงาน
  emitToModerators('admin:report-reviewed', {
    targetType: report.targetType,
    targetId: report.targetId,
  });
};
