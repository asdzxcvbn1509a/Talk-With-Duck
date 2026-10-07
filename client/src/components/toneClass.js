// สีพื้นอ่อน + สีตัวอักษรที่ใช้ร่วมกันระหว่างป้าย <Badge> (ui.jsx) กับสติกเกอร์ในแชท (STICKERS ใน config/constants.js)
// ทุกค่าเป็น token ของ index.css จึงเปลี่ยนตามโหมดมืดให้เอง · แก้สีของป้ายกับสติกเกอร์ที่นี่ที่เดียว
export const TONE_CLASS = {
  duck: 'bg-duck-100 text-duck-800 dark:bg-duck-700/30 dark:text-duck-200',
  calm: 'bg-calm-100 text-calm-700 dark:bg-calm-700/30 dark:text-calm-200',
  beak: 'bg-beak-300/30 text-beak-700 dark:text-beak-300',
  love: 'bg-love-soft text-love',
  muted: 'bg-surface-2 text-muted',
  danger: 'bg-danger-soft text-danger',
};
