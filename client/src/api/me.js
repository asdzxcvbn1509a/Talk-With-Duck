// เรียก /api/me (รายละเอียดใน docs/api.md)
import { api } from '../lib/api';

export const updateMe = async (data) => {
  return await api.patch('/me', data);
};

export const acceptGuidelines = async () => {
  return await api.post('/me/accept-guidelines');
};

// ลบบัญชีถาวร (server ล้าง refresh cookie ให้ด้วย)
export const deleteMe = async () => {
  return await api.delete('/me');
};
