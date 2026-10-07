// เส้นทาง /api/reports: แจ้งรายงานเนื้อหาหรือพฤติกรรมที่ไม่เหมาะสม (ข้อ 3.5.7) · ผู้ดูแลตรวจรายงานที่ /api/admin
import { Router } from 'express';
import * as reports from '../controllers/report.controller.js';
import { requireAuth, requireGuidelines } from '../middleware/auth.js';
import { postLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { createReportBody } from '../schemas.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  requireGuidelines,
  postLimiter,
  validate({ body: createReportBody }),
  reports.create,
);

export default router;
