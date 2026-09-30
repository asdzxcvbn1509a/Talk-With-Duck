// ปรับเสียงเพื่อนรายคนผ่าน <audio>.volume (ระบบตัดเสียงสะท้อนของเบราว์เซอร์จึงยังทำงานตามปกติ)
// iPhone/iPad ไม่ยอมให้เว็บตั้งค่านี้ (ตั้งแล้วอ่านได้ 1 เสมอ) จึงให้ได้แค่ปิดเสียงด้วย muted
let supported = null;

/** เบราว์เซอร์นี้ปรับระดับเสียงของ <audio> ได้ไหม (ทดสอบครั้งเดียวแล้วจำไว้) */
export const supportsVolumeControl = () => {
  if (supported === null) {
    try {
      const probe = document.createElement('audio');
      probe.volume = 0.5;
      supported = probe.volume === 0.5;
    } catch {
      supported = false;
    }
  }
  return supported;
};

/** ระดับเสียงที่ใช้กับ <audio> ได้จริง (0–1) · ค่าเสียหาย เช่น ถูกแก้ใน localStorage ถือเป็น 100% */
export const toPlaybackVolume = (volume) =>
  Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1;
