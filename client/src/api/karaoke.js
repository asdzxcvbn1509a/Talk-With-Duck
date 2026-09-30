// เรียก /api/karaoke (รายละเอียดใน docs/api.md)
import { api } from '../lib/api';

export const readKaraokeConfig = async () => {
  return await api.get('/karaoke/config');
};

export const searchSongs = async (params) => {
  return await api.get('/karaoke/search', { params });
};

export const resolveSong = async (data) => {
  return await api.post('/karaoke/resolve', data);
};
