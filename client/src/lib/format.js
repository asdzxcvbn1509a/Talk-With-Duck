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
