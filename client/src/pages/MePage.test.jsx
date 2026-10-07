// หน้า "ฉัน": ลิงก์ช่องทางขอความช่วยเหลือแสดงเสมอ ส่วนลิงก์ภายนอกแสดงเฉพาะเมื่อทีมตั้งค่าไว้
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import MePage from './MePage';

vi.mock('../lib/auth', () => ({ logout: vi.fn(), updateProfile: vi.fn() }));
vi.mock('../lib/roomSession', () => ({ roomSession: { leave: vi.fn() } }));

const renderMe = () =>
  render(
    <MemoryRouter>
      <MePage />
    </MemoryRouter>,
  );

describe('MePage (ลิงก์)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'duck@mail.kmutt.ac.th',
        nickname: 'เป็ดทดสอบ',
        year: 2,
        avatar: 'duck-classic',
        role: 'member',
      },
    });
  });

  afterEach(() => {
    // ถอดหน้าออกก่อนล้าง user (ในแอปจริง RequireAuth ไม่ render หน้านี้ตอนไม่มี user)
    cleanup();
    useAuthStore.getState().clear();
    vi.unstubAllEnvs();
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
});
