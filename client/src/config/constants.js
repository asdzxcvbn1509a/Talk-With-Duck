// ค่าคงที่ที่ต้องตรงกับฝั่ง server (server/src/config/constants.js)
import {
  BookOpen,
  Briefcase,
  FaceGrinning,
  FaceSlightlyFrowning,
  Flame,
  Heart,
  HeartHandshake,
  MessageCircle,
  MessagesSquare,
  MicVocal,
  Sprout,
  Star,
  ThumbsUp,
  Users,
  Wrench,
} from 'lucide-react';

// อวาตาร์เป็ด: สีตัว + ของตกแต่ง (วาดด้วย SVG ใน components/DuckAvatar.jsx)
export const AVATARS = [
  { key: 'duck-classic', label: 'เป็ดคลาสสิก', body: '#FFD35C', accessory: 'none' },
  { key: 'duck-headphones', label: 'เป็ดสายฟัง', body: '#FFC93C', accessory: 'headphones' },
  { key: 'duck-glasses', label: 'เป็ดแว่น', body: '#FFE38A', accessory: 'glasses' },
  { key: 'duck-cap', label: 'เป็ดหมวกแก๊ป', body: '#FFD35C', accessory: 'cap' },
  { key: 'duck-bow', label: 'เป็ดโบว์', body: '#FFE9A8', accessory: 'bow' },
  { key: 'duck-scarf', label: 'เป็ดผ้าพันคอ', body: '#F9D56E', accessory: 'scarf' },
  { key: 'duck-flower', label: 'เป็ดดอกไม้', body: '#FFE38A', accessory: 'flower' },
  { key: 'duck-star', label: 'เป็ดดาว', body: '#FFC93C', accessory: 'star' },
];

export const ANONYMOUS_AVATAR = 'duck-anon';

// สีพื้น/สีไอคอนของสติกเกอร์ (ใช้ร่วมกับ StickerBadge ใน ChatPanel)
const STICKER_TONES = {
  duck: 'bg-duck-100 text-duck-800 dark:bg-duck-700/30 dark:text-duck-200',
  beak: 'bg-beak-300/30 text-beak-700 dark:text-beak-300',
  calm: 'bg-calm-100 text-calm-700 dark:bg-calm-700/30 dark:text-calm-200',
  // สีหัวใจเป็น token (index.css) โหมดมืดเปลี่ยนสีให้เอง
  love: 'bg-love-soft text-love',
};

// key ต้องตรงกับ STICKER_KEYS ของ server (เก็บลงฐานข้อมูล) ส่วนไอคอน/label เปลี่ยนได้
export const STICKERS = [
  { key: 'clap', icon: ThumbsUp, label: 'เยี่ยม', tone: STICKER_TONES.duck },
  { key: 'heart', icon: Heart, label: 'ส่งใจ', tone: STICKER_TONES.love },
  { key: 'laugh', icon: FaceGrinning, label: 'ขำ', tone: STICKER_TONES.duck },
  { key: 'cry', icon: FaceSlightlyFrowning, label: 'ซึ้ง', tone: STICKER_TONES.calm },
  { key: 'fire', icon: Flame, label: 'ไฟลุก', tone: STICKER_TONES.beak },
  { key: 'hug', icon: HeartHandshake, label: 'กอด', tone: STICKER_TONES.love },
  { key: 'mic', icon: MicVocal, label: 'ร้องต่อ!', tone: STICKER_TONES.calm },
  { key: 'star', icon: Star, label: 'สุดยอด', tone: STICKER_TONES.beak },
];

export const YEARS = [1, 2, 3, 4];

// หัวข้อที่แต่ละชั้นปีมักคุยกัน (ข้อ 1.5 และโครงการ.md)
export const YEAR_HINTS = {
  1: 'ปรับตัว วิชาพื้นฐาน กิจกรรมสาขา',
  2: 'วิชาเอก เริ่มทำโปรเจกต์เฉพาะทาง',
  3: 'เนื้อหาเข้มข้น เตรียมหาที่ฝึกงาน',
  4: 'ธีสิส/Senior Project พอร์ต เส้นทางอาชีพ',
};

export const ROOM_TYPES = {
  private: { label: 'คุย 1-1', icon: MessageCircle, description: 'คุยตัวต่อตัว เป็นส่วนตัว' },
  group: { label: 'ห้องกลุ่ม', icon: Users, description: 'นั่งคุยเล่น สุมหัวทำงาน' },
  karaoke: { label: 'คาราโอเกะ', icon: MicVocal, description: 'เปิดเพลง ร้องด้วยกัน' },
};

export const TOPICS = {
  study: { label: 'การเรียน', icon: BookOpen },
  project: { label: 'โปรเจกต์', icon: Wrench },
  internship: { label: 'ฝึกงาน/อาชีพ', icon: Briefcase },
  life: { label: 'ชีวิตมหาลัย', icon: Sprout },
  other: { label: 'อื่น ๆ', icon: MessagesSquare },
};

export const REPORT_REASONS = {
  harassment: 'คุกคาม/กลั่นแกล้ง',
  hate: 'ถ้อยคำรุนแรง/ล้อเลียนปมด้อย',
  sexual: 'คุกคามทางเพศ',
  spam: 'สแปม/โฆษณา',
  self_harm: 'มีความเสี่ยงทำร้ายตัวเอง',
  other: 'อื่น ๆ',
};

export const LIMITS = {
  nicknameMax: 30,
  roomNameMax: 60,
  messageMax: 500,
  questionTitleMax: 120,
  postContentMax: 2000,
};
