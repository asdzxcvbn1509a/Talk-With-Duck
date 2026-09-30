// หน้าผู้ดูแล: บัญชีที่ถูกระงับขึ้นเป็นรายการ และปลดระงับได้หลังกดยืนยัน
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from '../api/admin';
import { confirmDialog } from '../lib/dialog';
import AdminReportsPage from './AdminReportsPage';

vi.mock('../api/admin');
vi.mock('../lib/dialog');
vi.mock('../lib/socket', () => ({ getSocket: () => ({ on: vi.fn(), off: vi.fn() }) }));

const duck = { id: 'u9', nickname: 'เป็ดดื้อ', avatar: 'duck-classic', year: 2 };
const report = {
  id: 'p1',
  targetType: 'user',
  targetId: duck.id,
  reason: 'harassment',
  details: null,
  status: 'pending',
  createdAt: new Date().toISOString(),
  reporter: { id: 'u2', nickname: 'เป็ดใจดี', avatar: 'duck-classic', year: 1 },
  reviewedBy: null,
  sameTargetCount: 1,
  target: { exists: true, nickname: duck.nickname },
  owner: { ...duck, isBanned: false },
};

const setup = () => {
  const router = createMemoryRouter([{ path: '/admin/reports', element: <AdminReportsPage /> }], {
    initialEntries: ['/admin/reports'],
  });
  render(<RouterProvider router={router} />);
};

describe('AdminReportsPage (บัญชีที่ถูกระงับ)', () => {
  beforeEach(() => {
    vi.mocked(adminApi.readStats).mockResolvedValue({ data: {} });
    vi.mocked(adminApi.listReports).mockResolvedValue({ data: { reports: [] } });
  });

  afterEach(() => vi.resetAllMocks());

  it('กดปลดระงับ → ถามยืนยันก่อน → ปลดแล้วหายจากรายการ', async () => {
    vi.mocked(adminApi.listBannedUsers)
      .mockResolvedValueOnce({ data: { users: [duck] } })
      .mockResolvedValue({ data: { users: [] } });
    vi.mocked(adminApi.unbanUser).mockResolvedValue({});
    vi.mocked(confirmDialog).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    setup();

    const button = await screen.findByRole('button', { name: 'ปลดระงับ เป็ดดื้อ' });
    expect(screen.getByText('บัญชีที่ถูกระงับ (1)')).toBeInTheDocument();

    // กดแล้วเปลี่ยนใจ: ยังไม่เรียก API
    fireEvent.click(button);
    await waitFor(() => expect(confirmDialog).toHaveBeenCalledTimes(1));
    expect(confirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'ปลดระงับบัญชี “เป็ดดื้อ” ใช่ไหม?',
        confirmText: 'ปลดระงับ',
      }),
    );

    fireEvent.click(button);
    await waitFor(() => expect(screen.queryByText('บัญชีที่ถูกระงับ (1)')).toBeNull());
    expect(adminApi.unbanUser).toHaveBeenCalledTimes(1);
    expect(adminApi.unbanUser).toHaveBeenCalledWith('u9');
    expect(screen.queryByText('เป็ดดื้อ')).toBeNull();
  });

  it('ระงับบัญชีจากการ์ดรายงาน → ขึ้นในรายการบัญชีที่ถูกระงับทันที', async () => {
    vi.mocked(adminApi.listReports)
      .mockResolvedValueOnce({ data: { reports: [report] } })
      .mockResolvedValue({ data: { reports: [] } });
    vi.mocked(adminApi.listBannedUsers)
      .mockResolvedValueOnce({ data: { users: [] } })
      .mockResolvedValue({ data: { users: [duck] } });
    vi.mocked(adminApi.reviewReport).mockResolvedValue({});
    vi.mocked(confirmDialog).mockResolvedValue(true);
    setup();

    fireEvent.click(await screen.findByRole('button', { name: 'ระงับบัญชี' }));

    expect(await screen.findByRole('button', { name: 'ปลดระงับ เป็ดดื้อ' })).toBeInTheDocument();
    expect(adminApi.reviewReport).toHaveBeenCalledWith('p1', { action: 'ban' });
  });
});
