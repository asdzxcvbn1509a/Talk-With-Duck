// นโยบายความเป็นส่วนตัว (Anonymity & Privacy ในบทที่ 2): บอกว่าระบบเก็บอะไร ไม่เก็บอะไร ใครเห็นอะไร
// และลบบัญชีได้ที่ไหน · เปิดได้โดยไม่ต้องเข้าสู่ระบบ จะได้อ่านก่อนตัดสินใจใช้งาน
// เขียนเฉพาะสิ่งที่ระบบทำจริง ถ้าแก้การเก็บข้อมูลหรือย้ายที่ deploy ต้องแก้หน้านี้ด้วย
import {
  ArrowLeft,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  HardDrive,
  LockKeyhole,
  Target,
  UserCog,
} from 'lucide-react';
import { Link } from 'react-router';
import { PageTitle } from '../components/ui';
import { contactUrl } from '../config/links';
import { useAuthStore } from '../stores/authStore';

const UPDATED_AT = '8 ตุลาคม 2569';

const SECTIONS = [
  {
    icon: Database,
    title: 'ข้อมูลที่เก็บ',
    items: [
      'อีเมลและรหัสบัญชี Google ใช้ยืนยันว่าเป็นคุณตอนเข้าสู่ระบบ',
      'ชื่อเล่น ชั้นปี และน้องเป็ดที่คุณเลือก',
      'สิ่งที่คุณโพสต์: คำถาม คำตอบ ข้อความและสติกเกอร์ในห้อง การส่งใจ และเพลงที่จอง',
      'ประวัติการเข้าห้อง (ห้องไหน เข้าและออกเมื่อไร) ใช้นับสถิติของโครงการ',
      'รายงานที่คุณส่งให้ผู้ดูแล',
    ],
  },
  {
    icon: EyeOff,
    title: 'ข้อมูลที่ไม่เก็บ',
    items: [
      'ชื่อจริงและรูปโปรไฟล์จากบัญชี Google',
      'เสียงที่คุยกัน: เสียงส่งตรงระหว่างเครื่องแบบเข้ารหัส บางสายต้องผ่านเซิร์ฟเวอร์ส่งต่อ (TURN) แต่ไม่มีการบันทึกเสียงไว้ที่ไหนเลย',
    ],
  },
  {
    icon: Eye,
    title: 'ใครเห็นอะไร',
    items: [
      'เพื่อนในเว็บเห็นชื่อเล่น ชั้นปี และน้องเป็ดของคุณ',
      'อีเมลของคุณเห็นแค่คุณคนเดียว ผู้ดูแลก็ไม่เห็น',
      'โพสต์แบบไม่เปิดเผยตัวตน: เพื่อนไม่รู้ว่าใครโพสต์ แต่ถ้าโพสต์นั้นถูกรายงาน ผู้ดูแลจะเห็นชื่อเล่นของเจ้าของ เพื่อจัดการตามข้อตกลงพื้นที่ปลอดภัย',
    ],
  },
  {
    icon: Target,
    title: 'ใช้ข้อมูลทำอะไร',
    items: [
      'ให้ระบบทำงาน เช่น เข้าห้อง แชท ตั้งคำถาม และตอบคำถาม',
      'ดูแลพื้นที่ปลอดภัย: ตรวจรายงาน ซ่อนเนื้อหา หรือระงับบัญชีที่ทำผิดข้อตกลง',
      'นับสถิติภาพรวมสำหรับรายงานผลโครงการรายวิชา เช่น จำนวนห้องและจำนวนคำถาม โดยไม่ระบุว่าเป็นใคร',
    ],
  },
  {
    icon: HardDrive,
    title: 'ข้อมูลอยู่ที่ไหน',
    items: [
      'ฐานข้อมูลอยู่บน Supabase และเซิร์ฟเวอร์อยู่บน Render (ภูมิภาคสิงคโปร์) ส่วนหน้าเว็บอยู่บน Vercel',
      'ข้อมูลอยู่ในระบบจนกว่าคุณจะลบเอง หรือลบบัญชี',
      'ในเบราว์เซอร์ของคุณ: cookie สำหรับจำการเข้าสู่ระบบ (ไม่เกิน 30 วัน) และค่าที่ตั้งไว้ในเครื่อง เช่น โหมดสี และระดับเสียงของเพื่อนแต่ละคน',
      'ตัวเล่นเพลงในห้องคาราโอเกะเป็นของ YouTube ซึ่งใช้นโยบายความเป็นส่วนตัวของ Google',
    ],
  },
  {
    icon: UserCog,
    title: 'สิ่งที่คุณทำได้',
    items: [
      'แก้ชื่อเล่น ชั้นปี และน้องเป็ดได้ที่หน้า “ฉัน”',
      'แก้ไขหรือลบคำถามและคำตอบของตัวเองได้',
      'ลบบัญชีถาวรได้ที่หน้า “ฉัน” ข้อมูลของคุณจะถูกลบทั้งหมด ยกเว้นรายงานที่เคยส่ง ซึ่งยังอยู่ให้ผู้ดูแลจัดการต่อโดยไม่บอกว่าใครส่ง',
    ],
  },
];

const PrivacyPage = () => {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 pt-6 pb-12">
      <PageTitle title="นโยบายความเป็นส่วนตัว" />
      <Link to={user ? '/me' : '/login'} className="link inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft size={16} /> {user ? 'กลับไปหน้า “ฉัน”' : 'กลับไปหน้าเข้าสู่ระบบ'}
      </Link>

      <header className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-calm-100 text-calm-700 dark:bg-calm-700/30 dark:text-calm-200">
          <LockKeyhole size={32} />
        </span>
        <h1 className="mt-3 text-3xl font-medium">นโยบายความเป็นส่วนตัว</h1>
        <p className="mt-2 text-muted">บ่อเป็ดเก็บข้อมูลเท่าที่จำเป็น และไม่ใช้ชื่อจริงของคุณ</p>
      </header>

      <div className="space-y-3">
        {/* ไอคอนอยู่แถวเดียวกับหัวข้อ รายการด้านล่างจะได้กว้างเต็มการ์ด (จอ 320px ข้อความยาวไม่ต้องขึ้นบรรทัดใหม่บ่อย) */}
        {SECTIONS.map((section) => (
          <section key={section.title} className="card p-5">
            <h2 className="flex items-center gap-3 text-lg font-medium">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-duck-100 text-duck-800 dark:bg-surface-2 dark:text-duck-300"
                aria-hidden="true"
              >
                <section.icon size={20} />
              </span>
              {section.title}
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* ช่องทางติดต่อแสดงเมื่อทีมตั้ง VITE_CONTACT_URL ไว้ */}
      {contactUrl() && (
        <p className="text-center text-sm text-muted">
          มีคำถามเรื่องข้อมูลของคุณ?{' '}
          <a
            href={contactUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="link inline-flex items-center gap-1"
          >
            ติดต่อทีมผู้ดูแล
            <ExternalLink size={14} aria-hidden="true" />
            <span className="sr-only"> (เปิดในแท็บใหม่)</span>
          </a>
        </p>
      )}
      <p className="text-center text-xs text-muted">ปรับปรุงล่าสุด {UPDATED_AT}</p>
    </div>
  );
};

export default PrivacyPage;
