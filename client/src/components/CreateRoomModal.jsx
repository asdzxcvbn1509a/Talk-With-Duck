import { useState } from 'react';
import { useNavigate } from 'react-router';
import { LIMITS, ROOM_TYPES, YEARS } from '../config/constants';
import { createRoom } from '../api/rooms';
import { errorMessage } from '../lib/api';
import { Button, Chip, Field, Modal } from './ui';
import { roomPath } from '../lib/routes';

const CreateRoomModal = ({
  open,
  onClose,
  defaultType = 'group',
  defaultYear = null,
  types = ['private', 'group', 'karaoke'],
}) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', type: defaultType, yearFilter: defaultYear });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await createRoom({ ...form, name: form.name.trim() });
      onClose();
      // สร้างห้องแล้วเข้าห้องทันที (ใช้การกดปุ่มนี้เป็น user gesture สำหรับเปิดไมค์)
      navigate(roomPath(data.room), { state: { autoJoin: true } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="เปิดห้องใหม่"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" form="create-room" loading={loading} disabled={!form.name.trim()}>
            เปิดห้องเลย
          </Button>
        </>
      }
    >
      <form id="create-room" onSubmit={submit} className="space-y-5">
        <Field label="ชื่อห้อง" htmlFor="room-name">
          <input
            id="room-name"
            className="input"
            maxLength={LIMITS.roomNameMax}
            placeholder="เช่น ปรึกษาเรื่องฝึกงาน, นั่งทำการบ้านด้วยกัน"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        {types.length > 1 && (
          <div>
            <span className="label">ประเภทห้อง</span>
            <div className="grid grid-cols-3 gap-2">
              {types.map((t) => {
                const type = ROOM_TYPES[t];
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={form.type === t}
                    onClick={() => setForm({ ...form, type: t })}
                    className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-3 text-sm transition sm:px-3 ${
                      form.type === t
                        ? 'border-duck-400 bg-duck-100 dark:bg-surface-2'
                        : 'border-line hover:border-duck-300'
                    }`}
                  >
                    <type.icon size={26} className="text-duck-700 dark:text-duck-300" />
                    <span className="font-semibold">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div>
          <span className="label">อยากคุยกับชั้นปีไหน</span>
          <div className="flex flex-wrap gap-2">
            <Chip active={!form.yearFilter} onClick={() => setForm({ ...form, yearFilter: null })}>
              ทุกชั้นปี
            </Chip>
            {YEARS.map((y) => (
              <Chip
                key={y}
                active={form.yearFilter === y}
                onClick={() => setForm({ ...form, yearFilter: y })}
              >
                ปี {y}
              </Chip>
            ))}
          </div>
        </div>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
};

export default CreateRoomModal;
