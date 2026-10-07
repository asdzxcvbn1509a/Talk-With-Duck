// ช่องทางขอความช่วยเหลือ: แสดงในกล่องสายด่วน (components/CrisisSupport.jsx) และหน้าผู้ดูแล
// แก้เบอร์ที่ไฟล์นี้ที่เดียว · icon คือไอคอนจาก lucide-react
import { Ambulance, Mail, MessageSquareHeart, Phone } from 'lucide-react';

/** สายด่วนเมื่อมีความคิดทำร้ายตัวเองหรือเหตุฉุกเฉิน */
export const HOTLINES = [
  {
    key: 'dmh',
    icon: Phone,
    label: 'สายด่วนสุขภาพจิต กรมสุขภาพจิต',
    number: '1323',
    note: 'ฟรี ตลอด 24 ชั่วโมง',
  },
  { key: 'ems', icon: Ambulance, label: 'เหตุฉุกเฉินทางการแพทย์', number: '1669' },
];

// บริการให้คำปรึกษาของมหาวิทยาลัย: ข้อมูลจากเว็บสำนักงานกิจการนักศึกษา (sao.kmutt.ac.th)
// ทีมต้องโทรเช็กเบอร์ก่อนเปิดใช้จริงทุกเทอม (docs/deploy.md ข้อ 8)
export const KMUTT_COUNSELING = {
  name: 'บริการให้คำปรึกษานักศึกษา มจธ. (สำนักงานกิจการนักศึกษา)',
  phone: '0-2470-8105',
  contacts: [
    { key: 'phone', icon: Phone, label: 'โทรนัดหรือปรึกษา 0-2470-8105', href: 'tel:024708105' },
    { key: 'email', icon: Mail, label: 'cps@kmutt.ac.th', href: 'mailto:cps@kmutt.ac.th' },
    {
      key: 'facebook',
      icon: MessageSquareHeart,
      label: 'Facebook: counsellingkmutt',
      href: 'https://www.facebook.com/counsellingkmutt',
      external: true,
    },
  ],
};
