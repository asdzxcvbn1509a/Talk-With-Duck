// บัญชีที่ถูกระงับในหน้าผู้ดูแล แสดงเฉพาะเมื่อมี และกดปลดระงับได้
// ใช้คำว่า “ปลดระงับ” ไม่ให้สับสนกับปุ่ม “ยกเลิก” ในหน้าต่างยืนยัน
import { UserCheck, UserX } from 'lucide-react';
import { useState } from 'react';
import { unbanUser } from '../../api/admin';
import { toastError } from '../../lib/api';
import { confirmDialog } from '../../lib/dialog';
import { toast } from '../../stores/uiStore';
import DuckAvatar from '../DuckAvatar';
import { Button } from '../ui';

const BannedUsers = ({ users, onChanged }) => {
  const [busy, setBusy] = useState(null);

  const unban = async (user) => {
    const confirmed = await confirmDialog({
      title: `ปลดระงับบัญชี “${user.nickname}” ใช่ไหม?`,
      text: 'ผู้ใช้จะเข้าสู่ระบบได้อีกครั้ง ส่วนเนื้อหาที่ถูกซ่อนไว้จะยังซ่อนอยู่',
      confirmText: 'ปลดระงับ',
      icon: UserCheck,
    });
    if (!confirmed) return;
    setBusy(user.id);
    try {
      await unbanUser(user.id);
      toast(`ปลดระงับบัญชี “${user.nickname}” แล้ว`, 'success');
      onChanged();
    } catch (err) {
      toastError(err);
    } finally {
      setBusy(null);
    }
  };

  if (!users?.length) return null;
  return (
    <section className="card space-y-2 p-5">
      <h2 className="flex items-center gap-2 font-medium">
        <UserX size={20} className="shrink-0 text-danger" />
        บัญชีที่ถูกระงับ ({users.length})
      </h2>
      <ul className="divide-y divide-line">
        {users.map((user) => (
          <li key={user.id} className="flex items-center gap-3 py-2">
            <DuckAvatar avatar={user.avatar} size={32} />
            <span className="min-w-0 flex-1 truncate">
              {user.nickname} <span className="text-sm text-muted">(ปี {user.year})</span>
            </span>
            <Button
              size="sm"
              variant="soft"
              loading={busy === user.id}
              aria-label={`ปลดระงับ ${user.nickname}`}
              onClick={() => unban(user)}
            >
              ปลดระงับ
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default BannedUsers;
