// หน้าก่อนเข้าห้อง: ให้ผู้ใช้เลือกเองว่าจะเปิดไมค์หรือไม่ (เคารพขอบเขตความสบายใจ)
// การกดปุ่ม "เข้าห้อง" เป็น user gesture ที่เบราว์เซอร์ต้องการสำหรับไมค์และการเล่นเสียง
import { DoorClosed, Headphones, SearchX, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { ROOM_TYPES } from '../../config/constants';
import { errorCode, errorMessage } from '../../lib/api';
import { yearLabel } from '../../lib/format';
import DuckAvatar from '../DuckAvatar';
import { Badge, Button, EmptyState, Spinner, Toggle } from '../ui';

const JOIN_ERRORS = {
  ROOM_FULL: {
    icon: UsersRound,
    title: 'ห้องนี้เต็มแล้ว',
    body: 'ลองห้องอื่น หรือเปิดห้องใหม่ของตัวเองก็ได้นะ',
  },
  ROOM_CLOSED: {
    icon: DoorClosed,
    title: 'ห้องนี้ปิดไปแล้ว',
    body: 'ทุกคนออกจากห้องแล้ว ลองดูห้องอื่นในหน้าหลัก',
  },
  ROOM_NOT_FOUND: {
    icon: SearchX,
    title: 'ไม่พบห้องนี้',
    body: 'ลิงก์อาจไม่ถูกต้อง หรือห้องถูกลบไปแล้ว',
  },
};

const PreJoin = ({ preview, previewError, joining, joinError, onJoin, backTo = '/lobby' }) => {
  const [micOn, setMicOn] = useState(true);
  const failure = joinError ?? previewError;
  const known = JOIN_ERRORS[errorCode(failure) ?? failure?.code];

  if (known || (preview && !preview.isActive)) {
    const info = known ?? JOIN_ERRORS.ROOM_CLOSED;
    return (
      <div className="mx-auto max-w-md pt-8">
        <EmptyState
          icon={info.icon}
          title={info.title}
          action={
            <Link
              to={backTo}
              className="font-semibold text-calm-600 hover:underline dark:text-calm-300"
            >
              กลับไปเลือกห้อง
            </Link>
          }
        >
          {info.body}
        </EmptyState>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="flex justify-center py-20 text-muted">
        <Spinner />
      </div>
    );
  }

  const type = ROOM_TYPES[preview.type];
  const full = preview.memberCount >= preview.capacity;

  return (
    <div className="mx-auto max-w-md pt-4">
      <div className="card space-y-6 p-6 text-center sm:p-8">
        <div>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-duck-100 text-duck-700 dark:bg-surface-2 dark:text-duck-300">
            <type.icon size={30} />
          </span>
          <h1 className="mt-3 text-2xl font-medium">{preview.name}</h1>
          <div className="mt-2 flex justify-center gap-2">
            <Badge>{type.label}</Badge>
            <Badge tone="muted">{yearLabel(preview.yearFilter)}</Badge>
          </div>
        </div>

        <div>
          {preview.members.length > 0 ? (
            <>
              <div className="flex justify-center -space-x-3">
                {preview.members.slice(0, 6).map((m) => (
                  <DuckAvatar
                    key={m.userId}
                    avatar={m.avatar}
                    size={48}
                    className="ring-4 ring-surface"
                    label={m.nickname}
                  />
                ))}
              </div>
              <p className="mt-2 text-sm text-muted">
                {preview.members
                  .map((m) => m.nickname)
                  .slice(0, 3)
                  .join(', ')}
                {preview.members.length > 3 ? ` และอีก ${preview.members.length - 3} คน` : ''}{' '}
                อยู่ในห้อง ({preview.memberCount}/{preview.capacity})
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">ยังไม่มีใครในห้อง เข้าไปรอเพื่อนก่อนได้เลย</p>
          )}
        </div>

        <div className="rounded-2xl bg-surface-2 p-4 text-left">
          <Toggle
            id="mic-on"
            checked={micOn}
            onChange={setMicOn}
            label="เปิดไมค์ตอนเข้าห้อง"
            description={
              micOn
                ? 'เปิด-ปิดไมค์ได้ตลอดเวลาด้วยปุ่มด้านล่าง'
                : 'เข้าไปฟังเงียบ ๆ ก่อน พร้อมเมื่อไหร่ค่อยเปิดไมค์'
            }
          />
          {preview.type === 'karaoke' && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted">
              <Headphones size={16} className="shrink-0" /> แนะนำให้ใส่หูฟัง
              เสียงเพลงจะได้ไม่ย้อนเข้าไมค์
            </p>
          )}
        </div>

        {joinError && !known && (
          <p className="rounded-2xl bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
            {errorMessage(joinError, joinError.message)}
          </p>
        )}

        <Button
          size="lg"
          className="w-full"
          loading={joining}
          disabled={full}
          onClick={() => onJoin({ withMic: true, startMuted: !micOn })}
        >
          {full ? 'ห้องเต็มแล้ว' : 'เข้าห้อง'}
        </Button>
        <Link to={backTo} className="block text-sm text-muted hover:underline">
          ยังก่อน กลับไปเลือกห้อง
        </Link>
      </div>
    </div>
  );
};

export default PreJoin;
