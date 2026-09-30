// แชทข้อความสั้น + สติกเกอร์เป็ด: ให้คนที่ยังไม่พร้อมเปิดไมค์มีส่วนร่วมได้ (ข้อ 3.5.6 ข้อ 5)
import { Send, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LIMITS, STICKERS } from '../../config/constants';
import { errorMessage } from '../../lib/api';
import { roomSession } from '../../lib/roomSession';
import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';
import { toast } from '../../stores/uiStore';
import DuckAvatar from '../DuckAvatar';
import { ReportButton } from '../ReportModal';
import { IconButton } from '../ui';

const stickerOf = (key) => STICKERS.find((s) => s.key === key);

const Message = ({ message, mine }) => {
  const time = new Date(message.createdAt).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const sticker = message.type === 'sticker' ? stickerOf(message.content) : null;
  return (
    <li className={`group flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
      {!mine && (
        <DuckAvatar avatar={message.user?.avatar} size={28} label={message.user?.nickname} />
      )}
      <div className={`flex max-w-[80%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
        {!mine && (
          <span className="mb-0.5 max-w-full truncate px-1 text-xs text-muted">
            {message.user?.nickname}
          </span>
        )}
        {sticker ? (
          <span
            className={`grid h-16 w-16 animate-pop place-items-center rounded-3xl ${sticker.tone}`}
            title={sticker.label}
            role="img"
            aria-label={`สติกเกอร์ ${sticker.label}`}
          >
            <sticker.icon size={34} strokeWidth={2.25} />
          </span>
        ) : (
          // ฟองแชทกว้างตามข้อความ: ใช้ wrap-anywhere ลิงก์ยาวจึงขึ้นบรรทัดใหม่ในฟองแทนการล้นออกไป
          <p
            className={`rounded-3xl px-4 py-2 wrap-anywhere whitespace-pre-wrap ${
              mine ? 'rounded-br-md bg-duck-300 text-[#3B2F1E]' : 'rounded-bl-md bg-surface-2'
            }`}
          >
            {message.content}
          </p>
        )}
        <span className="mt-0.5 px-1 text-[10px] text-muted">{time}</span>
      </div>
      {!mine && (
        <ReportButton
          target={{ type: 'message', id: message.id, label: 'ข้อความนี้' }}
          size={28}
          className="self-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        />
      )}
    </li>
  );
};

const ChatPanel = ({ className = '', onClose, title = 'แชทในห้อง' }) => {
  const messages = useRoomStore((s) => s.messages);
  const me = useAuthStore((s) => s.user?.id);
  const [text, setText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const send = async (type, content) => {
    setSending(true);
    try {
      await roomSession.sendMessage(type, content);
      if (type === 'text') setText('');
      setShowStickers(false);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (text.trim()) send('text', text.trim());
  };

  return (
    <section className={`flex min-h-0 flex-col ${className}`} aria-label={title}>
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="font-display text-lg">{title}</h2>
        {onClose && <IconButton icon={X} label="ปิดแชท" onClick={onClose} />}
      </header>
      <ul
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <li className="py-8 text-center text-sm text-muted">
            ยังไม่มีข้อความ พิมพ์ทักทาย หรือส่งสติกเกอร์ก็ได้นะ
          </li>
        )}
        {messages.map((m) => (
          <Message key={m.id} message={m} mine={m.user?.id === me} />
        ))}
      </ul>
      {showStickers && (
        <div
          className="grid grid-cols-4 gap-2 border-t border-line p-3"
          role="group"
          aria-label="สติกเกอร์"
        >
          {STICKERS.map((s) => (
            <button
              key={s.key}
              type="button"
              disabled={sending}
              onClick={() => send('sticker', s.key)}
              className="flex flex-col items-center gap-1 rounded-2xl py-2 transition hover:bg-surface-2 active:scale-95"
            >
              <span className={`grid h-11 w-11 place-items-center rounded-2xl ${s.tone}`}>
                <s.icon size={22} strokeWidth={2.25} />
              </span>
              <span className="text-[11px] text-muted">{s.label}</span>
            </button>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line p-3">
        <IconButton
          icon={Sparkles}
          label="สติกเกอร์"
          onClick={() => setShowStickers((v) => !v)}
          className={showStickers ? 'bg-duck-100 text-duck-700 dark:bg-surface-2' : ''}
        />
        <input
          className="input h-11 flex-1 py-2"
          placeholder="พิมพ์ข้อความ…"
          maxLength={LIMITS.messageMax}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="ข้อความ"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="ส่ง"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-duck-400 text-[#3B2F1E] transition disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </form>
    </section>
  );
};

export default ChatPanel;
