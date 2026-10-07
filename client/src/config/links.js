// ลิงก์ภายนอกที่ทีมตั้งตอน deploy (client/.env หรือ Environment Variables ของ Vercel)
// ถ้าไม่ตั้ง ปุ่มหรือข้อความที่พาไปลิงก์นั้นจะไม่แสดง: ห้ามชวนผู้ใช้ไปที่ที่ไม่มีอยู่จริง
// เป็นฟังก์ชันเพื่ออ่านค่าตอนเรียกใช้ (เทสต์เปลี่ยนค่าด้วย vi.stubEnv ได้)

/** แบบประเมินความพึงพอใจ (Google Forms) ตัวชี้วัดข้อ 4.6 ข้อ 5 */
export const surveyUrl = () => import.meta.env.VITE_SURVEY_URL ?? '';

/** ช่องทางติดต่อทีมผู้ดูแล เช่น เพจ Facebook, LINE OA หรือ mailto: */
export const contactUrl = () => import.meta.env.VITE_CONTACT_URL ?? '';
