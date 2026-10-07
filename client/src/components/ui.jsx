// ชิ้นส่วน UI พื้นฐานที่ใช้ซ้ำทั้งแอป (ปุ่ม ชิป โมดัล ฯลฯ) — ขอบโค้งมน โทนอบอุ่น
// ไอคอนทั้งแอปใช้ lucide-react: prop `icon` รับ component เช่น <Button icon={Plus}>
import { CloudOff, RotateCw, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { buttonClass } from './buttonClass';
import DuckAvatar from './DuckAvatar';

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: IconComponent,
  className = '',
  children,
  disabled,
  ...props
}) => {
  return (
    <button
      type="button"
      className={buttonClass({ variant, size, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner size={18} />
      ) : (
        IconComponent && <IconComponent size={size === 'lg' ? 22 : 18} className="shrink-0" />
      )}
      {children}
    </button>
  );
};

export const IconButton = ({
  icon: IconComponent,
  label,
  className = '',
  size = 40,
  iconSize = 20,
  ...props
}) => {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink ${className}`}
      style={{ width: size, height: size }}
      {...props}
    >
      <IconComponent size={iconSize} />
    </button>
  );
};

export const Chip = ({ active = false, className = '', children, ...props }) => {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition ${
        active
          ? 'border-duck-400 bg-duck-400 text-on-duck'
          : 'border-line bg-surface text-muted hover:border-duck-300 hover:text-ink'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * ปุ่มเลือกแบบแถบ (segmented control) เลือกได้ทีละอย่าง เช่น วิธีเรียง สถานะรายงาน โหมดสว่าง/มืด
 * options: [{ value, label, icon? }] · ใช้ aria-pressed ไม่ใช่ role="tab" เพราะไม่ได้คุม tabpanel
 * fit: จอกว้างตั้งแต่ sm กว้างตามเนื้อหา (ไม่ยืดเต็มแถว)
 */
export const Segmented = ({ options, value, onChange, label, fit = false, className = '' }) => {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex gap-1 rounded-full bg-surface-2 p-1 text-sm font-semibold ${fit ? 'sm:w-fit' : ''} ${className}`}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            // whitespace-nowrap: ปุ่มกว้างตามข้อความ ไม่ให้คำไทยอย่าง "ตามเครื่อง" ถูกตัดเป็นสองบรรทัดในปุ่มแคบ
            className={`flex flex-1 items-center justify-center gap-1 rounded-full px-1.5 py-2 whitespace-nowrap transition ${fit ? 'sm:flex-none sm:px-4' : ''} ${
              selected ? 'bg-surface text-ink shadow' : 'text-muted hover:text-ink'
            }`}
          >
            {option.icon && <option.icon size={16} className="shrink-0" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export const Badge = ({ tone = 'duck', className = '', children }) => {
  const tones = {
    duck: 'bg-duck-100 text-duck-800 dark:bg-duck-700/30 dark:text-duck-200',
    calm: 'bg-calm-100 text-calm-700 dark:bg-calm-700/30 dark:text-calm-200',
    beak: 'bg-beak-300/30 text-beak-700 dark:text-beak-300',
    muted: 'bg-surface-2 text-muted',
    danger: 'bg-danger-soft text-danger',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
};

export const Spinner = ({ size = 24, className = '' }) => {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="กำลังโหลด"
    />
  );
};

// แถบโครงร่างระหว่างโหลด (skeleton) ใช้แทน spinner กลางจอ: เห็นรูปร่างของหน้าก่อนข้อมูลมา หน้าไม่กระโดดตอนโหลดเสร็จ
export const Skeleton = ({ className = '' }) => {
  return (
    <span
      aria-hidden="true"
      className={`block animate-pulse rounded-full bg-line/70 ${className}`}
    />
  );
};

// ครอบกลุ่ม skeleton: โปรแกรมอ่านหน้าจออ่านว่า "กำลังโหลด" ครั้งเดียว ไม่อ่านทีละแถบ
export const SkeletonGroup = ({ className = '', children }) => {
  return (
    <div role="status" aria-label="กำลังโหลด" className={className}>
      {children}
    </div>
  );
};

// icon: ไอคอน lucide-react · mascot: key ของน้องเป็ด (เช่น 'duck-headphones') ให้เป็ดเปลี่ยนท่าตามหน้า
// ถ้าไม่ส่งทั้งสองอย่างจะแสดงรูปเป็ดของแอป
export const EmptyState = ({ icon: IconComponent, mascot, title, children, action }) => {
  return (
    <div className="flex flex-col items-center gap-3 rounded-(--radius-card) border border-dashed border-line px-6 py-12 text-center">
      {mascot ? (
        <span aria-hidden="true" className="block animate-float">
          <DuckAvatar avatar={mascot} size={72} />
        </span>
      ) : IconComponent ? (
        <span className="grid h-16 w-16 animate-float place-items-center rounded-full bg-duck-100 text-duck-800 dark:bg-surface-2 dark:text-duck-300">
          <IconComponent size={30} />
        </span>
      ) : (
        <img src="/duck.svg" alt="" className="h-16 w-16 animate-float" />
      )}
      <h3 className="text-lg font-medium">{title}</h3>
      {children && <p className="max-w-sm text-sm text-muted">{children}</p>}
      {action}
    </div>
  );
};

// โหลดข้อมูลไม่สำเร็จ: บอกสาเหตุพร้อมปุ่มลองใหม่ (onRetry มักเป็น retry จาก useApiQuery)
export const LoadError = ({ title, message, onRetry }) => {
  return (
    <EmptyState
      icon={CloudOff}
      title={title}
      action={
        onRetry && (
          <Button variant="soft" icon={RotateCw} onClick={onRetry}>
            ลองใหม่
          </Button>
        )
      }
    >
      {message}
    </EmptyState>
  );
};

// ของที่กด Tab ไปถึงได้ภายในหน้าต่าง (ใช้วนโฟกัสไม่ให้หลุดไปหน้าด้านหลัง)
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal = ({ open, onClose, title, children, footer, size = 'md' }) => {
  const ref = useRef(null);
  // ผู้เรียกมักส่ง onClose เป็นฟังก์ชันใหม่ทุก render จึงเก็บตัวล่าสุดไว้ใน ref
  // effect ด้านล่างจะได้ย้ายโฟกัสเฉพาะตอนเปิด/ปิด ไม่ดึงโฟกัสไปปุ่มปิดทุกครั้งที่ re-render (เช่น ระหว่างพิมพ์)
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !ref.current) return;
      // วนโฟกัสอยู่ในหน้าต่าง: Tab ที่ตัวสุดท้ายกลับไปตัวแรก Shift+Tab ที่ตัวแรกไปตัวสุดท้าย
      const items = [...ref.current.querySelectorAll(FOCUSABLE)];
      if (items.length === 0) return;
      const inside = ref.current.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === items[0])) {
        e.preventDefault();
        items.at(-1).focus();
      } else if (!e.shiftKey && (!inside || document.activeElement === items.at(-1))) {
        e.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const previous = document.activeElement;
    ref.current?.querySelector('input, textarea, button, select')?.focus();
    // ล็อกการเลื่อนหน้าด้านหลัง: บนมือถือเลื่อนในหน้าต่างแล้วหน้าหลังไม่เลื่อนตาม
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="ปิด"
        tabIndex={-1}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        ref={ref}
        className={`relative max-h-[90dvh] w-full animate-pop overflow-y-auto overscroll-contain rounded-t-[2rem] bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[2rem] sm:pb-6 ${size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="min-w-0 text-xl font-medium">{title}</h2>
          <IconButton icon={X} label="ปิด" onClick={onClose} className="-mt-1 -mr-2" />
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export const Field = ({ label, hint, error, htmlFor, children }) => {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>
      )}
    </div>
  );
};

export const Toggle = ({ checked, onChange, label, description, id }) => {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-2xl p-1">
      <span className="relative mt-0.5 inline-flex">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-7 w-12 rounded-full bg-line transition peer-checked:bg-calm-600 peer-focus-visible:ring-4 peer-focus-visible:ring-calm-200" />
        <span className="absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
      <span>
        <span className="block font-semibold">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
    </label>
  );
};
