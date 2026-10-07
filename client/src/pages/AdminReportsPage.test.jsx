// หน้าผู้ดูแล: บัญชีที่ถูกระงับขึ้นเป็นรายการ และปลดระงับได้หลังกดยืนยัน · สถิติเลือกช่วงเวลาได้
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as adminApi from '../api/admin';
import { confirmDialog } from '../lib/dialog';
import AdminReportsPage from './AdminReportsPage';

const stats = {
  range: { from: null, to: null },
  users: { total: 40, byYear: { 1: 15, 2: 10, 3: 9, 4: 6 }, active: 31 },
  rooms: {
    total: 12,
    byType: { private: 5, group: 4, karaoke: 3 },
    byYear: { all: 6, 1: 3, 2: 1, 3: 2, 4: 0 },
    activeNow: 2,
  },
  qa: { questions: 20, answers: 55, loves: 80 },
  messages: 300,
  karaoke: { participants: 14, songsPlayed: 33 },
  reports: { pending: 1 },
};

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

  it('ผู้รายงานลบบัญชีไปแล้ว: รายงานยังแสดง และบอกว่าเป็นบัญชีที่ลบไปแล้ว', async () => {
    vi.mocked(adminApi.listReports).mockResolvedValue({
      data: { reports: [{ ...report, reporter: null }] },
    });
    vi.mocked(adminApi.listBannedUsers).mockResolvedValue({ data: { users: [] } });
    setup();
    expect(await screen.findByText('ผู้รายงาน: บัญชีที่ลบไปแล้ว')).toBeInTheDocument();
  });
});

describe('AdminReportsPage (สถิติตามตัวชี้วัดข้อ 4.6)', () => {
  beforeEach(() => {
    vi.mocked(adminApi.readStats).mockResolvedValue({ data: { stats } });
    vi.mocked(adminApi.listReports).mockResolvedValue({ data: { reports: [] } });
    vi.mocked(adminApi.listBannedUsers).mockResolvedValue({ data: { users: [] } });
  });

  afterEach(() => vi.resetAllMocks());

  it('แสดงคนที่ใช้งานจริง และจำนวนห้องแยกตามชั้นปี', async () => {
    setup();
    expect(await screen.findByText('ใช้งานจริง')).toBeInTheDocument();
    expect(screen.getByText('31')).toBeInTheDocument();
    expect(
      screen.getByText('แยกชั้นปี: ปี1 3 · ปี2 1 · ปี3 2 · ปี4 0 · ทุกชั้นปี 6'),
    ).toBeInTheDocument();
    // ไม่ได้เลือกช่วงเวลา = นับทั้งหมด
    expect(adminApi.readStats).toHaveBeenCalledWith(undefined);
  });

  it('เลือก Duck Community Week → ขอสถิติเฉพาะวันที่ 14–18 ธ.ค. (นับถึงก่อนเที่ยงคืนวันที่ 19)', async () => {
    setup();
    await screen.findByText('ใช้งานจริง');
    fireEvent.click(screen.getByRole('button', { name: 'Duck Week' }));
    expect(screen.getByText(/Duck Community Week:/)).toBeInTheDocument();
    await waitFor(() => expect(adminApi.readStats).toHaveBeenCalledTimes(2));
    expect(adminApi.readStats).toHaveBeenLastCalledWith({
      from: new Date(2026, 11, 14).toISOString(),
      to: new Date(2026, 11, 19).toISOString(),
    });
    // เลือกช่วงแล้วการ์ดสมาชิกนับเฉพาะคนที่สมัครในช่วงนั้น
    expect(await screen.findByText('สมาชิกใหม่')).toBeInTheDocument();
  });

  it('เลือกวันเองแต่วันเริ่มอยู่หลังวันสิ้นสุด: ยังไม่ขอสถิติ และบอกให้เลือกใหม่', async () => {
    setup();
    await screen.findByText('ใช้งานจริง');
    fireEvent.click(screen.getByRole('button', { name: 'เลือกวันเอง' }));
    await waitFor(() => expect(adminApi.readStats).toHaveBeenCalledTimes(2));

    fireEvent.change(screen.getByLabelText('ตั้งแต่วันที่'), { target: { value: '2026-12-20' } });
    fireEvent.change(screen.getByLabelText('ถึงวันที่'), { target: { value: '2026-12-01' } });
    expect(await screen.findByText(/วันเริ่มต้องไม่หลังวันสิ้นสุด/)).toBeInTheDocument();
    expect(adminApi.readStats).toHaveBeenCalledTimes(2);

    fireEvent.change(screen.getByLabelText('ถึงวันที่'), { target: { value: '2026-12-31' } });
    await waitFor(() =>
      expect(adminApi.readStats).toHaveBeenLastCalledWith({
        from: new Date(2026, 11, 20).toISOString(),
        to: new Date(2027, 0, 1).toISOString(),
      }),
    );
  });
});
