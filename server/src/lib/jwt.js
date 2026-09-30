// ออกและตรวจสอบ Access Token (JWT อายุสั้น) ตามข้อ 3.5.4
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const ISSUER = 'talk-with-duck';

export const signAccessToken = (user) => {
  return jwt.sign({ role: user.role, year: user.year }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.ACCESS_TOKEN_TTL,
    algorithm: 'HS256',
    issuer: ISSUER,
  });
};

/** คืนค่า { id, role, year } หรือ throw error ของ jsonwebtoken (TokenExpiredError / JsonWebTokenError) */
export const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ['HS256'],
    issuer: ISSUER,
  });
  return { id: payload.sub, role: payload.role, year: payload.year };
};
