// หน้าหลัก: ตอนไม่มีห้อง ข้อความแยกกรณีกรอง/ไม่กรอง · การ์ดวันสุดท้ายของ Duck Community Week พาไปแบบประเมิน
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listQuestions } from '../api/questions';
import { useLobbyRooms } from '../hooks/useLobbyRooms';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import LobbyPage from './LobbyPage';

vi.mock('../api/questions');
vi.mock('../api/rooms');
// รายการห้องจริงต่อ Socket.IO: ที่นี่ดูแค่ข้อความตอนไม่มีห้อง
vi.mock('../hooks/useLobbyRooms');

const renderLobby = () => {
  const router = createMemoryRouter([{ path: '/lobby', element: <LobbyPage /> }], {
    initialEntries: ['/lobby'],
  });
  render(<RouterProvider router={router} />);
};

describe('LobbyPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'u1', nickname: 'เป็ดทดสอบ', year: 1, avatar: 'duck-classic' },
    });
    vi.mocked(useLobbyRooms).mockReturnValue({
      rooms: [],
      loading: false,
      error: null,
      retry: vi.fn(),
    });
    vi.mocked(listQuestions).mockResolvedValue({ data: { items: [], nextCursor: null } });
  });

  afterEach(() => {
    // ถอดหน้าออกก่อนล้าง user (ในแอปจริง RequireAuth ไม่ render หน้านี้ตอนไม่มี user)
    cleanup();
    useUiStore.getState().setLobbyFilter({ year: null, type: null });
    useAuthStore.getState().clear();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('ไม่มีห้องและไม่ได้กรอง → ชวนเปิดห้องแรก ไม่พูดถึงตัวกรอง', async () => {
    renderLobby();
    expect(await screen.findByText('ยังไม่มีห้องเปิดอยู่ตอนนี้')).toBeInTheDocument();
    expect(screen.queryByText('ยังไม่มีห้องที่ตรงกับตัวกรอง')).toBeNull();
    expect(screen.queryByRole('button', { name: 'ล้างตัวกรอง' })).toBeNull();
  });

  it('กรองอยู่แล้วไม่มีห้อง → บอกว่าไม่ตรงกับตัวกรอง และกดล้างตัวกรองได้', async () => {
    useUiStore.getState().setLobbyFilter({ year: 3, type: 'group' });
    renderLobby();
    expect(await screen.findByText('ยังไม่มีห้องที่ตรงกับตัวกรอง')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ล้างตัวกรอง' }));
    expect(useUiStore.getState().lobbyFilter).toEqual({ year: null, type: null });
    expect(await screen.findByText('ยังไม่มีห้องเปิดอยู่ตอนนี้')).toBeInTheDocument();
  });

  it('วันสุดท้ายของ Duck Community Week และตั้งลิงก์แบบประเมินไว้ → การ์ดเปิดแบบประเมินในแท็บใหม่', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 18, 10));
    vi.stubEnv('VITE_SURVEY_URL', 'https://forms.gle/duck-survey');
    renderLobby();

    const card = (await screen.findByText('ปิดท้ายสัปดาห์เป็ด')).closest('a');
    expect(card).toHaveAttribute('href', 'https://forms.gle/duck-survey');
    expect(card).toHaveAttribute('target', '_blank');
    expect(card).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
