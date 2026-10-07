// ค้นหาเพลงจาก YouTube หรือวางลิงก์ แล้วเพิ่มเข้าคิว (ข้อ 3.5.6 ข้อ 2)
import { Link, Music, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { readKaraokeConfig, resolveSong, searchSongs } from '../../api/karaoke';
import { addSong } from '../../api/rooms';
import { errorMessage } from '../../lib/api';
import { toast } from '../../stores/uiStore';
import { Button, Segmented, Spinner } from '../ui';

const MODES = [
  { value: 'search', label: 'ค้นหาเพลง' },
  { value: 'link', label: 'วางลิงก์ YouTube' },
];

const Result = ({ song, onAdd, adding }) => {
  return (
    <li className="flex items-center gap-3 rounded-2xl p-2 hover:bg-surface-2">
      {song.thumbnail ? (
        <img
          src={song.thumbnail}
          alt=""
          className="h-12 w-20 shrink-0 rounded-xl object-cover"
          loading="lazy"
        />
      ) : (
        <span className="flex h-12 w-20 items-center justify-center rounded-xl bg-surface-2 text-muted">
          <Music size={20} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold">{song.title}</p>
        {song.channel && <p className="truncate text-xs text-muted">{song.channel}</p>}
      </div>
      <Button size="sm" variant="soft" icon={Plus} loading={adding} onClick={() => onAdd(song)}>
        จอง
      </Button>
    </li>
  );
};

const SongSearch = ({ roomId }) => {
  const [searchEnabled, setSearchEnabled] = useState(null);
  const [mode, setMode] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await readKaraokeConfig();
        setSearchEnabled(data.searchEnabled);
        if (!data.searchEnabled) setMode('link');
      } catch {
        setSearchEnabled(false);
      }
    };
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      if (mode === 'search') {
        const { data } = await searchSongs({ q: query.trim() });
        setResults(data.results);
        if (data.results.length === 0) toast('ไม่เจอเพลงนี้ ลองพิมพ์ชื่อศิลปินด้วยนะ');
      } else {
        const { data } = await resolveSong({ url: query.trim() });
        setResults([data.song]);
      }
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const add = async (song) => {
    setAddingId(song.videoId);
    try {
      await addSong(roomId, {
        videoId: song.videoId,
        title: song.title,
        thumbnail: song.thumbnail,
      });
      toast(`จอง “${song.title}” เข้าคิวแล้ว`, 'success');
      setResults([]);
      setQuery('');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {searchEnabled && (
        <Segmented
          label="วิธีจองเพลง"
          options={MODES}
          value={mode}
          onChange={(key) => {
            setMode(key);
            setResults([]);
          }}
        />
      )}
      <form onSubmit={submit} className="flex gap-2">
        <input
          className="input h-11 flex-1 py-2"
          placeholder={mode === 'search' ? 'ชื่อเพลง หรือ ชื่อศิลปิน' : 'https://youtu.be/...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={mode === 'search' ? 'ค้นหาเพลง' : 'ลิงก์ YouTube'}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          aria-label="ค้นหา"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-duck-400 text-on-duck disabled:opacity-40"
        >
          {loading ? (
            <Spinner size={18} />
          ) : mode === 'search' ? (
            <Search size={18} />
          ) : (
            <Link size={18} />
          )}
        </button>
      </form>
      {searchEnabled === false && (
        <p className="text-xs text-muted">คัดลอกลิงก์เพลงคาราโอเกะจาก YouTube มาวางได้เลย</p>
      )}
      {results.length > 0 && (
        <ul className="max-h-72 space-y-1 overflow-y-auto">
          {results.map((song) => (
            <Result key={song.videoId} song={song} onAdd={add} adding={addingId === song.videoId} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default SongSearch;
