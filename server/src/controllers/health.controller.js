// รับคำขอ /api/health: บอกว่า server ยังทำงาน (Render เรียกเป็นระยะ) และใช้ตรวจปัญหาตอน deploy
import { pingDatabase } from '../lib/prisma.js';

export const check = async (req, res, next) => {
  try {
    if (req.query.db !== undefined) await pingDatabase();
    // ?ip ใช้ตรวจว่าตั้ง TRUST_PROXY ถูกต้อง (ควรเห็น IP ของเครื่องเรา ไม่ใช่ IP ของ Vercel/Render)
    res.json({
      ok: true,
      time: new Date().toISOString(),
      ...(req.query.ip !== undefined ? { ip: req.ip } : {}),
    });
  } catch (err) {
    next(err);
  }
};
