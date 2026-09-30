// ปุ่มกดถูกใจ (Give Love)
import { Heart } from 'lucide-react';
import { useState } from 'react';
import { loveQuestion } from '../../api/questions';
import { errorMessage } from '../../lib/api';
import { toast } from '../../stores/uiStore';

const LoveButton = ({ question, onChange, compact = false }) => {
  const [pending, setPending] = useState(false);

  const toggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPending(true);
    try {
      const { data } = await loveQuestion(question.id);
      onChange?.(question.id, { lovedByMe: data.loved, loveCount: data.loveCount });
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={question.lovedByMe}
      aria-label={question.lovedByMe ? 'เลิกส่งใจ' : 'ส่งใจให้คำถามนี้'}
      className={`flex shrink-0 items-center gap-1 rounded-full font-semibold whitespace-nowrap transition active:scale-90 ${compact ? 'px-2.5 py-1 text-sm' : 'h-11 px-4'} ${
        question.lovedByMe
          ? 'bg-[#ffe1e8] text-[#e0487a] dark:bg-[#4a2230] dark:text-[#ff8fb0]'
          : 'text-muted hover:bg-surface-2'
      }`}
    >
      <Heart size={compact ? 16 : 20} fill={question.lovedByMe ? 'currentColor' : 'none'} />
      {question.loveCount}
      {!compact && <span className="ml-1">{question.lovedByMe ? 'ส่งใจแล้ว' : 'ส่งใจ'}</span>}
    </button>
  );
};

export default LoveButton;
