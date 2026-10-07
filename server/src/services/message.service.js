// แชทข้อความและสติกเกอร์ในห้อง: บันทึกลงฐานข้อมูลแล้วกระจายให้ทุกคนในห้องผ่าน Socket.IO
import { prisma } from '../lib/prisma.js';
import { emitToRoom } from '../realtime/hub.js';
import { presentMessage, publicUserSelect } from '../utils/present.js';
import { assertActiveMember } from './room.service.js';

const include = { user: { select: publicUserSelect } };

export const listMessages = async (roomId, userId, { before, limit = 50 } = {}) => {
  await assertActiveMember(roomId, userId);
  const rows = await prisma.message.findMany({
    where: { roomId, isHidden: false, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
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
