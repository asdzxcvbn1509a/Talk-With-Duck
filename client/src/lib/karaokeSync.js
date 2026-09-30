// คำนวณตำแหน่งเพลงที่ "ควรจะเป็น" เพื่อให้ทุกคนในห้องได้ยินเพลงตรงจังหวะเดียวกัน (ข้อ 3.5.6 ข้อ 3)

export const DRIFT_TOLERANCE_SEC = 1;

/**
 * @param {{position:number, playing:boolean, serverTime:number}} state  สถานะล่าสุดจาก host
 * @param {number} clientNow  Date.now() ของเครื่องเรา
 * @param {number} clockOffset  เวลา server - เวลาเครื่องเรา (ms)
 */
export const expectedPosition = (state, clientNow, clockOffset = 0) => {
  if (!state) return 0;
  if (!state.playing) return state.position;
  const serverNow = clientNow + clockOffset;
  return state.position + Math.max(0, serverNow - state.serverTime) / 1000;
};

/** คลาดเกินค่าที่ยอมรับได้หรือไม่ */
export const needsSeek = (currentSec, expectedSec, tolerance = DRIFT_TOLERANCE_SEC) => {
  return Math.abs(currentSec - expectedSec) > tolerance;
};

/** ห้องเล่นเลยท้ายเพลงไปแล้ว (เหลือไม่ถึงค่าที่ยอมรับได้ก็นับว่าจบ) · ยังไม่รู้ความยาวเพลง (0) = ยังไม่จบ */
export const songOver = (expectedSec, durationSec, tolerance = DRIFT_TOLERANCE_SEC) => {
  return durationSec > 0 && expectedSec >= durationSec - tolerance;
};
