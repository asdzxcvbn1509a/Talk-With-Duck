// แปลงข้อมูลจากฐานข้อมูลเป็นรูปแบบที่ส่งให้หน้าเว็บ
// กติกาสำคัญ: ห้ามส่ง email ของผู้อื่น และห้ามส่ง userId ของโพสต์แบบไม่ระบุตัวตน
import { ANONYMOUS_AVATAR } from '../config/constants.js';

export const ANONYMOUS_AUTHOR = Object.freeze({
  id: null,
  nickname: 'เป็ดนิรนาม',
  avatar: ANONYMOUS_AVATAR,
  year: null,
});

/** ฟิลด์ที่ select จากฐานข้อมูลเพื่อส่งให้ publicUser: เลือกแค่นี้ อีเมลจึงไม่มีทางหลุดไปถึงผู้ใช้อื่น */
export const publicUserSelect = { id: true, nickname: true, avatar: true, year: true };

/** ข้อมูลสาธารณะของผู้ใช้ (ไม่มีอีเมล) */
export const publicUser = (user) => {
  if (!user) return null;
  return { id: user.id, nickname: user.nickname, avatar: user.avatar, year: user.year };
};

/** ข้อมูลของผู้ใช้ที่ล็อกอินอยู่เอง (มีอีเมลของตัวเองได้) */
export const selfUser = (user) => {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatar: user.avatar,
    year: user.year,
    role: user.role,
    acceptedGuidelinesAt: user.acceptedGuidelinesAt,
    createdAt: user.createdAt,
  };
};

const authorOf = (post) => {
  return post.isAnonymous ? ANONYMOUS_AUTHOR : publicUser(post.user);
};

export const presentQuestion = (q, viewer) => {
  return {
    id: q.id,
    title: q.title,
    content: q.content,
    tagYear: q.tagYear,
    topic: q.topic,
    loveCount: q.loveCount,
    answerCount: q._count?.answers ?? 0,
    lovedByMe: Array.isArray(q.loves) ? q.loves.length > 0 : false,
    isAnonymous: q.isAnonymous,
    isMine: viewer?.id === q.userId,
    author: authorOf(q),
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
};

export const presentAnswer = (a, viewer) => {
  return {
    id: a.id,
    questionId: a.questionId,
    content: a.content,
    isAnonymous: a.isAnonymous,
    isMine: viewer?.id === a.userId,
    author: authorOf(a),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
};

export const presentMessage = (m) => {
  return {
    id: m.id,
    roomId: m.roomId,
    type: m.type,
    content: m.content,
    user: publicUser(m.user),
    createdAt: m.createdAt,
  };
};

export const presentMember = (m) => {
  return {
    userId: m.userId,
    nickname: m.user.nickname,
    avatar: m.user.avatar,
    year: m.user.year,
    isMuted: m.isMuted,
    joinedAt: m.joinedAt,
  };
};

export const presentRoom = (room) => {
  const members = (room.members ?? []).map(presentMember);
  return {
    id: room.id,
    name: room.name,
    type: room.type,
    yearFilter: room.yearFilter,
    capacity: room.capacity,
    hostId: room.hostId,
    isActive: room.isActive,
    memberCount: members.length,
    members,
    // ชื่อเพลงที่กำลังเล่นในห้องคาราโอเกะ (ไม่มีเพลง/ห้องประเภทอื่น = null)
    nowPlaying: room.songs?.[0]?.songTitle ?? null,
    createdAt: room.createdAt,
  };
};

export const presentSong = (s) => {
  return {
    id: s.id,
    roomId: s.roomId,
    videoId: s.videoId,
    title: s.songTitle,
    thumbnail: s.thumbnail,
    status: s.status,
    orderNo: s.orderNo,
    requestedBy: publicUser(s.requester),
    createdAt: s.createdAt,
  };
};
