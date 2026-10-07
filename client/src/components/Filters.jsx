// ตัวกรองด่วน (Quick Filters): ชั้นปี และประเภทห้อง
import { ROOM_TYPES, TOPICS, YEARS, YEAR_HINTS } from '../config/constants';
import { Chip } from './ui';

// จอแคบชิปล้นแถวได้ (เลื่อนซ้าย-ขวา): ขอบซ้าย/ขวาจางลงเป็นสัญญาณว่ายังมีชิปต่อ
// ขอบจางกว้างเท่า px-4 พอดี เลื่อนไปสุดแล้วชิปตัวแรก/ตัวสุดท้ายจึงไม่จาง และจอกว้างที่ไม่ล้นจะไม่เห็นความต่าง
const ChipRow = ({ label, children }) => {
  return (
    <div
      role="group"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-1rem),transparent)]"
    >
      {children}
    </div>
  );
};

export const YearFilter = ({ value, onChange, allLabel = 'ทุกชั้นปี' }) => {
  return (
    <ChipRow label="กรองตามชั้นปี">
      <Chip active={!value} onClick={() => onChange(null)}>
        {allLabel}
      </Chip>
      {YEARS.map((y) => (
        <Chip key={y} active={value === y} onClick={() => onChange(y)} title={YEAR_HINTS[y]}>
          ปี {y}
        </Chip>
      ))}
    </ChipRow>
  );
};

export const RoomTypeFilter = ({ value, onChange, types = ['private', 'group', 'karaoke'] }) => {
  return (
    <ChipRow label="กรองตามประเภทห้อง">
      <Chip active={!value} onClick={() => onChange(null)}>
        ทุกห้อง
      </Chip>
      {types.map((t) => {
        const type = ROOM_TYPES[t];
        return (
          <Chip key={t} active={value === t} onClick={() => onChange(t)}>
            <type.icon size={16} /> {type.label}
          </Chip>
        );
      })}
    </ChipRow>
  );
};

export const TopicFilter = ({ value, onChange }) => {
  return (
    <ChipRow label="กรองตามหัวข้อ">
      <Chip active={!value} onClick={() => onChange(null)}>
        ทุกหัวข้อ
      </Chip>
      {Object.entries(TOPICS).map(([key, t]) => (
        <Chip key={key} active={value === key} onClick={() => onChange(key)}>
          <t.icon size={16} /> {t.label}
        </Chip>
      ))}
    </ChipRow>
  );
};
