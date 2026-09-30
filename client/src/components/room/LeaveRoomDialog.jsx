// หน้าต่างยืนยันก่อนออกจากห้อง (ใช้คู่กับ hooks/useLeaveRoomGuard)
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';
import { Button, Modal } from '../ui';

const byJoinedAt = (a, b) => new Date(a.joinedAt) - new Date(b.joinedAt);

// บอกผลของการออกให้ชัด: ห้องจะปิดไหม / สิทธิ์เจ้าของห้องย้ายไปให้ใคร (ตรงกับ leaveRoom ฝั่ง server)
const leaveMessage = ({ me, hostId, members }) => {
  const others = members.filter((m) => m.userId !== me).sort(byJoinedAt);
  if (others.length === 0) return 'คุณเป็นคนสุดท้ายในห้อง ห้องจะปิดเมื่อคุณออก';
  if (hostId === me) {
    return `สิทธิ์เจ้าของห้องจะย้ายไปให้ “${others[0].nickname}” ซึ่งอยู่ในห้องนานที่สุด`;
  }
  return 'ไมค์จะถูกปิด และเพื่อน ๆ ในห้องจะเห็นว่าคุณออกไปแล้ว';
};

const LeaveRoomDialog = ({ open, leaving = false, onStay, onConfirm }) => {
  const me = useAuthStore((s) => s.user?.id);
  const hostId = useRoomStore((s) => s.hostId);
  const members = useRoomStore((s) => s.members);

  return (
    <Modal
      open={open}
      onClose={leaving ? undefined : onStay}
      title="ออกจากห้องนี้ใช่ไหม?"
      footer={
        <>
          <Button variant="soft" onClick={onStay} disabled={leaving}>
            อยู่ในห้องต่อ
          </Button>
          <Button variant="danger" icon={LogOut} loading={leaving} onClick={onConfirm}>
            ออกจากห้อง
          </Button>
        </>
      }
    >
      <p className="text-muted">{leaveMessage({ me, hostId, members })}</p>
    </Modal>
  );
};

export default LeaveRoomDialog;
