// เรียก /api/questions (รายละเอียดใน docs/api.md)
import { api } from '../lib/api';

export const listQuestions = async (params) => {
  return await api.get('/questions', { params });
};

export const readQuestion = async (id) => {
  return await api.get(`/questions/${id}`);
};

export const createQuestion = async (data) => {
  return await api.post('/questions', data);
};

export const updateQuestion = async (id, data) => {
  return await api.patch(`/questions/${id}`, data);
};

export const removeQuestion = async (id) => {
  return await api.delete(`/questions/${id}`);
};

export const createAnswer = async (questionId, data) => {
  return await api.post(`/questions/${questionId}/answers`, data);
};

export const loveQuestion = async (id) => {
  return await api.post(`/questions/${id}/love`);
};
