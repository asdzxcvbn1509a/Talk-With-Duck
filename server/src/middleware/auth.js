// ตัวตรวจสอบสิทธิ์ (Middleware) ที่คั่นไว้ก่อนทุกเส้นทางที่ต้องเข้าสู่ระบบ (ข้อ 3.5.4)
import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { forbidden, unauthorized } from '../utils/httpError.js';

export const loadUserFromToken = async (token) => {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    throw unauthorized(
      err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    );
  }
  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user) throw unauthorized('INVALID_TOKEN');
  if (user.isBanned)
    throw forbidden('BANNED', 'บัญชีนี้ถูกระงับการใช้งานเนื่องจากทำผิดข้อตกลงของคอมมูนิตี้');
  return user;
};

export const requireAuth = async (req, _res, next) => {
  try {
    const header = req.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw unauthorized('NO_TOKEN');
    req.user = await loadUserFromToken(token);
    next();
  } catch (err) {
    next(err);
  }
};

/** ต้องกดยอมรับข้อตกลงการใช้งาน (Community Guidelines) ก่อนใช้ฟังก์ชันคอมมูนิตี้ */
export const requireGuidelines = (req, _res, next) => {
  if (!req.user.acceptedGuidelinesAt) {
    throw forbidden('GUIDELINES_REQUIRED', 'กรุณาอ่านและยอมรับข้อตกลงการใช้งานก่อน');
  }
  next();
};

export const requireModerator = (req, _res, next) => {
  if (req.user.role !== 'moderator') throw forbidden('MODERATOR_ONLY', 'เฉพาะผู้ดูแลคอมมูนิตี้');
  next();
};
