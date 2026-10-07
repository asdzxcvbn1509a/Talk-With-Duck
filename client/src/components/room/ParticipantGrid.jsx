import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';
import { useUiStore } from '../../stores/uiStore';
import RemoteAudio from './RemoteAudio';
import ParticipantTile from './ParticipantTile';

/** รายชื่อผู้ร่วมห้อง + เล่นเสียงของทุกคน */
const ParticipantGrid = ({ tileSize = 88, compact = false }) => {
  const me = useAuthStore((s) => s.user);
  // ไม่อ่านระดับเสียง (levels) ที่นี่: เปลี่ยนทุก 100 ms แต่ละช่อง (ParticipantTile) อ่านของตัวเองแทน
  const members = useRoomStore((s) => s.members);
  const hostId = useRoomStore((s) => s.hostId);
  const roomType = useRoomStore((s) => s.room?.type);
  // เจ้าของห้องเชิญคนอื่นออกได้ เฉพาะห้องกลุ่มและห้องคาราโอเกะ (ห้อง 1-1 ออกจากห้องเองแทน)
  const canKick = hostId === me.id && (roomType === 'group' || roomType === 'karaoke');
  const online = useRoomStore((s) => s.online);
  const streams = useRoomStore((s) => s.streams);
  const peerStates = useRoomStore((s) => s.peerStates);
  const muted = useRoomStore((s) => s.muted);
  // ระดับเสียงเพื่อนรายคนที่ปรับไว้ในเครื่องนี้ (VolumeControl)
  const volumes = useUiStore((s) => s.volumes);
  const mutedUsers = useUiStore((s) => s.mutedUsers);

  return (
    <>
      <ul
        className={`grid gap-2 ${compact ? 'grid-cols-3 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}
      >
        {members.map((member) => {
          const isMe = member.userId === me.id;
          const view = isMe ? { ...member, isMuted: muted } : member;
          return (
            <li key={member.userId}>
              <ParticipantTile
                member={view}
                isMe={isMe}
                isHost={member.userId === hostId}
                online={isMe || online.includes(member.userId)}
                connecting={
                  !isMe &&
                  online.includes(member.userId) &&
                  peerStates[member.userId] !== 'connected'
                }
                size={tileSize}
                compact={compact}
                canKick={canKick && !isMe}
              />
            </li>
          );
        })}
      </ul>
      <div className="hidden">
        {Object.entries(streams).map(([userId, stream]) => (
          <RemoteAudio
            key={userId}
            stream={stream}
            volume={volumes[userId] ?? 1}
            muted={Boolean(mutedUsers[userId])}
          />
        ))}
      </div>
    </>
  );
};

export default ParticipantGrid;
