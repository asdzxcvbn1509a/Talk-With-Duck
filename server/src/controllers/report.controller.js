import * as reportService from '../services/report.service.js';
import * as adminService from '../services/admin.service.js';

export const create = async (req, res, next) => {
  try {
    const report = await reportService.createReport(req.user, req.valid.body);
    res.status(201).json({
      id: report.id,
      message: 'ได้รับรายงานแล้ว ผู้ดูแลจะเข้ามาตรวจสอบโดยเร็ว ขอบคุณที่ช่วยดูแลพื้นที่ปลอดภัยนะ',
    });
  } catch (err) {
    next(err);
  }
};

export const list = async (req, res, next) => {
  try {
    res.json({ reports: await reportService.listReports(req.valid.query) });
  } catch (err) {
    next(err);
  }
};

export const summary = async (_req, res, next) => {
  try {
    res.json(await reportService.reportSummary());
  } catch (err) {
    next(err);
  }
};

export const review = async (req, res, next) => {
  try {
    await reportService.reviewReport(req.user, req.valid.params.id, req.valid.body);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const bans = async (_req, res, next) => {
  try {
    res.json({ users: await reportService.listBannedUsers() });
  } catch (err) {
    next(err);
  }
};

export const unban = async (req, res, next) => {
  try {
    await reportService.unbanUser(req.valid.params.id);
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
