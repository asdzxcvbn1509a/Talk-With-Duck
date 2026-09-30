// ค่าคงที่ที่ต้องตรงกับฝั่งเว็บ (client/src/config/constants.js)

export const AVATAR_KEYS = [
  'duck-classic',
  'duck-headphones',
  'duck-glasses',
  'duck-cap',
  'duck-bow',
  'duck-scarf',
  'duck-flower',
  'duck-star',
];

export const ANONYMOUS_AVATAR = 'duck-anon';

export const STICKER_KEYS = ['clap', 'heart', 'laugh', 'cry', 'fire', 'hug', 'mic', 'star'];

export const RESERVED_NICKNAMES = ['เป็ดนิรนาม', 'admin', 'moderator', 'ผู้ดูแล'];

export const LIMITS = {
  nicknameMin: 2,
  nicknameMax: 30,
  roomNameMax: 60,
  messageMax: 500,
  questionTitleMax: 120,
  postContentMax: 2000,
  reportDetailsMax: 500,
  queuePerUser: 5,
};

// ถ้า refresh token ถูกใช้ซ้ำภายในช่วงนี้ (เช่น เปิด 2 แท็บพร้อมกัน) จะไม่ถือว่าถูกขโมย
export const REFRESH_REUSE_GRACE_MS = 10 * 1000;

export const REFRESH_COOKIE = 'twd_rt';
