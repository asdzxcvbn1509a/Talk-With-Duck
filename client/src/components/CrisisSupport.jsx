// กล่องช่องทางขอความช่วยเหลือเมื่ออยู่ในภาวะวิกฤต (แสดงในหน้าข้อตกลงและตอนรายงานเรื่องทำร้ายตัวเอง)
import { Ambulance, HeartHandshake, Phone } from 'lucide-react';

const CrisisSupport = ({ compact = false }) => {
  return (
    <aside
      className={`rounded-(--radius-card) border border-calm-200 bg-calm-50 dark:border-calm-700 dark:bg-calm-700/20 ${compact ? 'p-4 text-sm' : 'p-5'}`}
    >
      <h2 className="flex items-center gap-2 text-lg font-medium text-calm-700 dark:text-calm-200">
        <HeartHandshake size={22} className="shrink-0" /> ถ้ารู้สึกไม่ไหว ไม่ต้องแบกไว้คนเดียว
      </h2>
      <p className="mt-2 text-muted">
        พื้นที่นี้เป็นการช่วยเหลือแบบเพื่อนช่วยเพื่อน ไม่ใช่การรักษาโดยผู้เชี่ยวชาญ
        ถ้าคุณหรือเพื่อนมีความคิดอยากทำร้ายตัวเอง ติดต่อได้ทันที:
      </p>
      <ul className="mt-3 space-y-1.5 font-semibold">
        <li className="flex items-start gap-2">
          <Phone size={18} className="mt-0.5 shrink-0 text-calm-700 dark:text-calm-300" />
          <span>
            สายด่วนสุขภาพจิต กรมสุขภาพจิต{' '}
            <a href="tel:1323" className="text-calm-700 underline dark:text-calm-200">
              1323
            </a>{' '}
            <span className="font-normal text-muted">(ฟรี ตลอด 24 ชั่วโมง)</span>
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Ambulance size={18} className="mt-0.5 shrink-0 text-calm-700 dark:text-calm-300" />
          <span>
            เหตุฉุกเฉินทางการแพทย์{' '}
            <a href="tel:1669" className="text-calm-700 underline dark:text-calm-200">
              1669
            </a>
          </span>
        </li>
        <li className="font-normal text-muted">หรือติดต่อหน่วยให้คำปรึกษานักศึกษาของมหาวิทยาลัย</li>
      </ul>
    </aside>
  );
};

export default CrisisSupport;
