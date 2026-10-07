// กล่องช่องทางขอความช่วยเหลือเมื่ออยู่ในภาวะวิกฤต (แสดงในหน้าข้อตกลงและตอนรายงานเรื่องทำร้ายตัวเอง)
// เบอร์และช่องทางทั้งหมดอยู่ใน config/helpLines.js · id ใช้ลิงก์ตรงมาที่กล่องนี้ เช่น /guidelines#help
import { HeartHandshake, School } from 'lucide-react';
import { HOTLINES, KMUTT_COUNSELING } from '../config/helpLines';

const LINK_CLASS = 'text-calm-700 underline dark:text-calm-200';
const ICON_CLASS = 'mt-0.5 shrink-0 text-calm-700 dark:text-calm-300';

const CrisisSupport = ({ compact = false, id }) => {
  return (
    <aside
      id={id}
      className={`scroll-mt-20 rounded-(--radius-card) border border-calm-200 bg-calm-50 dark:border-calm-700 dark:bg-calm-700/20 ${compact ? 'p-4 text-sm' : 'p-5'}`}
    >
      <h2 className="flex items-center gap-2 text-lg font-medium text-calm-700 dark:text-calm-200">
        <HeartHandshake size={22} className="shrink-0" /> ถ้ารู้สึกไม่ไหว ไม่ต้องแบกไว้คนเดียว
      </h2>
      <p className="mt-2 text-muted">
        พื้นที่นี้เป็นการช่วยเหลือแบบเพื่อนช่วยเพื่อน ไม่ใช่การรักษาโดยผู้เชี่ยวชาญ
        ถ้าคุณหรือเพื่อนมีความคิดอยากทำร้ายตัวเอง ติดต่อได้ทันที:
      </p>
      <ul className="mt-3 space-y-1.5 font-semibold">
        {HOTLINES.map((line) => (
          <li key={line.key} className="flex items-start gap-2">
            <line.icon size={18} className={ICON_CLASS} />
            <span>
              {line.label}{' '}
              <a href={`tel:${line.number}`} className={LINK_CLASS}>
                {line.number}
              </a>
              {line.note && <span className="font-normal text-muted"> ({line.note})</span>}
            </span>
          </li>
        ))}
      </ul>

      <h3 className="mt-4 flex items-center gap-2 font-semibold">
        <School size={18} className={ICON_CLASS} /> อยากคุยกับนักจิตวิทยาของมหาวิทยาลัย
      </h3>
      <p className="mt-1 text-muted">
        {KMUTT_COUNSELING.name} ปรึกษาได้ทั้งเรื่องเรียน เพื่อน ครอบครัว และความเครียด
      </p>
      <ul className="mt-2 space-y-1.5">
        {KMUTT_COUNSELING.contacts.map((contact) => (
          <li key={contact.key} className="flex items-start gap-2">
            <contact.icon size={18} className={ICON_CLASS} />
            <a
              href={contact.href}
              className={`break-all ${LINK_CLASS}`}
              {...(contact.external && { target: '_blank', rel: 'noopener noreferrer' })}
            >
              {contact.label}
              {contact.external && <span className="sr-only"> (เปิดในแท็บใหม่)</span>}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default CrisisSupport;
