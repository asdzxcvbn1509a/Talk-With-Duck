// เรียก /api/answers (รายละเอียดใน docs/api.md)
import { api } from '../lib/api';

export const updateAnswer = async (id, data) => {
  return await api.patch(`/answers/${id}`, data);
};

export const removeAnswer = async (id) => {
  return await api.delete(`/answers/${id}`);
};
