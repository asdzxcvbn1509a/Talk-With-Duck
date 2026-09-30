// เล่นเสียงของคนอื่นในห้อง (ต้องผูก stream กับ <audio> เสมอ ทั้งเพื่อให้ได้ยิน และให้ Chrome วัดระดับเสียงได้)
// volume/muted คือค่าที่ผู้ฟังปรับเองรายคน (VolumeControl) · ปิดเสียงด้วย muted โดยไม่ถอด stream ออก
// เพราะ Chrome ต้องผูก stream กับ <audio> ไว้จึงวัดระดับเสียงได้
import { useEffect, useRef } from 'react';
import { toPlaybackVolume } from '../../lib/rtc/volume';

const RemoteAudio = ({ stream, volume = 1, muted = false }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    const start = async () => {
      try {
        await el.play?.();
      } catch {
        // เบราว์เซอร์บล็อกการเล่นอัตโนมัติ: ปล่อยให้ autoPlay ของ <audio> จัดการต่อ
      }
    };
    start();
  }, [stream]);
  useEffect(() => {
    if (ref.current) ref.current.volume = toPlaybackVolume(volume);
  }, [volume]);
  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);
  return <audio ref={ref} autoPlay playsInline />;
};

export default RemoteAudio;
