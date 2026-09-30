// สถานะตัวเล่นเพลงล่าสุดของแต่ละห้องคาราโอเกะ (เก็บในหน่วยความจำ ไม่ต้องลงฐานข้อมูล)
// { videoId, songId, playing, position, serverTime } · playing เป็น true เสมอ (เพลงเล่นเองจนจบ ไม่มีใครหยุดได้)

const states = new Map();

export const getKaraokeState = (roomId) => {
  return states.get(roomId) ?? null;
};

export const setKaraokeState = (roomId, state) => {
  const stored = { ...state, serverTime: Date.now() };
  states.set(roomId, stored);
  return stored;
};

export const clearKaraokeState = (roomId) => {
  states.delete(roomId);
};
