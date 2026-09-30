// เรียก /api/auth (รายละเอียดใน docs/api.md)
// การเก็บ token/ข้อมูลผู้ใช้หลังเรียกเสร็จอยู่ที่ lib/auth.js
import axios from 'axios';
import { API_BASE, api } from '../lib/api';

// credential = ID token จากปุ่ม Google · profile ส่งเฉพาะตอนเข้าครั้งแรก
export const signInWithGoogle = async (data) => {
  return await api.post('/auth/google', data);
};

// บัญชีทดสอบ: ใช้ได้เฉพาะตอนพัฒนาในเครื่อง (server ต้องตั้ง DEV_LOGIN=true)
export const listDevAccounts = async () => {
  return await api.get('/auth/dev-accounts');
};

export const devLogin = async (data) => {
  return await api.post('/auth/dev-login', data);
};

// ใช้ axios ตรง ๆ: ถ้า token หมดอายุพอดี ไม่ต้องให้ interceptor ขอ token ใหม่ก่อนออกจากระบบ
export const logout = async () => {
  return await axios.post(`${API_BASE}/auth/logout`, null, { withCredentials: true });
};
