import crypto from 'node:crypto';
import { env } from '../config/env.js';

/** สตริงสุ่มสำหรับ Refresh Token */
export const randomToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('base64url');
};

/** hash แบบ HMAC-SHA256 ใช้เก็บ refresh token ในฐานข้อมูลแทนค่าจริง */
export const hmac = (value) => {
  return crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update(value).digest('hex');
};
