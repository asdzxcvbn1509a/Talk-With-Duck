// สร้างตัวจัดรูปแบบวันเวลาครั้งเดียวแล้วใช้ซ้ำ
// (toLocaleTimeString/toLocaleDateString สร้างตัวใหม่ทุกครั้งที่เรียก ช้าเมื่อแสดงหลายร้อยรายการ เช่น แชท)
const clockFormat = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' });
const dateFormat = new Intl.DateTimeFormat('th-TH', {
  day: 'numeric',
  month: 'short',
  year: '2-digit',
});

// แสดงเวลาแบบ "เมื่อ 5 นาทีที่แล้ว"
export const timeAgo = (date, now = Date.now()) => {
  const diff = Math.max(0, now - new Date(date).getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'เมื่อสักครู่';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${Math.max(1, min)} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ชั่วโมงที่แล้ว`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} วันที่แล้ว`;
  return dateFormat.format(new Date(date));
};

// แสดงเวลาแบบ "14:05" (เวลาของข้อความในแชท)
export const clockTime = (date) => {
  return clockFormat.format(new Date(date));
};

export const yearLabel = (year) => {
  return year ? `ปี ${year}` : 'ทุกชั้นปี';
};

// แสดงวันที่แบบ "14 ธ.ค. 69"
export const shortDate = (date) => {
  return dateFormat.format(new Date(date));
};

const pad = (n) => String(n).padStart(2, '0');

// วันที่ตามเวลาของเครื่องแบบ YYYY-MM-DD (ค่าที่ <input type="date"> ใช้)
export const localYmd = (date = new Date()) => {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * ช่วงวันตามเวลาของเครื่อง (ใช้กับสถิติในหน้าผู้ดูแล) รับวันที่แบบ YYYY-MM-DD เช่น จาก <input type="date">
 * คืน { from, to } เป็น ISO string: from = เที่ยงคืนของวันแรก, to = เที่ยงคืนของวันถัดจากวันสุดท้าย (ไม่รวม)
 */
export const dayRange = (fromYmd, toYmd) => {
  // ไม่ใส่ timezone ท้ายวันที่ = เวลาตามเครื่องของผู้ใช้
  const start = new Date(`${fromYmd}T00:00:00`);
  const end = new Date(`${toYmd}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
};
