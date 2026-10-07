// หน้าห้องตอนที่ยังไม่ได้อยู่ในห้อง ใช้ร่วมกันทั้งห้องคุย (RoomPage) และห้องคาราโอเกะ (KaraokeRoomPage)
// - หลุดระหว่างอยู่ในห้อง (ห้องปิด / เปิดซ้ำในแท็บอื่น / ถูกเชิญออก / เชื่อมต่อไม่สำเร็จ) → บอกสาเหตุ
// - ยังไม่ได้เข้า หรือเข้าไม่สำเร็จตั้งแต่แรก → หน้าก่อนเข้าห้อง (PreJoin แสดงสาเหตุที่เข้าไม่ได้เอง)
// lifecycle คือค่าที่ได้จาก useRoomLifecycle
import { useRoomStore } from '../../stores/roomStore';
import PreJoin from './PreJoin';
import RoomStatusScreen from './RoomStatusScreen';

const ENDED_STATUSES = ['closed', 'replaced', 'left', 'kicked'];

const RoomGate = ({ lifecycle }) => {
  const error = useRoomStore((s) => s.error);
  const { status, joining, joinError, join, backTo } = lifecycle;
  // status 'error' ที่ไม่มี joinError = หลุดหลังเข้าห้องแล้ว (เข้าไม่สำเร็จตั้งแต่แรกจะมี joinError)
  const ended = ENDED_STATUSES.includes(status) || (status === 'error' && !joinError);

  if (ended && !joining) {
    return (
      <RoomStatusScreen
        status={status}
        error={error}
        backTo={backTo}
        onRetry={() => join({ withMic: true })}
      />
    );
  }
  return <PreJoin {...lifecycle} onJoin={join} />;
};

export default RoomGate;
