// ตัวแสดงสถานะผู้ที่กำลังพูด (Speaking Indicator): ใช้ Web Audio API วัดความดังของแต่ละเสียง (ข้อ 3.5.5)

let sharedContext = null;

const resumeAudio = async (ctx) => {
  try {
    await ctx.resume();
  } catch {
    // เบราว์เซอร์ยังไม่ยอมเปิดเสียง: จะลองใหม่ตอนผู้ใช้กดปุ่มครั้งถัดไป
  }
};

/** ต้องเรียกจากการกดปุ่มของผู้ใช้ (เบราว์เซอร์บล็อกเสียงถ้าไม่มี user gesture) */
export const getAudioContext = () => {
  if (!sharedContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    sharedContext = Ctx ? new Ctx() : null;
  }
  if (sharedContext?.state === 'suspended') resumeAudio(sharedContext);
  return sharedContext;
};

/** ค่าความดังแบบ RMS (0–1) จากข้อมูลคลื่นเสียง */
export const rmsLevel = (samples) => {
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const x = (samples[i] - 128) / 128;
    sum += x * x;
  }
  return Math.sqrt(sum / samples.length);
};

export const SPEAKING_THRESHOLD = 0.035;

/**
 * ปัดความดังให้หยาบลงก่อนส่งให้หน้าเว็บ: เงียบ (ต่ำกว่าเกณฑ์) = 0 ที่เหลือปัดทีละ 0.02
 * ค่าจึงไม่เปลี่ยนทุกรอบ หน้าเว็บไม่ต้อง render ใหม่ตอนทุกคนเงียบ
 * (ค่าที่ปัดแล้วต่ำสุดคือ 0.04 ซึ่งยังเกินเกณฑ์ สถานะ "กำลังพูด" จึงเหมือนเดิม)
 */
export const quantizeLevel = (level) => {
  return level < SPEAKING_THRESHOLD ? 0 : Math.round(level * 50) / 50;
};

/**
 * วัดความดังของหลาย stream พร้อมกัน แล้วเรียก onLevels({ key: level }) ราว 10 ครั้งต่อวินาที
 */
export const createLevelMonitor = (onLevels) => {
  const meters = new Map(); // key -> { source, analyser, data, smooth }
  const ctx = getAudioContext();
  let timer = null;

  const tick = () => {
    const levels = {};
    for (const [key, m] of meters) {
      m.analyser.getByteTimeDomainData(m.data);
      const level = rmsLevel(m.data);
      m.smooth = m.smooth * 0.6 + level * 0.4;
      levels[key] = quantizeLevel(m.smooth);
    }
    onLevels(levels);
  };

  const remove = (key) => {
    const m = meters.get(key);
    if (!m) return;
    m.source.disconnect();
    meters.delete(key);
  };

  const add = (key, stream) => {
    if (!ctx || !stream?.getAudioTracks().length) return;
    remove(key);
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    meters.set(key, { source, analyser, data: new Uint8Array(analyser.fftSize), smooth: 0 });
    if (!timer) timer = setInterval(tick, 100);
  };

  const stop = () => {
    clearInterval(timer);
    timer = null;
    for (const key of [...meters.keys()]) remove(key);
  };

  return { add, remove, stop };
};
