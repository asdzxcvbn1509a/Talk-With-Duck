// แชทข้อความและสติกเกอร์ในห้อง: บันทึกลงฐานข้อมูลแล้วกระจายให้ทุกคนในห้องผ่าน Socket.IO
import { prisma } from '../lib/prisma.js';
import { emitToRoom } from '../realtime/hub.js';
import { presentMessage, publicUserSelect } from '../utils/present.js';
import { assertActiveMember } from './room.service.js';

const include = { user: { select: publicUserSelect } };

/**
 * ข้อความในห้องที่ผู้ใช้คนนี้อ่านได้: เฉพาะข้อความตั้งแต่ตอนที่เขาเข้าห้อง (เหมือนเสียงที่ไม่มีใครได้ยินย้อนหลัง)
 * คนที่เข้ามาทีหลังจึงไม่เห็นสิ่งที่คนอื่นคุยกันไว้ก่อน เช่น ห้อง 1-1 ที่มีคนสุ่มเข้ามาแทนคนที่ออกไป
 * ออกแล้วเข้าใหม่ joinedAt ถูกตั้งใหม่ (room.service addMemberTx) จึงเห็นเฉพาะข้อความหลังเข้ารอบล่าสุด
 */
export const listMessages = async (roomId, userId, { before, limit = 50 } = {}) => {
  const member = await assertActiveMember(roomId, userId);
  const createdAt = { gte: member.joinedAt, ...(before ? { lt: new Date(before) } : {}) };
  const rows = await prisma.message.findMany({
    where: { roomId, isHidden: false, createdAt },
    include,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return rows.reverse().map(presentMessage);
};

export const sendMessage = async (roomId, userId, { type, content }) => {
  await assertActiveMember(roomId, userId);
  const message = await prisma.message.create({ data: { roomId, userId, type, content }, include });
  const presented = presentMessage(message);
  emitToRoom(roomId, 'chat:message', presented);
  return presented;
};
