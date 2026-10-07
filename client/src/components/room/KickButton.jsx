// เจ้าของห้องเชิญคนที่ก่อกวนออกจากห้อง (ห้องกลุ่ม/คาราโอเกะ) · คนนั้นกลับเข้าห้องนี้ไม่ได้อีก
// ห้อง 1-1 ไม่มีปุ่มนี้: ถ้าไม่สบายใจ ออกจากห้องเองได้เลย
import { UserX } from 'lucide-react';
import { useState } from 'react';
import { confirmDialog } from '../../lib/dialog';
import { roomSession } from '../../lib/roomSession';
import { toast } from '../../stores/uiStore';

const KickButton = ({ member }) => {
  const [busy, setBusy] = useState(false);

  const kick = async () => {
    const confirmed = await confirmDialog({
      title: `เชิญ “${member.nickname}” ออกจากห้องใช่ไหม?`,
      text: 'เขาจะกลับเข้าห้องนี้ไม่ได้อีก ถ้าเขาทำผิดข้อตกลงพื้นที่ปลอดภัย กดรายงานด้วยนะ ผู้ดูแลจะได้ตรวจสอบ',
      confirmText: 'เชิญออก',
      icon: UserX,
      danger: true,
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      await roomSession.kick(member.userId);
      toast(`เชิญ ${member.nickname} ออกจากห้องแล้ว`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={kick}
      disabled={busy}
      aria-label={`เชิญ ${member.nickname} ออกจากห้อง`}
      title="เชิญออกจากห้อง"
      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted transition hover:bg-danger-soft hover:text-danger disabled:cursor-wait disabled:opacity-60"
    >
      <UserX size={16} />
    </button>
  );
};

export default KickButton;
