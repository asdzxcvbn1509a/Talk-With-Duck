// สถิติตามตัวชี้วัดความสำเร็จของโครงการ (ข้อ 4.6) สำหรับทีมใช้เขียนรายงานสรุป
// เลือกช่วงเวลาได้ (from รวมเวลานั้น ส่วน to ไม่รวม) เช่น เฉพาะช่วง Duck Community Week
// จะได้ไม่นับห้องและคำถามที่ทีมสร้างตอนทดสอบระบบก่อนเปิดใช้จริง
import { prisma } from '../lib/prisma.js';

/** เงื่อนไขช่วงเวลาของ Prisma · ไม่ได้เลือกช่วง = undefined (Prisma ไม่กรอง) */
const between = (from, to) => {
  if (!from && !to) return undefined;
  return { ...(from && { gte: new Date(from) }), ...(to && { lt: new Date(to) }) };
};

/** จำนวนผู้ใช้ที่ไม่ซ้ำกันจากผล groupBy ตาม userId ของหลายตาราง */
const countDistinctUsers = (...groups) => new Set(groups.flat().map((row) => row.userId)).size;

export const getStats = async ({ from, to } = {}) => {
  const created = { createdAt: between(from, to) };
  const joined = { joinedAt: between(from, to) };
  const verified = { emailVerifiedAt: { not: null }, ...created };

  const [
    users,
    usersByYear,
    roomsByType,
    roomsByYear,
    activeRooms,
    questions,
    answers,
    loves,
    messages,
    karaokeParticipants,
    songs,
    pendingReports,
    roomUsers,
    askers,
    answerers,
    lovers,
  ] = await Promise.all([
    prisma.user.count({ where: verified }),
    prisma.user.groupBy({ by: ['year'], where: verified, _count: true }),
    prisma.room.groupBy({ by: ['type'], where: created, _count: true }),
    prisma.room.groupBy({ by: ['yearFilter'], where: created, _count: true }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.question.count({ where: created }),
    prisma.answer.count({ where: created }),
    prisma.questionLove.count({ where: created }),
    prisma.message.count({ where: created }),
    prisma.roomMember.groupBy({ by: ['userId'], where: { room: { type: 'karaoke' }, ...joined } }),
    prisma.songQueue.count({ where: { status: { in: ['done', 'playing'] }, ...created } }),
    prisma.report.count({ where: { status: 'pending' } }),
    // คนที่ใช้งานจริง (ตัวชี้วัดข้อ 1): เข้าห้อง ตั้งคำถาม ตอบ หรือส่งใจ อย่างน้อย 1 ครั้งในช่วงนี้
    prisma.roomMember.groupBy({ by: ['userId'], where: joined }),
    prisma.question.groupBy({ by: ['userId'], where: created }),
    prisma.answer.groupBy({ by: ['userId'], where: created }),
    prisma.questionLove.groupBy({ by: ['userId'], where: created }),
  ]);

  const byType = { private: 0, group: 0, karaoke: 0 };
  for (const row of roomsByType) byType[row.type] = row._count;
  // ห้องที่แยกตามชั้นปี (ตัวชี้วัดข้อ 2) · all = ห้องที่เปิดให้ทุกชั้นปี
  const roomsYear = { all: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const row of roomsByYear) roomsYear[row.yearFilter ?? 'all'] = row._count;
  const byYear = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const row of usersByYear) byYear[row.year] = row._count;

  return {
    range: { from: from ?? null, to: to ?? null },
    // total/byYear: สมาชิกที่สมัครในช่วงนี้ (ไม่เลือกช่วง = ทั้งหมด)
    users: {
      total: users,
      byYear,
      active: countDistinctUsers(roomUsers, askers, answerers, lovers),
    },
    rooms: {
      total: byType.private + byType.group + byType.karaoke,
      byType,
      byYear: roomsYear,
      // ค่าปัจจุบันเสมอ ไม่ขึ้นกับช่วงเวลา
      activeNow: activeRooms,
    },
    qa: { questions, answers, loves },
    messages,
    karaoke: { participants: karaokeParticipants.length, songsPlayed: songs },
    reports: { pending: pendingReports },
    generatedAt: new Date(),
  };
};
