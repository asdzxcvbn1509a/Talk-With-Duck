// รับคำขอ /api/rtc: เซิร์ฟเวอร์ STUN/TURN สำหรับ WebRTC
// TURN ช่วยให้ต่อเสียงผ่าน NAT ของมือถือ/เครือข่ายมหาวิทยาลัยได้ (ตั้งค่าใน env ดู docs/deploy.md ข้อ 6)
import { env } from '../config/env.js';

export const iceServers = (_req, res, next) => {
  try {
    const servers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
    if (env.TURN_URLS) {
      servers.push({
        urls: env.TURN_URLS.split(',').map((u) => u.trim()),
        username: env.TURN_USERNAME,
        credential: env.TURN_CREDENTIAL,
      });
    }
    res.json({ iceServers: servers });
  } catch (err) {
    next(err);
  }
};
