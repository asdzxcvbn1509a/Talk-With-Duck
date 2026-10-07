// เรียก /api/admin (เฉพาะผู้ดูแล · รายละเอียดใน docs/api.md)
import { api } from '../lib/api';

// params: { from?, to? } เป็น ISO string · from รวมเวลานั้น ส่วน to ไม่รวม
export const readStats = async (params) => {
  return await api.get('/admin/stats', { params });
};

export const listReports = async (params) => {
  return await api.get('/admin/reports', { params });
};

// จำนวนรายงานที่รอตรวจ { pending, urgent } สำหรับป้ายตัวเลขบนเมนูผู้ดูแล
export const readReportSummary = async () => {
  return await api.get('/admin/reports/summary');
};

export const reviewReport = async (id, data) => {
  return await api.patch(`/admin/reports/${id}`, data);
};

export const listBannedUsers = async () => {
  return await api.get('/admin/bans');
};

export const unbanUser = async (userId) => {
  return await api.delete(`/admin/bans/${userId}`);
};
