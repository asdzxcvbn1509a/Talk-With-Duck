// เปิดแอปจริงผ่าน data router + lazy route (ยังไม่ล็อกอิน: ไม่มี refresh cookie จึงได้ 204)
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// บัญชีทดสอบ (โหมด dev) จะยิง API จริง ซึ่งไม่เกี่ยวกับเทสต์นี้
vi.mock('./components/DevAccounts', () => ({ default: () => null }));

// router ถูกสร้างตอน import App จึงต้องตั้ง URL ก่อน แล้ว import ใหม่ทุกเทสต์
const openApp = async (path) => {
  window.history.pushState({}, '', path);
  vi.resetModules();
  const { default: App } = await import('./App');
  render(<App />);
};

describe('App (lazy route)', () => {
  beforeEach(() => {
    vi.spyOn(axios, 'post').mockResolvedValue({ status: 204, data: '' });
  });

  it('ยังไม่ล็อกอินแต่เปิดลิงก์ห้อง → ถูกพาไปหน้า login ที่โหลดแยกไฟล์', async () => {
    await openApp('/room/abc');

    expect(await screen.findByRole('heading', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/login'));
  });

  it('path ที่ไม่มีอยู่ → หน้าเป็ดหลงทาง', async () => {
    await openApp('/no-such-page');

    expect(await screen.findByRole('heading', { name: 'เป็ดหลงทาง' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/no-such-page');
  });
});
