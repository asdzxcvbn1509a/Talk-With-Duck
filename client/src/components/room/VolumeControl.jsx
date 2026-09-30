// ปรับเสียงของเพื่อนแต่ละคน มีผลเฉพาะเครื่องเรา (เพื่อนไม่รู้) · ค่าจำไว้ใน uiStore
// ปุ่มอยู่ใต้ชื่อใน ParticipantTile ถ้าปรับไว้จะบอกระดับบนปุ่มด้วย จะได้รู้ว่าทำไมได้ยินเบา
import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { supportsVolumeControl } from '../../lib/rtc/volume';
import { useUiStore } from '../../stores/uiStore';
import { Button, Modal, Toggle } from '../ui';

const VolumeControl = ({ member }) => {
  const { userId, nickname } = member;
  const [open, setOpen] = useState(false);
  const volume = useUiStore((s) => s.volumes[userId] ?? 1);
  const muted = useUiStore((s) => Boolean(s.mutedUsers[userId]));
  const setVolume = useUiStore((s) => s.setVolume);
  const setUserMuted = useUiStore((s) => s.setUserMuted);
  const resetVolume = useUiStore((s) => s.resetVolume);

  const percent = Math.round(volume * 100);
  const changed = muted || percent < 100;
  const Icon = muted || percent === 0 ? VolumeX : percent < 50 ? Volume1 : Volume2;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`ปรับเสียงของ ${nickname}`}
        title="ปรับเสียงของคนนี้ (เฉพาะเครื่องคุณ)"
        className={`inline-flex h-7 items-center gap-1 rounded-full px-2 text-xs font-semibold transition hover:bg-surface-2 ${muted ? 'text-danger' : changed ? 'text-ink' : 'text-muted'}`}
      >
        <Icon size={16} className="shrink-0" />
        {changed && <span>{muted ? 'ปิดเสียง' : `${percent}%`}</span>}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`เสียงของ ${nickname}`}
        footer={
          <>
            <Button variant="ghost" disabled={!changed} onClick={() => resetVolume(userId)}>
              คืนค่าเดิม
            </Button>
            <Button onClick={() => setOpen(false)}>เสร็จแล้ว</Button>
          </>
        }
      >
        <div className="space-y-4">
          {supportsVolumeControl() ? (
            <div className="flex items-center gap-3">
              <Volume1 size={20} className="shrink-0 text-muted" aria-hidden="true" />
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={percent}
                disabled={muted}
                onChange={(e) => setVolume(userId, Number(e.target.value) / 100)}
                aria-label="ระดับเสียง"
                className="flex-1 accent-duck-500 disabled:opacity-40"
              />
              <span className="w-12 text-right font-semibold tabular-nums">{percent}%</span>
            </div>
          ) : (
            <p className="rounded-2xl bg-surface-2 p-3 text-sm text-muted">
              iPhone และ iPad ไม่ให้เว็บปรับระดับเสียงรายคน (ข้อจำกัดของ iOS) แต่ปิดเสียงคนนี้ได้
            </p>
          )}
          <Toggle
            id={`mute-${userId}`}
            checked={muted}
            onChange={(value) => setUserMuted(userId, value)}
            label="ปิดเสียงคนนี้"
            description="คุณจะไม่ได้ยินเสียงของเขาจนกว่าจะเปิดอีกครั้ง"
          />
          <p className="text-sm text-muted">
            ปรับเฉพาะในเครื่องคุณ เพื่อนในห้องไม่รู้และยังได้ยินกันตามปกติ ระบบจำค่าไว้ครั้งหน้า
          </p>
        </div>
      </Modal>
    </>
  );
};

export default VolumeControl;
