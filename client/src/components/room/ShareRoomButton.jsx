// ปุ่มชวนเพื่อนที่หัวห้อง: มือถือแชร์ผ่านหน้าต่างของเครื่อง คอมพิวเตอร์คัดลอกลิงก์ (lib/share.js)
import { Link as LinkIcon, Share2 } from 'lucide-react';
import { canNativeShare, shareRoomLink } from '../../lib/share';
import { IconButton } from '../ui';

const ShareRoomButton = ({ roomName }) => {
  const mobile = canNativeShare();
  return (
    <IconButton
      icon={mobile ? Share2 : LinkIcon}
      label={mobile ? 'แชร์ลิงก์ห้อง' : 'คัดลอกลิงก์ห้อง'}
      iconSize={18}
      onClick={() => shareRoomLink(roomName)}
    />
  );
};

export default ShareRoomButton;
