// ตัวเลือกชั้นปีและอวาตาร์เป็ด (ใช้ตอนตั้งโปรไฟล์ครั้งแรกและหน้าโปรไฟล์)
import { Shuffle } from 'lucide-react';
import { AVATARS, YEARS, YEAR_HINTS } from '../config/constants';
import DuckAvatar from './DuckAvatar';

export const YearPicker = ({ value, onChange }) => {
  return (
    <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="ชั้นปี">
      {YEARS.map((y) => (
        <button
          key={y}
          type="button"
          role="radio"
          aria-checked={value === y}
          title={YEAR_HINTS[y]}
          onClick={() => onChange(y)}
          className={`rounded-2xl border-2 py-3 font-display text-lg transition ${
            value === y
              ? 'border-duck-400 bg-duck-100 dark:bg-surface-2'
              : 'border-line bg-surface hover:border-duck-300'
          }`}
        >
          ปี {y}
        </button>
      ))}
    </div>
  );
};

export const AvatarPicker = ({ value, onChange }) => {
  const randomize = () => {
    const others = AVATARS.filter((a) => a.key !== value);
    onChange(others[Math.floor(Math.random() * others.length)].key);
  };
  return (
    <div>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="อวาตาร์เป็ด">
        {AVATARS.map((a) => (
          <button
            key={a.key}
            type="button"
            role="radio"
            aria-checked={value === a.key}
            aria-label={a.label}
            onClick={() => onChange(a.key)}
            className={`flex items-center justify-center rounded-2xl border-2 p-1.5 transition sm:p-2 ${
              value === a.key
                ? 'border-duck-400 bg-duck-100 dark:bg-surface-2'
                : 'border-transparent hover:bg-surface-2'
            }`}
          >
            {/* จอแคบ 4 ช่องได้ไม่ถึง 52px: ย่อรูปตามช่อง ไม่ให้ชิดหรือล้นขอบ */}
            <DuckAvatar avatar={a.key} size={52} fluid />
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={randomize}
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-calm-600 hover:underline dark:text-calm-300"
      >
        <Shuffle size={16} /> สุ่มเป็ดให้หน่อย
      </button>
    </div>
  );
};
