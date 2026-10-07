// หน้า "ฉัน": ลิงก์ช่องทางขอความช่วยเหลือแสดงเสมอ ส่วนลิงก์ภายนอกแสดงเฉพาะเมื่อทีมตั้งค่าไว้ · ลบบัญชีได้
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteAccount } from '../lib/auth';
import { confirmDialog } from '../lib/dialog';
import { roomSession } from '../lib/roomSession';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import MePage from './MePage';

vi.mock('../lib/auth', () => ({ deleteAccount: vi.fn(), logout: vi.fn(), updateProfile: vi.fn() }));
vi.mock('../lib/dialog', () => ({ confirmDialog: vi.fn() }));
vi.mock('../lib/roomSession', () => ({ roomSession: { leave: vi.fn() } }));

const member = {
  id: 'u1',
  email: 'duck@mail.kmutt.ac.th',
  nickname: 'เป็ดทดสอบ',
  year: 2,
  avatar: 'duck-classic',
  role: 'member',
};

const renderMe = () =>
  render(
    <MemoryRouter initialEntries={['/me']}>
      <Routes>
        <Route path="/me" element={<MePage />} />
        <Route path="/login" element={<p>หน้าเข้าสู่ระบบ</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('MePage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: member });
  });

  afterEach(() => {
    // ถอดหน้าออกก่อนล้าง user (ในแอปจริง RequireAuth ไม่ render หน้านี้ตอนไม่มี user)
    cleanup();
    useAuthStore.getState().clear();
    useUiStore.setState({ reportSummary: { pending: 0, urgent: 0 } });
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it('ยังไม่ตั้งลิงก์ภายนอก → มีลิงก์ช่องทางขอความช่วยเหลือ แต่ไม่มีแบบประเมินหรือติดต่อทีม', () => {
    vi.stubEnv('VITE_SURVEY_URL', '');
    vi.stubEnv('VITE_CONTACT_URL', '');
    renderMe();
    expect(screen.getByRole('link', { name: 'ช่องทางขอความช่วยเหลือ' })).toHaveAttribute(
      'href',
      '/guidelines#help',
    );
    expect(screen.queryByRole('link', { name: /แบบประเมิน/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /ติดต่อทีมผู้ดูแล/ })).toBeNull();
  });

  it('ตั้งลิงก์ไว้ → แสดงลิงก์แบบประเมินและติดต่อทีม เปิดในแท็บใหม่', () => {
    vi.stubEnv('VITE_SURVEY_URL', 'https://forms.gle/duck-survey');
    vi.stubEnv('VITE_CONTACT_URL', 'mailto:team@example.com');
    renderMe();
    const survey = screen.getByRole('link', { name: /ตอบแบบประเมินความพึงพอใจ/ });
    expect(survey).toHaveAttribute('href', 'https://forms.gle/duck-survey');
    expect(survey).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: /ติดต่อทีมผู้ดูแล/ })).toHaveAttribute(
      'href',
      'mailto:team@example.com',
    );
  });

  it('มีลิงก์นโยบายความเป็นส่วนตัว', () => {
    renderMe();
    expect(screen.getByRole('link', { name: 'นโยบายความเป็นส่วนตัว' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });

  it('ลบบัญชี → ถามยืนยันก่อน → ออกจากห้อง ลบบัญชี แล้วกลับไปหน้าเข้าสู่ระบบ', async () => {
    vi.mocked(confirmDialog).mockResolvedValue(true);
    vi.mocked(deleteAccount).mockResolvedValue();
    renderMe();

    fireEvent.click(screen.getByRole('button', { name: 'ลบบัญชีของฉัน' }));
    expect(await screen.findByText('หน้าเข้าสู่ระบบ')).toBeInTheDocument();
    expect(confirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({ confirmText: 'ลบบัญชี', danger: true }),
    );
    expect(roomSession.leave).toHaveBeenCalledTimes(1);
    expect(deleteAccount).toHaveBeenCalledTimes(1);
  });

  it('กดลบบัญชีแล้วเปลี่ยนใจ → ไม่ลบอะไร', async () => {
    vi.mocked(confirmDialog).mockResolvedValue(false);
    renderMe();
    fireEvent.click(screen.getByRole('button', { name: 'ลบบัญชีของฉัน' }));
    await waitFor(() => expect(confirmDialog).toHaveBeenCalledTimes(1));
    expect(deleteAccount).not.toHaveBeenCalled();
    expect(roomSession.leave).not.toHaveBeenCalled();
  });

  it('ผู้ดูแล: ไม่มีปุ่มลบบัญชี และแถวจัดการรายงานบอกจำนวนที่รอตรวจ', () => {
    useAuthStore.setState({ user: { ...member, role: 'moderator' } });
    useUiStore.setState({ reportSummary: { pending: 3, urgent: 1 } });
    renderMe();
    expect(screen.queryByRole('button', { name: 'ลบบัญชีของฉัน' })).toBeNull();
    expect(screen.getByText(/บัญชีผู้ดูแลลบเองไม่ได้/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /จัดการรายงาน/ })).toHaveTextContent('รอตรวจ 3');
  });
});
