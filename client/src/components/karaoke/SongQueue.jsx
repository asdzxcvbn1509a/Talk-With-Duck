// คิวเพลงของห้อง: ทุกคนเห็นตรงกันแบบเรียลไทม์
import { ListMusic, Play, X } from 'lucide-react';
import { useState } from 'react';
import { removeSong } from '../../api/rooms';
import { errorMessage } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';
import { toast } from '../../stores/uiStore';
import DuckAvatar from '../DuckAvatar';
import { IconButton } from '../ui';

const SongQueue = ({ roomId, isHost }) => {
  const queue = useRoomStore((s) => s.queue);
  const me = useAuthStore((s) => s.user?.id);
  const [removing, setRemoving] = useState(null);

  const remove = async (song) => {
    setRemoving(song.id);
    try {
      await removeSong(roomId, song.id);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setRemoving(null);
    }
  };

  if (queue.length === 0) {
    return (
      <p className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted">
        <ListMusic size={28} /> คิวว่าง จองเพลงแรกเลยไหม?
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {queue.map((song, index) => {
        const playing = song.status === 'playing';
        const canRemove = isHost || song.requestedBy?.id === me;
        return (
          <li
            key={song.id}
            className={`flex items-center gap-3 rounded-2xl p-2 ${playing ? 'bg-duck-100 ring-2 ring-duck-300 dark:bg-surface-2' : ''}`}
          >
            <span className="flex w-6 shrink-0 justify-center font-display text-muted">
              {playing ? (
                <Play size={14} fill="currentColor" className="text-duck-700 dark:text-duck-300" />
              ) : (
                index
              )}
            </span>
            {song.thumbnail && (
              <img
                src={song.thumbnail}
                alt=""
                className="h-10 w-16 shrink-0 rounded-lg object-cover"
                loading="lazy"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{song.title}</p>
              <p className="flex items-center gap-1 text-xs text-muted">
                <DuckAvatar avatar={song.requestedBy?.avatar} size={16} />
                <span className="truncate">{song.requestedBy?.nickname}</span>
              </p>
            </div>
            {canRemove && (
              <IconButton
                icon={X}
                label={playing ? 'ข้ามเพลงนี้' : 'ลบออกจากคิว'}
                size={32}
                iconSize={16}
                disabled={removing === song.id}
                onClick={() => remove(song)}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};

export default SongQueue;
