// จำกัดความถี่การเรียก API กันการยิงรัว ๆ (ปิดตอนรันเทสต์)
// byUser: นับต่อบัญชีเมื่อล็อกอินแล้ว คนที่ใช้เน็ตมหาวิทยาลัย (IP เดียวกัน) จึงไม่โดนจำกัดรวมกัน
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env.js';

const limiter = ({ windowMs, limit, byUser = false }) => {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.isTest,
    keyGenerator: (req) => (byUser && req.user ? `u:${req.user.id}` : ipKeyGenerator(req.ip)),
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'TOO_MANY_REQUESTS', message: 'ทำรายการถี่เกินไป พักสักครู่แล้วลองใหม่นะ' },
      });
    },
  });
};

// เข้าสู่ระบบด้วย Google: กันยิงคำขอรัว ๆ จาก IP เดียว
export const authLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 30 });
// ส่งข้อความในห้อง
export const chatLimiter = limiter({ windowMs: 10 * 1000, limit: 15, byUser: true });
// ตั้งกระทู้/ตอบ/รายงาน/ค้นหาเพลง
export const postLimiter = limiter({ windowMs: 60 * 1000, limit: 20, byUser: true });
// เข้าห้อง/สุ่มคุย 1-1: ทุกครั้งแจ้งทุกคนที่เปิดหน้า lobby อยู่ (สุ่มคุยยังเปิดห้องใหม่ได้ด้วย)
// ใช้งานจริงไม่ถึงนาทีละ 30 ครั้ง ที่เกินคือการกดรัว ๆ หรือสคริปต์
export const roomJoinLimiter = limiter({ windowMs: 60 * 1000, limit: 30, byUser: true });
