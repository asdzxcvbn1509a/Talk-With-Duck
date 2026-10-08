// ห้องสนทนา: ห้อง 1-1, ห้องกลุ่ม, ห้องคาราโอเกะ และระบบเลือกห้องตามชั้นปี (ข้อ 3.5.5)
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { clearKaraokeState } from '../realtime/karaokeState.js';
import { emitToLobby, emitToRoom, emitToUser } from '../realtime/hub.js';
import { presentRoom, publicUserSelect } from '../utils/present.js';
import { badRequest, conflict, forbidden, notFound } from '../utils/httpError.js';

const userSelect = { select: publicUserSelect };

export const roomInclude = {
  members: { where: { leftAt: null }, orderBy: { joinedAt: 'asc' }, include: { user: userSelect } },
  // เพลงที่กำลังเล่น (ห้องคาราโอเกะ) ให้การ์ดในหน้า lobby บอกสถานะ "กำลังเล่น / คิวว่าง"
  // ห้องหนึ่งมีเพลงที่กำลังเล่นได้ไม่เกิน 1 เพลง (queue.service advance) จึงไม่ต้องใส่ take
  songs: { where: { status: 'playing' }, select: { songTitle: true } },
};

const capacityFor = (type) => (type === 'private' ? 2 : env.GROUP_ROOM_MAX);

const lockRoom = (tx, roomId) =>
  tx.$queryRaw`SELECT id FROM rooms WHERE id = ${roomId}::uuid FOR UPDATE`;

/** แถวสมาชิกของผู้ใช้ในห้อง (รวมคนที่ออกไปแล้ว) · db เป็น prisma หรือ tx ของ transaction ก็ได้ */
const findMember = (db, roomId, userId) =>
  db.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } });

/** ห้องปิดไปแล้ว (ใช้ทั้งตอนเข้าห้อง เชิญออก และจองเพลงใน queue.service) */
export const roomClosed = () => notFound('ROOM_CLOSED', 'ห้องนี้ปิดไปแล้ว');

/**
 * ส่งข้อมูลห้องล่าสุดไปให้ทุกคนที่เปิดหน้า lobby อยู่
 * คืนข้อมูลห้องชุดที่ส่งไป (ห้องปิดแล้ว = null) ผู้เรียกจะได้ใช้ต่อโดยไม่ต้องอ่านห้องซ้ำ
 */
export const broadcastRoomSummary = async (roomId) => {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: roomInclude });
  if (!room?.isActive) {
    emitToLobby('lobby:room-removed', { id: roomId });
    return null;
  }
  const summary = presentRoom(room);
  emitToLobby('lobby:room-upserted', summary);
  return summary;
};

export const listRooms = async ({ type, year }) => {
  const rooms = await prisma.room.findMany({
    where: { isActive: true, type, yearFilter: year },
    include: roomInclude,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return rooms.map(presentRoom);
};

export const getRoom = async (roomId) => {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: roomInclude });
  if (!room) throw notFound('ROOM_NOT_FOUND', 'ไม่พบห้องนี้');
  return presentRoom(room);
};

export const getActiveMembership = async (roomId, userId) => {
  const member = await findMember(prisma, roomId, userId);
  return member && !member.leftAt ? member : null;
};

export const assertActiveMember = async (roomId, userId) => {
  const member = await getActiveMembership(roomId, userId);
  if (!member) throw forbidden('NOT_A_MEMBER', 'ต้องเข้าห้องก่อนนะ');
  return member;
};

/** ใส่ผู้ใช้เข้าห้องภายใน transaction ที่ล็อกแถวห้องไว้แล้ว */
const addMemberTx = async (tx, roomId, userId) => {
  await lockRoom(tx, roomId);
  const room = await tx.room.findUnique({ where: { id: roomId } });
  if (!room || !room.isActive) throw roomClosed();

  const existing = await findMember(tx, roomId, userId);
  if (existing?.kickedAt) {
    throw forbidden(
      'ROOM_KICKED',
      'เจ้าของห้องเชิญคุณออกจากห้องนี้แล้ว ลองห้องอื่นหรือเปิดห้องใหม่นะ',
    );
  }
  if (existing && !existing.leftAt) return { member: existing, joined: false };

  const activeCount = await tx.roomMember.count({ where: { roomId, leftAt: null } });
  if (activeCount >= room.capacity)
    throw conflict('ROOM_FULL', 'ห้องเต็มแล้ว ลองห้องอื่นหรือเปิดห้องใหม่นะ');

  const member = await tx.roomMember.upsert({
    where: { roomId_userId: { roomId, userId } },
    create: { roomId, userId },
    update: { leftAt: null, joinedAt: new Date(), isMuted: false },
  });
  return { member, joined: true };
};

/** แจ้งว่ามีคนเข้าห้อง: หาข้อมูลสมาชิกใหม่จากข้อมูลห้องชุดที่ส่งให้ lobby ไม่ต้องอ่านสมาชิกซ้ำ */
const announceJoin = async (roomId, userId) => {
  const room = await broadcastRoomSummary(roomId);
  const member = room?.members.find((m) => m.userId === userId);
  if (member) emitToRoom(roomId, 'room:member-joined', member);
  return room;
};

/**
 * ออกจากทุกห้องที่ผู้ใช้ยังอยู่ (ย้ายเจ้าของห้องหรือปิดห้องตามปกติของ leaveRoom)
 * ใช้ตอนเข้าห้องใหม่ (อยู่ได้ทีละห้อง ยกเว้นห้องที่กำลังจะเข้า) ตอนถูกระงับบัญชี และตอนลบบัญชี
 */
export const leaveAllRooms = async (userId, { exceptRoomId } = {}) => {
  const memberships = await prisma.roomMember.findMany({
    where: { userId, leftAt: null, ...(exceptRoomId ? { roomId: { not: exceptRoomId } } : {}) },
    select: { roomId: true },
  });
  for (const { roomId } of memberships) await leaveRoom(roomId, userId);
};

export const createRoom = async (user, { name, type, yearFilter = null }) => {
  await leaveAllRooms(user.id);
  const room = await prisma.$transaction(async (tx) => {
    const created = await tx.room.create({
      data: { name, type, yearFilter, capacity: capacityFor(type), hostId: user.id },
    });
    await addMemberTx(tx, created.id, user.id);
    return created;
  });
  // ข้อมูลที่ส่งให้ lobby คือข้อมูลล่าสุดหลังสร้างห้องแล้ว จึงคืนชุดนั้นได้เลย
  return (await broadcastRoomSummary(room.id)) ?? getRoom(room.id);
};

export const joinRoom = async (roomId, userId) => {
  await leaveAllRooms(userId, { exceptRoomId: roomId });
  const { joined } = await prisma.$transaction((tx) => addMemberTx(tx, roomId, userId));
  // เพิ่งเข้าห้อง: คืนข้อมูลห้องชุดเดียวกับที่ประกาศให้ทุกคน
  // เป็นสมาชิกอยู่แล้ว (หรือห้องเพิ่งปิดไประหว่างนั้น) จึงค่อยอ่านห้องใหม่
  const room = joined ? await announceJoin(roomId, userId) : null;
  return room ?? getRoom(roomId);
};

/**
 * ออกจากห้อง (soft leave) · ถ้าไม่เหลือใครปิดห้อง · ถ้า host ออกให้คนที่อยู่นานสุดเป็น host แทน
 */
export const leaveRoom = async (roomId, userId) => {
  const result = await prisma.$transaction(async (tx) => {
    await lockRoom(tx, roomId);
    const room = await tx.room.findUnique({ where: { id: roomId } });
    const member = await findMember(tx, roomId, userId);
    if (!room || !member || member.leftAt) return null;

    await tx.roomMember.update({ where: { id: member.id }, data: { leftAt: new Date() } });
    const remaining = await tx.roomMember.findMany({
      where: { roomId, leftAt: null },
      orderBy: { joinedAt: 'asc' },
      select: { userId: true },
    });

    if (remaining.length === 0) {
      await tx.room.update({
        where: { id: roomId },
        data: { isActive: false, closedAt: new Date() },
      });
      return { closed: true, hostChanged: false };
    }
    if (room.hostId === userId || !room.hostId) {
      const hostId = remaining[0].userId;
      await tx.room.update({ where: { id: roomId }, data: { hostId } });
      return { closed: false, hostChanged: true, hostId };
    }
    return { closed: false, hostChanged: false };
  });

  if (!result) return;
  emitToRoom(roomId, 'room:member-left', { userId });
  if (result.hostChanged) emitToRoom(roomId, 'room:host-changed', { hostId: result.hostId });
  if (result.closed) {
    clearKaraokeState(roomId);
    emitToRoom(roomId, 'room:closed', { roomId });
  }
  await broadcastRoomSummary(roomId);
};

/**
 * เจ้าของห้องเชิญสมาชิกออก (ห้องกลุ่ม/คาราโอเกะ) · คนที่ถูกเชิญออกกลับเข้าห้องนี้ไม่ได้อีก
 * ห้อง 1-1 เชิญออกไม่ได้ ถ้าไม่สบายใจก็ออกจากห้องเองได้เลย
 * การเอา socket ของคนนั้นออกจากห้องอยู่ที่ room:kick ใน realtime/index.js · คืนข้อมูลห้อง
 */
export const kickMember = async (roomId, hostId, userId) => {
  if (userId === hostId) {
    throw badRequest('CANNOT_KICK_SELF', 'เชิญตัวเองออกไม่ได้ ถ้าจะไปกดออกจากห้องได้เลย');
  }
  const room = await prisma.$transaction(async (tx) => {
    await lockRoom(tx, roomId);
    const current = await tx.room.findUnique({ where: { id: roomId } });
    if (!current?.isActive) throw roomClosed();
    if (current.type === 'private') {
      throw badRequest(
        'KICK_NOT_ALLOWED',
        'ห้อง 1-1 เชิญออกไม่ได้ ถ้าไม่สบายใจ กดออกจากห้องได้เลยนะ',
      );
    }
    if (current.hostId !== hostId) {
      throw forbidden('HOST_ONLY', 'เฉพาะเจ้าของห้องที่เชิญคนออกได้');
    }
    const member = await findMember(tx, roomId, userId);
    if (!member || member.leftAt) throw notFound('MEMBER_NOT_FOUND', 'คนนี้ออกจากห้องไปแล้ว');

    const now = new Date();
    await tx.roomMember.update({ where: { id: member.id }, data: { leftAt: now, kickedAt: now } });
    return current;
  });

  // แจ้งคนที่ถูกเชิญออกก่อน หน้าเว็บของเขาจะได้ปิดห้องพร้อมบอกเหตุผล (ก่อนได้รับ room:member-left)
  emitToUser(userId, 'room:kicked', { roomId });
  emitToRoom(roomId, 'room:member-left', { userId });
  await broadcastRoomSummary(roomId);
  return room;
};

/** สุ่มจับคู่ห้อง 1-1: เข้าห้องที่มีคนรออยู่ 1 คน ถ้าไม่มีให้เปิดห้องใหม่ */
export const quickMatch = async (user, { year = null }) => {
  const candidates = await prisma.room.findMany({
    where: { isActive: true, type: 'private', ...(year ? { yearFilter: year } : {}) },
    include: roomInclude,
    orderBy: { createdAt: 'asc' },
    take: 30,
  });
  const waiting = candidates.filter(
    (r) => r.members.length === 1 && r.members[0].userId !== user.id,
  );
  for (const room of waiting) {
    try {
      return await joinRoom(room.id, user.id);
    } catch (err) {
      if (!['ROOM_FULL', 'ROOM_CLOSED'].includes(err.code)) throw err;
    }
  }
  return createRoom(user, { name: 'มาคุยกันไหม', type: 'private', yearFilter: year });
};

export const setMuted = async (roomId, userId, isMuted) => {
  const member = await getActiveMembership(roomId, userId);
  if (!member) return;
  await prisma.roomMember.update({ where: { id: member.id }, data: { isMuted } });
  emitToRoom(roomId, 'room:member-updated', { userId, isMuted });
};

/** สมาชิกที่ยังไม่ออกจากห้อง (ทุกห้อง) ให้ตัวเก็บกวาดใน realtime/presence.js ตรวจว่าใครหลุดไปแล้ว */
export const listActiveMemberships = () => {
  return prisma.roomMember.findMany({
    where: { leftAt: null },
    select: { roomId: true, userId: true, joinedAt: true },
  });
};

/**
 * เพลงที่กำลังเล่น { id, videoId } ถ้าผู้ใช้คนนี้เป็นเจ้าของห้องคาราโอเกะที่ยังเปิดอยู่ (ใช้ตรวจ karaoke:state ที่ส่งมาทาง socket)
 * ไม่ใช่เจ้าของห้อง ห้องปิดแล้ว หรือยังไม่มีเพลงเล่น = null
 */
export const hostPlayingSong = async (roomId, userId) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      hostId: true,
      type: true,
      isActive: true,
      songs: { where: { status: 'playing' }, select: { id: true, videoId: true }, take: 1 },
    },
  });
  if (!room?.isActive || room.type !== 'karaoke' || room.hostId !== userId) return null;
  return room.songs[0] ?? null;
};

/** ผู้ดูแลปิดห้องที่ถูกรายงาน */
export const closeRoom = async (roomId) => {
  await prisma.$transaction([
    prisma.roomMember.updateMany({ where: { roomId, leftAt: null }, data: { leftAt: new Date() } }),
    prisma.room.update({ where: { id: roomId }, data: { isActive: false, closedAt: new Date() } }),
  ]);
  clearKaraokeState(roomId);
  emitToRoom(roomId, 'room:closed', { roomId, reason: 'moderated' });
  await broadcastRoomSummary(roomId);
};
