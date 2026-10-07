// รับคำขอ /api/reports: ผู้ใช้แจ้งรายงานเนื้อหาหรือพฤติกรรมที่ไม่เหมาะสม (การตรวจรายงานอยู่ใน admin.controller.js)
import * as reportService from '../services/report.service.js';

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
