// สิทธิ์ของผู้ใช้ · ตั้งผู้ดูแลได้ทางฐานข้อมูลเท่านั้น (คอลัมน์ role ดู docs/api.md)
export const isModerator = (user) => user?.role === 'moderator';
