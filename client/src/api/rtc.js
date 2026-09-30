// เรียก /api/rtc (รายละเอียดใน docs/api.md)
import { api } from '../lib/api';

export const readIceServers = async () => {
  return await api.get('/rtc/ice-servers');
};
