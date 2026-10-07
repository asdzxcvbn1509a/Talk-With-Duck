// คิวเพลงของห้อง Duck Karaoke Lounge (ข้อ 3.5.6 ข้อ 2)
import { LIMITS } from '../config/constants.js';
import { prisma } from '../lib/prisma.js';
import { clearKaraokeState } from '../realtime/karaokeState.js';
import { emitToRoom } from '../realtime/hub.js';
import { presentSong, publicUserSelect } from '../utils/present.js';
import { badRequest, forbidden, notFound, tooMany } from '../utils/httpError.js';
import { assertActiveMember, broadcastRoomSummary, roomClosed } from './room.service.js';

const include = { requester: { select: publicUserSelect } };

export const listQueue = async (roomId) => {
  const songs = await prisma.songQueue.findMany({
    where: { roomId, status: { in: ['playing', 'queued'] } },
    include,
    orderBy: { orderNo: 'asc' },
  });
  // เพลงที่กำลังเล่นอยู่บนสุดเสมอ
  return songs
    .sort((a, b) => (a.status === 'playing' ? -1 : b.status === 'playing' ? 1 : 0))
    .map(presentSong);
};

const broadcastQueue = async (roomId) => {
  const queue = await listQueue(roomId);
  emitToRoom(roomId, 'queue:updated', { roomId, queue });
  // เพลงที่กำลังเล่นอาจเปลี่ยน: อัปเดตการ์ดห้องในหน้า lobby ("กำลังเล่น: ชื่อเพลง / คิวว่าง")
  await broadcastRoomSummary(roomId);
  return queue;
};

const getKaraokeRoom = async (roomId) => {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || !room.isActive) throw roomClosed();
  if (room.type !== 'karaoke') throw badRequest('NOT_KARAOKE_ROOM', 'ห้องนี้ไม่ใช่ห้องคาราโอเกะ');
  return room;
};

/** เลื่อนคิว: เพลงที่เล่นอยู่จบ/ข้าม แล้วเอาเพลงถัดไปขึ้นมาเล่น */
const advance = async (roomId, finishedStatus) => {
  await prisma.$transaction(async (tx) => {
    await tx.songQueue.updateMany({
      where: { roomId, status: 'playing' },
      data: { status: finishedStatus },
    });
    const next = await tx.songQueue.findFirst({
      where: { roomId, status: 'queued' },
      orderBy: { orderNo: 'asc' },
    });
    if (next) await tx.songQueue.update({ where: { id: next.id }, data: { status: 'playing' } });
  });
  clearKaraokeState(roomId);
};

export const addSong = async (roomId, userId, { videoId, title, thumbnail }) => {
  await getKaraokeRoom(roomId);
  await assertActiveMember(roomId, userId);

  const mine = await prisma.songQueue.count({
    where: { roomId, requestedBy: userId, status: { in: ['playing', 'queued'] } },
  });
  if (mine >= LIMITS.queuePerUser) {
    throw tooMany(
      'QUEUE_LIMIT',
      `จองเพลงได้ไม่เกิน ${LIMITS.queuePerUser} เพลงต่อคน รอให้เพลงของคุณได้ร้องก่อนนะ`,
    );
  }

  const last = await prisma.songQueue.aggregate({ where: { roomId }, _max: { orderNo: true } });
  const playing = await prisma.songQueue.count({ where: { roomId, status: 'playing' } });
  await prisma.songQueue.create({
    data: {
      roomId,
      videoId,
      songTitle: title,
      thumbnail: thumbnail ?? null,
      requestedBy: userId,
      orderNo: (last._max.orderNo ?? 0) + 1,
      // ถ้ายังไม่มีเพลงเล่นอยู่ เพลงแรกขึ้นเล่นทันที
      status: playing === 0 ? 'playing' : 'queued',
    },
  });
  return broadcastQueue(roomId);
};

export const removeSong = async (roomId, userId, songId) => {
  const room = await getKaraokeRoom(roomId);
  const song = await prisma.songQueue.findUnique({ where: { id: songId } });
  if (!song || song.roomId !== roomId || !['playing', 'queued'].includes(song.status)) {
    throw notFound('SONG_NOT_FOUND', 'ไม่พบเพลงนี้ในคิว');
  }
  if (song.requestedBy !== userId && room.hostId !== userId) {
    throw forbidden('NOT_ALLOWED', 'ลบได้เฉพาะเพลงที่ตัวเองจอง หรือเจ้าของห้อง');
  }
  if (song.status === 'playing') await advance(roomId, 'skipped');
  else await prisma.songQueue.update({ where: { id: songId }, data: { status: 'skipped' } });
  return broadcastQueue(roomId);
};

/**
 * คนที่ถูกเชิญออกจากห้อง: เพลงที่จองไว้แต่ยังไม่ได้เล่นออกจากคิว
 * (เพลงที่กำลังเล่นอยู่ปล่อยไว้ เจ้าของห้องกดข้ามเองได้)
 */
export const dropQueuedSongs = async (roomId, userId) => {
  const { count } = await prisma.songQueue.updateMany({
    where: { roomId, requestedBy: userId, status: 'queued' },
    data: { status: 'skipped' },
  });
  if (count > 0) await broadcastQueue(roomId);
};

export const nextSong = async (roomId, userId, { reason }) => {
  const room = await getKaraokeRoom(roomId);
  if (room.hostId !== userId) throw forbidden('HOST_ONLY', 'เฉพาะเจ้าของห้องที่เปลี่ยนเพลงได้');
  await advance(roomId, reason);
  return broadcastQueue(roomId);
};
