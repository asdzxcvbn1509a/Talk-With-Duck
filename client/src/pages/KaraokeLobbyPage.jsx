import { Plus } from 'lucide-react';
import { useState } from 'react';
import CreateRoomModal from '../components/CreateRoomModal';
import { YearFilter } from '../components/Filters';
import RoomCard, { RoomCardSkeleton } from '../components/RoomCard';
import { Button, EmptyState, LoadError, PageTitle, SkeletonGroup } from '../components/ui';
import { useLobbyRooms } from '../hooks/useLobbyRooms';
import { yearLabel } from '../lib/format';

const KaraokeLobbyPage = () => {
  const [year, setYear] = useState(null);
  const [creating, setCreating] = useState(false);
  const { rooms, loading, error, retry } = useLobbyRooms({ year, type: 'karaoke' });

  return (
    <div className="space-y-6">
      <PageTitle title="คาราโอเกะ" />
      <section className="relative overflow-hidden rounded-(--radius-card) bg-gradient-to-br from-beak-400 via-duck-400 to-duck-300 p-6 text-on-duck sm:p-8">
        <p className="font-semibold opacity-80">Duck Karaoke Lounge</p>
        <h1 className="mt-1 max-w-md text-3xl font-medium">เหนื่อยนักก็มาร้องเพลงกัน</h1>
        <p className="mt-2 max-w-md opacity-80">
          เปิดเพลงจาก YouTube ฟังพร้อมกันทั้งห้อง จะร้องเสียงดังหรือแค่ส่งสติกเกอร์เชียร์ก็ได้
        </p>
        <Button variant="calm" icon={Plus} className="mt-5" onClick={() => setCreating(true)}>
          เปิดห้องคาราโอเกะ
        </Button>
        <img
          src="/duck.svg"
          alt=""
          className="pointer-events-none absolute -right-4 -bottom-6 h-24 w-24 -rotate-6 opacity-90 select-none sm:h-36 sm:w-36"
        />
      </section>

      <YearFilter value={year} onChange={setYear} />

      {loading ? (
        <SkeletonGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <RoomCardSkeleton key={i} />
          ))}
        </SkeletonGroup>
      ) : error ? (
        // โหลดไม่สำเร็จต้องบอกตรง ๆ ไม่ใช่ขึ้นว่า "ยังไม่มีห้อง" ซึ่งไม่จริง
        <LoadError title="โหลดรายการห้องคาราโอเกะไม่สำเร็จ" message={error} onRetry={retry} />
      ) : rooms.length === 0 ? (
        <EmptyState
          mascot="duck-headphones"
          title={
            year ? `ยังไม่มีห้องคาราโอเกะของ${yearLabel(year)}` : 'ยังไม่มีห้องคาราโอเกะเปิดอยู่'
          }
          action={<Button onClick={() => setCreating(true)}>เปิดห้องแรก</Button>}
        >
          {year
            ? 'ลองดูห้องของทุกชั้นปี หรือเปิดห้องแล้วชวนเพื่อน ๆ มาร้องด้วยกัน'
            : 'เปิดห้องแล้วชวนเพื่อน ๆ มาร้องด้วยกัน'}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}

      <CreateRoomModal
        key={creating ? 'open' : 'closed'}
        open={creating}
        onClose={() => setCreating(false)}
        defaultType="karaoke"
        defaultYear={year}
        types={['karaoke']}
      />
    </div>
  );
};

export default KaraokeLobbyPage;
