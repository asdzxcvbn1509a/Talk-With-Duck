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

// โหลดสิ่งที่ถูกรายงาน พร้อมเจ้าของตัวจริง (ผู้ดูแลต้องเห็นแม้โพสต์จะไม่ระบุตัวตน)
const loaders = {
  question: (id) => prisma.question.findUnique({ where: { id }, include: { user: userSelect } }),
  answer: (id) => prisma.answer.findUnique({ where: { id }, include: { user: userSelect } }),
  message: (id) => prisma.message.findUnique({ where: { id }, include: { user: userSelect } }),
  user: (id) => prisma.user.findUnique({ where: { id }, ...userSelect }),
  room: (id) => prisma.room.findUnique({ where: { id }, include: { host: userSelect } }),
};

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
  const target = await loaders[type](id);
  if (!target) throw notFound('TARGET_NOT_FOUND', 'ไม่พบสิ่งที่ต้องการรายงาน');
  return target;
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

export const listReports = async ({ status }) => {
  const reports = await prisma.report.findMany({
    where: { status },
    include: { reporter: userSelect, reviewedBy: userSelect },
    orderBy: [{ createdAt: status === 'pending' ? 'asc' : 'desc' }],
    take: 200,
  });

  const counts = new Map();
  for (const r of reports) {
    const key = `${r.targetType}:${r.targetId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Promise.all(
    reports.map(async (r) => {
      const target = await loaders[r.targetType](r.targetId);
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
        sameTargetCount: counts.get(`${r.targetType}:${r.targetId}`),
        target: target ? { exists: true, ...previewOf(r.targetType, target) } : { exists: false },
        owner: owner ? { ...publicUser(owner), isBanned: owner.isBanned } : null,
      };
    }),
  );
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
};
