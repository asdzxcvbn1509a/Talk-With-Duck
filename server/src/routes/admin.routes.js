// เส้นทาง /api/admin (เฉพาะผู้ดูแล): ตรวจรายงาน ระงับ/ปลดระงับบัญชี และสถิติตามตัวชี้วัด (ข้อ 3.5.7, 4.6)
import { Router } from 'express';
import * as admin from '../controllers/admin.controller.js';
import { requireAuth, requireModerator } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, listReportsQuery, reviewReportBody, statsQuery } from '../schemas.js';

const router = Router();

router.use(requireAuth, requireModerator);
router.get('/reports', validate({ query: listReportsQuery }), admin.listReports);
router.get('/reports/summary', admin.reportSummary);
router.patch(
  '/reports/:id',
  validate({ params: idParam, body: reviewReportBody }),
  admin.reviewReport,
);
router.get('/bans', admin.listBans);
router.delete('/bans/:id', validate({ params: idParam }), admin.unban);
router.get('/stats', validate({ query: statsQuery }), admin.stats);

export default router;
