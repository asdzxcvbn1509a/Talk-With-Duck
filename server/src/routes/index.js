// รวมเส้นทาง REST ทั้งหมดใต้ /api: 1 path = 1 ไฟล์ routes จับคู่กับไฟล์ใน client/src/api
// (เช่น /rooms → room.routes.js ↔ client/src/api/rooms.js) ตารางเต็มอยู่ใน docs/architecture.md
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import meRoutes from './me.routes.js';
import roomRoutes from './room.routes.js';
import karaokeRoutes from './karaoke.routes.js';
import questionRoutes from './question.routes.js';
import answerRoutes from './answer.routes.js';
import reportRoutes from './report.routes.js';
import adminRoutes from './admin.routes.js';
import rtcRoutes from './rtc.routes.js';
import healthRoutes from './health.routes.js';

const api = Router();

api.use('/auth', authRoutes);
api.use('/me', meRoutes);
api.use('/rooms', roomRoutes);
api.use('/karaoke', karaokeRoutes);
api.use('/questions', questionRoutes);
api.use('/answers', answerRoutes);
api.use('/reports', reportRoutes);
api.use('/admin', adminRoutes);
api.use('/rtc', rtcRoutes);
api.use('/health', healthRoutes);

export default api;
