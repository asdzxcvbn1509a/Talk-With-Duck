// บัญชีทดสอบตอนพัฒนา: กดชื่อแล้วเข้าได้เลย · server ไม่ได้เปิด DEV_LOGIN ก็บอกวิธีเปิด
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import DevAccounts from './DevAccounts';

vi.mock('../api/auth');

const mod = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'mod@mail.kmutt.ac.th',
  nickname: 'พี่เป็ดผู้ดูแล',
  avatar: 'duck-glasses',
  year: 4,
  role: 'moderator',
};

describe('DevAccounts', () => {
  afterEach(() => {
    vi.resetAllMocks();
    useAuthStore.getState().clear();
  });

  it('กดบัญชีทดสอบ → เข้าสู่ระบบด้วยบัญชีนั้น', async () => {
    vi.mocked(authApi.listDevAccounts).mockResolvedValue({ data: { accounts: [mod] } });
    const devLogin = vi
      .mocked(authApi.devLogin)
      .mockResolvedValue({ data: { user: mod, accessToken: 'token' } });
    const onSignedIn = vi.fn();
    render(<DevAccounts onSignedIn={onSignedIn} />);

    fireEvent.click(await screen.findByRole('button', { name: /พี่เป็ดผู้ดูแล/ }));

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(mod));
    expect(devLogin).toHaveBeenCalledWith({ userId: mod.id });
    expect(useAuthStore.getState().user).toEqual(mod);
  });

  it('server ไม่ได้เปิด DEV_LOGIN (404) → บอกวิธีเปิด', async () => {
    vi.mocked(authApi.listDevAccounts).mockRejectedValue(
      Object.assign(new Error('Not Found'), { response: { status: 404 } }),
    );
    render(<DevAccounts onSignedIn={vi.fn()} />);

    expect(await screen.findByText(/ตั้ง DEV_LOGIN=true ใน server\/\.env/)).toBeInTheDocument();
  });
});
