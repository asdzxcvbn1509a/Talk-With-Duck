import { Router } from 'express';
import { iceServers } from '../controllers/rtc.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import authRoutes from './auth.routes.js';
import meRoutes from './me.routes.js';
import roomRoutes from './room.routes.js';
import karaokeRoutes from './karaoke.routes.js';
import { answerRouter, questionRouter } from './question.routes.js';
import { adminRouter, reportRouter } from './report.routes.js';

const api = Router();

api.get('/health', async (req, res, next) => {
  try {
    if (req.query.db !== undefined) await prisma.$queryRaw`SELECT 1`;
    // ?ip ใช้ตรวจว่าตั้ง TRUST_PROXY ถูกต้อง (ควรเห็น IP ของเครื่องเรา ไม่ใช่ IP ของ Vercel/Render)
    res.json({
      ok: true,
      time: new Date().toISOString(),
      ...(req.query.ip !== undefined ? { ip: req.ip } : {}),
    });
  } catch (err) {
    next(err);
  }
});

api.use('/auth', authRoutes);
api.use('/me', meRoutes);
api.use('/rooms', roomRoutes);
api.use('/karaoke', karaokeRoutes);
api.use('/questions', questionRouter);
api.use('/answers', answerRouter);
api.use('/reports', reportRouter);
api.use('/admin', adminRouter);
api.get('/rtc/ice-servers', requireAuth, iceServers);

export default api;
