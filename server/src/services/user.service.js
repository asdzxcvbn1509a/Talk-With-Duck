// ข้อมูลของผู้ใช้เอง (/api/me): แก้โปรไฟล์ ยอมรับข้อตกลง และลบบัญชีถาวร
import { prisma } from '../lib/prisma.js';
import { disconnectUser } from '../realtime/hub.js';
import { badRequest } from '../utils/httpError.js';
import { isModerator } from '../utils/roles.js';
import { removeSong } from './queue.service.js';
import { leaveAllRooms } from './room.service.js';

export const updateProfile = (userId, data) => {
  return prisma.user.update({ where: { id: userId }, data });
};

export const acceptGuidelines = (userId) => {
  return prisma.user.update({ where: { id: userId }, data: { acceptedGuidelinesAt: new Date() } });
};

/**
 * ลบบัญชีถาวร (ผู้ใช้กดเองในหน้า "ฉัน")
 * ข้อมูลที่ผูกกับบัญชีถูกลบตาม FK (ON DELETE CASCADE): session, การเข้าห้อง, ข้อความแชท,
 * คำถาม (พร้อมคำตอบและใจในคำถามนั้น), คำตอบ, ใจ, เพลงที่จอง
 * ส่วนรายงานที่เคยส่งยังอยู่โดยไม่ผูกกับบัญชี (reporter_id = null) ผู้ดูแลจะได้จัดการต่อได้
 */
export const deleteAccount = async (user) => {
  // กันลบบัญชีผู้ดูแลคนสุดท้ายโดยไม่ตั้งใจ (ตั้งผู้ดูแลได้จากฐานข้อมูลเท่านั้น)
  if (isModerator(user)) {
    throw badRequest(
      'MODERATOR_CANNOT_DELETE',
      'บัญชีผู้ดูแลลบเองไม่ได้ ให้ทีมเปลี่ยนสิทธิ์เป็นสมาชิกก่อนนะ',
    );
  }

  // ออกจากห้องที่อยู่ตามปกติ: ย้ายเจ้าของห้องให้คนต่อไป หรือปิดห้องถ้าไม่เหลือใคร
  await leaveAllRooms(user.id);

  // เพลงที่จองค้างในห้องที่ยังเปิด: เอาออกจากคิวแบบเดียวกับกดลบเพลง (เพลงที่กำลังเล่นจะข้ามไปเพลงถัดไป)
  // ถ้าปล่อยให้แถวถูกลบตาม FK เฉย ๆ คนในห้องจะยังเห็นคิวเดิม
  const songs = await prisma.songQueue.findMany({
    where: {
      requestedBy: user.id,
      status: { in: ['playing', 'queued'] },
      room: { isActive: true },
    },
    select: { id: true, roomId: true },
  });
  for (const song of songs) {
    try {
      await removeSong(song.roomId, user.id, song.id);
    } catch (err) {
      // เพลงเพิ่งจบหรือห้องเพิ่งปิดระหว่างนั้น: ไม่เป็นไร แถวเพลงจะถูกลบไปพร้อมบัญชีอยู่แล้ว
      if (!['SONG_NOT_FOUND', 'ROOM_CLOSED'].includes(err.code)) throw err;
    }
  }

  await prisma.$transaction(async (tx) => {
    // ยอดใจเก็บเป็นตัวเลขในคำถาม (love_count) จึงต้องลดเองก่อนใจของคนนี้จะถูกลบ
    const loves = await tx.questionLove.findMany({
      where: { userId: user.id },
      select: { questionId: true },
    });
    if (loves.length > 0) {
      await tx.question.updateMany({
        where: { id: { in: loves.map((love) => love.questionId) } },
        data: { loveCount: { decrement: 1 } },
      });
    }
    await tx.user.delete({ where: { id: user.id } });
  });

  // แท็บ/เครื่องอื่นที่ยังเปิดอยู่หลุดการเชื่อมต่อ คำขอถัดไปจะได้ 401 แล้วกลับไปหน้าเข้าสู่ระบบ
  disconnectUser(user.id);
};
