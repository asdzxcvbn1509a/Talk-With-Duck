// เข้าสู่ระบบด้วย Google: บัญชีใหม่ต้องตั้งโปรไฟล์ก่อน บัญชีเดิมเข้าได้เลย
import { fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import LoginPage from './LoginPage';

// แทนปุ่มของ Google ด้วยปุ่มธรรมดาที่ส่ง credential ให้ทันทีเมื่อกด
vi.mock('../components/GoogleSignInButton', () => ({
  default: ({ onCredential }) => (
    <button type="button" onClick={() => onCredential('google-id-token')}>
      Sign in with Google
    </button>
  ),
}));
vi.mock('../components/DevAccounts', () => ({ default: () => null }));
vi.mock('../api/auth');

const email = 'new.duck@mail.kmutt.ac.th';
const session = (user) => ({ data: { user: { id: 'u1', email, ...user }, accessToken: 'token' } });
const apiError = (code, message) =>
  Object.assign(new Error(code), { response: { status: 400, data: { error: { code, message } } } });

const setup = () => {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/guidelines', element: <p>หน้าข้อตกลง</p> },
      { path: '/lobby', element: <p>หน้าหลัก</p> },
    ],
    { initialEntries: ['/login'] },
  );
  render(<RouterProvider router={router} />);
  fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));
};

describe('LoginPage (Google)', () => {
  afterEach(() => {
    vi.resetAllMocks();
    useAuthStore.getState().clear();
  });

  it('บัญชีใหม่ → ตั้งชื่อเล่น/ชั้นปี/น้องเป็ด → ไปหน้าข้อตกลง', async () => {
    const signIn = vi
      .mocked(authApi.signInWithGoogle)
      .mockResolvedValueOnce({ data: { needsProfile: true, email } })
      .mockResolvedValueOnce(session({ nickname: 'เป็ดมาใหม่', acceptedGuidelinesAt: null }));
    setup();

    expect(await screen.findByText(email)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('ชื่อเล่นในคอมมูนิตี้'), {
      target: { value: '  เป็ดมาใหม่  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'เริ่มใช้งาน' }));
    expect(screen.getByRole('alert')).toHaveTextContent('เลือกชั้นปีก่อนนะ');

    fireEvent.click(screen.getByRole('radio', { name: 'ปี 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'เริ่มใช้งาน' }));

    expect(await screen.findByText('หน้าข้อตกลง')).toBeInTheDocument();
    expect(signIn).toHaveBeenLastCalledWith({
      credential: 'google-id-token',
      profile: { nickname: 'เป็ดมาใหม่', year: 2, avatar: expect.any(String) },
    });
    expect(useAuthStore.getState().user.nickname).toBe('เป็ดมาใหม่');
  });

  it('บัญชีเดิมที่ยอมรับข้อตกลงแล้ว → ไปหน้าหลักทันที', async () => {
    vi.mocked(authApi.signInWithGoogle).mockResolvedValueOnce(
      session({ nickname: 'เป็ดเดิม', acceptedGuidelinesAt: '2026-09-01T00:00:00Z' }),
    );
    setup();

    expect(await screen.findByText('หน้าหลัก')).toBeInTheDocument();
    expect(useAuthStore.getState().user.nickname).toBe('เป็ดเดิม');
  });

  it('บัญชีที่ไม่ใช่ของมหาวิทยาลัย → แสดงข้อความจาก server', async () => {
    vi.mocked(authApi.signInWithGoogle).mockRejectedValueOnce(
      apiError('EMAIL_DOMAIN_NOT_ALLOWED', 'ใช้ได้เฉพาะบัญชีของมหาวิทยาลัย (@mail.kmutt.ac.th)'),
    );
    setup();

    expect(await screen.findByRole('alert')).toHaveTextContent('ใช้ได้เฉพาะบัญชีของมหาวิทยาลัย');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('token จาก Google หมดอายุระหว่างตั้งโปรไฟล์ → กลับไปให้กดปุ่ม Google ใหม่', async () => {
    vi.mocked(authApi.signInWithGoogle)
      .mockResolvedValueOnce({ data: { needsProfile: true, email } })
      .mockRejectedValueOnce(apiError('GOOGLE_TOKEN_INVALID', 'เข้าสู่ระบบด้วย Google ไม่สำเร็จ'));
    setup();

    fireEvent.change(await screen.findByLabelText('ชื่อเล่นในคอมมูนิตี้'), {
      target: { value: 'เป็ดช้า' },
    });
    fireEvent.click(screen.getByRole('radio', { name: 'ปี 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'เริ่มใช้งาน' }));

    expect(await screen.findByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('เข้าสู่ระบบด้วย Google ไม่สำเร็จ');
  });
});
