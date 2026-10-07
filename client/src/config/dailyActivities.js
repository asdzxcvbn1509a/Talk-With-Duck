// การ์ดกิจกรรมประจำวันบนหน้า Lobby
// ทีมแก้วันที่/กิจกรรมของ Duck Community Week ได้ที่ไฟล์นี้ (วันที่เป็น ค.ศ. รูปแบบ YYYY-MM-DD)
// icon คือไอคอนจาก lucide-react (ค้นชื่อได้ที่ lucide.dev)
// survey: ใช้แทน title/detail/to เมื่อตั้งลิงก์แบบประเมิน (VITE_SURVEY_URL) ไว้ การ์ดจะเปิดแบบประเมินในแท็บใหม่
import {
  ClipboardCheck,
  Compass,
  Handshake,
  Heart,
  Leaf,
  MessagesSquare,
  MicVocal,
  PartyPopper,
  Sparkles,
  Sun,
  Sunrise,
  Wrench,
} from 'lucide-react';
import { surveyUrl } from './links';

export const COMMUNITY_WEEK = [
  {
    date: '2026-12-14',
    icon: PartyPopper,
    title: 'Duck Community Week วันแรก',
    detail: 'ตั้งวงคุยข้ามรุ่น: พี่ปี 4 เล่าเรื่องฝึกงานและธีสิส',
    to: '/lobby',
  },
  {
    date: '2026-12-15',
    icon: MicVocal,
    title: 'คืนนี้ร้องเพลงคลายเครียดช่วงสอบ',
    detail: 'เปิดห้องคาราโอเกะรวมทุกชั้นปี 19:00 น.',
    to: '/karaoke',
  },
  {
    date: '2026-12-16',
    icon: MessagesSquare,
    title: 'ระดมคำถาม-คำตอบ',
    detail: 'ทิ้งคำถามไว้บนบอร์ด แล้วชวนรุ่นพี่มาช่วยตอบ',
    to: '/qa',
  },
  {
    date: '2026-12-17',
    icon: Handshake,
    title: 'ห้องปีหนึ่งจับมือปีสอง',
    detail: 'แลกเปลี่ยนเทคนิคการเรียนวิชาพื้นฐาน',
    to: '/lobby',
  },
  {
    date: '2026-12-18',
    icon: Sparkles,
    title: 'ปิดท้ายสัปดาห์เป็ด',
    detail: 'ขอบคุณที่มาร่วมสัปดาห์เป็ด แวะส่งใจให้คำตอบดี ๆ บนบอร์ดก่อนปิดสัปดาห์',
    to: '/qa',
    survey: {
      icon: ClipboardCheck,
      title: 'ปิดท้ายสัปดาห์เป็ด',
      detail: 'ช่วยตอบแบบประเมินความพึงพอใจ บ่อเป็ดจะได้ดีขึ้นในเทอมหน้า',
    },
  },
];

// ข้อความประจำวันทั่วไป (วันอาทิตย์ = 0)
const WEEKDAY = [
  {
    icon: Sun,
    title: 'วันอาทิตย์สบาย ๆ',
    detail: 'แวะมานั่งฟังเพลงในห้องคาราโอเกะก่อนเริ่มสัปดาห์ใหม่',
    to: '/karaoke',
  },
  {
    icon: Sunrise,
    title: 'จันทร์นี้เริ่มต้นใหม่',
    detail: 'มีเรื่องการเรียนติดค้าง? ลองทิ้งคำถามไว้บนบอร์ด',
    to: '/qa',
  },
  {
    icon: Wrench,
    title: 'อังคารสุมหัวทำงาน',
    detail: 'เปิดห้องกลุ่มนั่งทำโปรเจกต์ด้วยกัน ไม่ต้องเปิดไมค์ก็ได้',
    to: '/lobby',
  },
  {
    icon: Compass,
    title: 'พุธนี้คุยกับรุ่นพี่',
    detail: 'เลือกห้องตามชั้นปี แล้วถามเรื่องที่อยากรู้ได้เลย',
    to: '/lobby',
  },
  {
    icon: Heart,
    title: 'พฤหัสฯ ฟังใจตัวเอง',
    detail: 'ถ้าเหนื่อย ๆ ลองคุย 1-1 กับเพื่อนที่พร้อมรับฟัง',
    to: '/lobby',
  },
  {
    icon: MicVocal,
    title: 'ศุกร์นี้ร้องให้สุด',
    detail: 'ห้องคาราโอเกะเปิดรอแล้ว ชวนเพื่อนมาร้องด้วยกัน',
    to: '/karaoke',
  },
  {
    icon: Leaf,
    title: 'เสาร์พักผ่อน',
    detail: 'แวะอ่านคำตอบดี ๆ บนบอร์ดคำถาม แล้วส่งใจให้คนตอบ',
    to: '/qa',
  },
];

const pad = (n) => String(n).padStart(2, '0');

// คืน { icon, title, detail, special } พร้อม to (หน้าในเว็บ) หรือ href (ลิงก์ภายนอก) อย่างใดอย่างหนึ่ง
export const activityFor = (date = new Date()) => {
  const key = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const special = COMMUNITY_WEEK.find((a) => a.date === key);
  if (!special) return { ...WEEKDAY[date.getDay()], special: false };

  const { survey, to, ...activity } = special;
  const href = survey && surveyUrl();
  return href
    ? { ...activity, ...survey, href, special: true }
    : { ...activity, to, special: true };
};
