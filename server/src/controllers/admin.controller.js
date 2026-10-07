// รับคำขอ /api/admin (เฉพาะผู้ดูแล): ตรวจรายงานผ่าน report.service · ระงับบัญชีและสถิติผ่าน admin.service
import * as adminService from '../services/admin.service.js';
import * as reportService from '../services/report.service.js';

export const listReports = async (req, res, next) => {
  try {
    res.json({ reports: await reportService.listReports(req.valid.query) });
  } catch (err) {
    next(err);
  }
};

export const reportSummary = async (_req, res, next) => {
  try {
    res.json(await reportService.reportSummary());
  } catch (err) {
    next(err);
  }
};

export const reviewReport = async (req, res, next) => {
  try {
    await reportService.reviewReport(req.user, req.valid.params.id, req.valid.body);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const listBans = async (_req, res, next) => {
  try {
    res.json({ users: await adminService.listBannedUsers() });
  } catch (err) {
    next(err);
  }
};

export const unban = async (req, res, next) => {
  try {
    await adminService.unbanUser(req.valid.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const stats = async (req, res, next) => {
  try {
    res.json({ stats: await adminService.getStats(req.valid.query) });
  } catch (err) {
    next(err);
  }
};
