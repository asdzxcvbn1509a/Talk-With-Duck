// เรียก /api/rooms (รายละเอียดใน docs/api.md)
import { api } from '../lib/api';

export const listRooms = async (params) => {
  return await api.get('/rooms', { params });
};

export const readRoom = async (id) => {
  return await api.get(`/rooms/${id}`);
};

export const createRoom = async (data) => {
  return await api.post('/rooms', data);
};

export const quickMatch = async (data) => {
  return await api.post('/rooms/quick-match', data);
};

export const joinRoom = async (id) => {
  return await api.post(`/rooms/${id}/join`);
};

export const leaveRoom = async (id) => {
  return await api.post(`/rooms/${id}/leave`);
};

export const sendMessage = async (id, data) => {
  return await api.post(`/rooms/${id}/messages`, data);
};

export const addSong = async (id, data) => {
  return await api.post(`/rooms/${id}/queue`, data);
};

export const removeSong = async (id, songId) => {
  return await api.delete(`/rooms/${id}/queue/${songId}`);
};

export const nextSong = async (id, data) => {
  return await api.post(`/rooms/${id}/queue/next`, data);
};
