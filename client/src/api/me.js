// เรียก /api/me (รายละเอียดใน docs/api.md)
import { api } from '../lib/api';

export const updateMe = async (data) => {
  return await api.patch('/me', data);
};

export const acceptGuidelines = async () => {
  return await api.post('/me/accept-guidelines');
};
