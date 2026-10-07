// เส้นทาง /api/health: Render ใช้ตรวจว่า server ยังทำงาน · ?db ตรวจฐานข้อมูล · ?ip ตรวจค่า TRUST_PROXY
import { Router } from 'express';
import * as health from '../controllers/health.controller.js';

const router = Router();

router.get('/', health.check);

export default router;
