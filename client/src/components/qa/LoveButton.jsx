// ปุ่มกดถูกใจ (Give Love)
// อัปเดตทันทีที่กด (optimistic) ไม่ต้องรอ server ตอบ ถ้าไม่สำเร็จค่อยคืนค่าเดิม · หัวใจเด้งตอนส่งใจ (micro-interaction)
import { Heart } from 'lucide-react';
import { useState } from 'react';
import { loveQuestion } from '../../api/questions';
import { toastError } from '../../lib/api';

const LoveButton = ({ question, onChange, compact = false }) => {
  const [pending, setPending] = useState(false);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    // กันกดซ้ำระหว่างรอ server (ไม่ใช้ disabled เคอร์เซอร์จะได้ไม่กระพริบเป็นเครื่องหมายห้าม)
    if (pending) return;
    const previous = { lovedByMe: question.lovedByMe, loveCount: question.loveCount };
    const loved = !previous.lovedByMe;
    onChange?.(question.id, {
      lovedByMe: loved,
      loveCount: Math.max(0, previous.loveCount + (loved ? 1 : -1)),
    });
    setPending(true);
    try {
      const { data } = await loveQuestion(question.id);
      onChange?.(question.id, { lovedByMe: data.loved, loveCount: data.loveCount });
    } catch (err) {
      onChange?.(question.id, previous);
      toastError(err);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-busy={pending}
      aria-pressed={question.lovedByMe}
      aria-label={question.lovedByMe ? 'เลิกส่งใจ' : 'ส่งใจให้คำถามนี้'}
      className={`flex shrink-0 items-center gap-1 rounded-full font-semibold whitespace-nowrap transition active:scale-90 ${compact ? 'px-2.5 py-1 text-sm' : 'h-11 px-4'} ${
        question.lovedByMe ? 'bg-love-soft text-love' : 'text-muted hover:bg-surface-2'
      }`}
    >
      {/* key เปลี่ยนตอนส่งใจ: หัวใจถูกวาดใหม่และเล่นแอนิเมชันเด้ง */}
      <Heart
        key={question.lovedByMe ? 'loved' : 'idle'}
        size={compact ? 16 : 20}
        fill={question.lovedByMe ? 'currentColor' : 'none'}
        className={question.lovedByMe ? 'animate-pop' : ''}
      />
      {question.loveCount}
      {!compact && <span className="ml-1">{question.lovedByMe ? 'ส่งใจแล้ว' : 'ส่งใจ'}</span>}
    </button>
  );
};

export default LoveButton;
