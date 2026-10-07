// เส้นทาง /api/rtc: รายชื่อ STUN/TURN สำหรับต่อเสียง WebRTC (ข้อ 3.5.5)
import { Router } from 'express';
import * as rtc from '../controllers/rtc.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/ice-servers', requireAuth, rtc.iceServers);

export default router;
