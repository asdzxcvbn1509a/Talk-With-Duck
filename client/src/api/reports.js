// เรียก /api/reports (รายละเอียดใน docs/api.md)
import { api } from '../lib/api';

export const createReport = async (data) => {
  return await api.post('/reports', data);
};
