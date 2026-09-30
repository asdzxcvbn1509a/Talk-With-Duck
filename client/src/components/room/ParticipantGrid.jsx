import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';
import { useUiStore } from '../../stores/uiStore';
import RemoteAudio from './RemoteAudio';
import ParticipantTile from './ParticipantTile';

/** รายชื่อผู้ร่วมห้อง + เล่นเสียงของทุกคน */
const ParticipantGrid = ({ tileSize = 88, compact = false }) => {
  const me = useAuthStore((s) => s.user);
  const { members, hostId, online, levels, streams, peerStates, muted } = useRoomStore();
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
                level={levels[member.userId] ?? 0}
                online={isMe || online.includes(member.userId)}
                connecting={
                  !isMe &&
                  online.includes(member.userId) &&
                  peerStates[member.userId] !== 'connected'
                }
                size={tileSize}
                compact={compact}
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
