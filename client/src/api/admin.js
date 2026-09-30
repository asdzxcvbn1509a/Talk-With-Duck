// เรียก /api/admin (เฉพาะผู้ดูแล · รายละเอียดใน docs/api.md)
import { api } from '../lib/api';

export const readStats = async () => {
  return await api.get('/admin/stats');
};

export const listReports = async (params) => {
  return await api.get('/admin/reports', { params });
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
