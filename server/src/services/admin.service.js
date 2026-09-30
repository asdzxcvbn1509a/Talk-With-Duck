// สถิติตามตัวชี้วัดความสำเร็จของโครงการ (ข้อ 4.6) สำหรับทีมใช้เขียนรายงานสรุป
import { prisma } from '../lib/prisma.js';

export const getStats = async () => {
  const [
    users,
    usersByYear,
    roomsByType,
    activeRooms,
    questions,
    answers,
    loves,
    messages,
    karaokeParticipants,
    songs,
    pendingReports,
  ] = await Promise.all([
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
    prisma.user.groupBy({ by: ['year'], where: { emailVerifiedAt: { not: null } }, _count: true }),
    prisma.room.groupBy({ by: ['type'], _count: true }),
    prisma.room.count({ where: { isActive: true } }),
    prisma.question.count(),
    prisma.answer.count(),
    prisma.questionLove.count(),
    prisma.message.count(),
    prisma.roomMember.findMany({
      where: { room: { type: 'karaoke' } },
      distinct: ['userId'],
      select: { userId: true },
    }),
    prisma.songQueue.count({ where: { status: { in: ['done', 'playing'] } } }),
    prisma.report.count({ where: { status: 'pending' } }),
  ]);

  const byType = { private: 0, group: 0, karaoke: 0 };
  for (const row of roomsByType) byType[row.type] = row._count;
  const byYear = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const row of usersByYear) byYear[row.year] = row._count;

  return {
    users: { total: users, byYear },
    rooms: {
      total: byType.private + byType.group + byType.karaoke,
      byType,
      activeNow: activeRooms,
    },
    qa: { questions, answers, loves },
    messages,
    karaoke: { participants: karaokeParticipants.length, songsPlayed: songs },
    reports: { pending: pendingReports },
    generatedAt: new Date(),
  };
};
