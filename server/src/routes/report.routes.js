import { Router } from 'express';
import * as reports from '../controllers/report.controller.js';
import { requireAuth, requireGuidelines, requireModerator } from '../middleware/auth.js';
import { postLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import {
  createReportBody,
  idParam,
  listReportsQuery,
  reviewReportBody,
  statsQuery,
} from '../schemas.js';

export const reportRouter = Router();
reportRouter.post(
  '/',
  requireAuth,
  requireGuidelines,
  postLimiter,
  validate({ body: createReportBody }),
  reports.create,
);

export const adminRouter = Router();
adminRouter.use(requireAuth, requireModerator);
adminRouter.get('/reports', validate({ query: listReportsQuery }), reports.list);
adminRouter.get('/reports/summary', reports.summary);
adminRouter.patch(
  '/reports/:id',
  validate({ params: idParam, body: reviewReportBody }),
  reports.review,
);
adminRouter.get('/bans', reports.bans);
adminRouter.delete('/bans/:id', validate({ params: idParam }), reports.unban);
adminRouter.get('/stats', validate({ query: statsQuery }), reports.stats);
