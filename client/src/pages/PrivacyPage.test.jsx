// นโยบายความเป็นส่วนตัว: บอกสิ่งที่ไม่เก็บ (ชื่อจริง เสียง) · ลิงก์กลับตามสถานะการเข้าสู่ระบบ
// · ช่องทางติดต่อทีมแสดงเฉพาะเมื่อทีมตั้งค่าไว้
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../stores/authStore';
import PrivacyPage from './PrivacyPage';

const renderPrivacy = () =>
  render(
    <MemoryRouter>
      <PrivacyPage />
    </MemoryRouter>,
  );

describe('PrivacyPage', () => {
  afterEach(() => {
    cleanup();
    useAuthStore.getState().clear();
    vi.unstubAllEnvs();
  });

  it('ยังไม่ล็อกอิน → อ่านได้ และลิงก์กลับไปหน้าเข้าสู่ระบบ', () => {
    vi.stubEnv('VITE_CONTACT_URL', '');
    renderPrivacy();
    expect(screen.getByRole('heading', { name: 'ข้อมูลที่ไม่เก็บ' })).toBeInTheDocument();
    expect(screen.getByText(/ไม่มีการบันทึกเสียง/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /กลับไปหน้าเข้าสู่ระบบ/ })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.queryByRole('link', { name: /ติดต่อทีมผู้ดูแล/ })).toBeNull();
  });

  it('ล็อกอินอยู่ → ลิงก์กลับไปหน้า "ฉัน" · ตั้งช่องทางติดต่อไว้ → เปิดในแท็บใหม่', () => {
    vi.stubEnv('VITE_CONTACT_URL', 'mailto:team@example.com');
    useAuthStore.setState({ user: { id: 'u1', nickname: 'เป็ดทดสอบ' } });
    renderPrivacy();
    expect(screen.getByRole('link', { name: /กลับไปหน้า “ฉัน”/ })).toHaveAttribute('href', '/me');
    const contact = screen.getByRole('link', { name: /ติดต่อทีมผู้ดูแล/ });
    expect(contact).toHaveAttribute('href', 'mailto:team@example.com');
    expect(contact).toHaveAttribute('target', '_blank');
  });
});
