// ถามยืนยันก่อนออกจากห้อง: ใช้ data router จริง (createMemoryRouter) เพื่อทดสอบ useBlocker
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, RouterProvider, createMemoryRouter, useParams } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LeaveRoomDialog from '../components/room/LeaveRoomDialog';
import { useAuthStore } from '../stores/authStore';
import { useRoomStore } from '../stores/roomStore';
import { useLeaveRoomGuard } from './useLeaveRoomGuard';

const me = { id: 'u1', nickname: 'เป็ดเรา' };
const mine = { userId: 'u1', nickname: 'เป็ดเรา', joinedAt: '2026-09-29T10:00:00Z' };
const friend = { userId: 'u2', nickname: 'เป็ดเพื่อน', joinedAt: '2026-09-29T10:05:00Z' };
const TITLE = 'ออกจากห้องนี้ใช่ไหม?';

const RoomScreen = ({ onLeave }) => {
  const { id } = useParams();
  const guard = useLeaveRoomGuard(id, onLeave);
  return (
    <>
      <p>อยู่ในห้อง {id}</p>
      <Link to="/lobby">หน้าหลัก</Link>
      <button type="button" onClick={guard.requestLeave}>
        ปุ่มออกด้านล่าง
      </button>
      <LeaveRoomDialog {...guard.dialog} />
    </>
  );
};

const setup = (onLeave = vi.fn()) => {
  const router = createMemoryRouter(
    [
      { path: '/lobby', element: <p>หน้า lobby</p> },
      { path: '/room/:id', element: <RoomScreen onLeave={onLeave} /> },
    ],
    { initialEntries: ['/lobby', '/room/r1'], initialIndex: 1 },
  );
  render(<RouterProvider router={router} />);
  return { router, onLeave };
};

const dialog = () => screen.queryByRole('dialog', { name: TITLE });

describe('ถามยืนยันก่อนออกจากห้อง (useLeaveRoomGuard + LeaveRoomDialog)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: me, status: 'ready' });
    useRoomStore.getState().reset('r1');
    useRoomStore.setState({ status: 'joined', hostId: 'u2', members: [mine, friend] });
  });

  afterEach(() => {
    useRoomStore.getState().reset();
    useAuthStore.setState({ user: null });
  });

  it('กดไปหน้าอื่นระหว่างอยู่ในห้อง → ถามก่อน และเลือกอยู่ในห้องต่อได้', async () => {
    const { router } = setup();
    fireEvent.click(screen.getByRole('link', { name: 'หน้าหลัก' }));

    expect(await screen.findByRole('dialog', { name: TITLE })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/room/r1');

    fireEvent.click(screen.getByRole('button', { name: 'อยู่ในห้องต่อ' }));
    await waitFor(() => expect(dialog()).toBeNull());
    expect(router.state.location.pathname).toBe('/room/r1');
    expect(screen.getByText('อยู่ในห้อง r1')).toBeInTheDocument();
  });

  it('ยืนยันออกจากห้อง → ไปหน้าที่กดไว้', async () => {
    const { router, onLeave } = setup();
    fireEvent.click(screen.getByRole('link', { name: 'หน้าหลัก' }));
    fireEvent.click(await screen.findByRole('button', { name: 'ออกจากห้อง' }));

    expect(await screen.findByText('หน้า lobby')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lobby');
    // การออกจากห้องจริงเกิดตอนหน้าห้อง unmount (useRoomLifecycle) ไม่ใช่ผ่าน onLeave
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('ปุ่ม back ของเบราว์เซอร์ก็ต้องถามก่อน', async () => {
    const { router } = setup();
    await act(() => router.navigate(-1));

    expect(await screen.findByRole('dialog', { name: TITLE })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/room/r1');
  });

  it('กดปุ่มออกจากห้อง → ถามก่อน → ยืนยันแล้วเรียก onLeave', async () => {
    const onLeave = vi.fn().mockResolvedValue();
    setup(onLeave);
    fireEvent.click(screen.getByRole('button', { name: 'ปุ่มออกด้านล่าง' }));
    expect(dialog()).toBeInTheDocument();
    expect(onLeave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'ออกจากห้อง' }));
    await waitFor(() => expect(onLeave).toHaveBeenCalledTimes(1));
  });

  it.each([
    ['ห้องปิดไปแล้ว', () => useRoomStore.setState({ status: 'closed' })],
    [
      'ออกจากระบบแล้ว (เช่น session หมดอายุ/ถูกระงับบัญชี)',
      () => useAuthStore.setState({ user: null }),
    ],
  ])('%s → เปลี่ยนหน้าได้ทันทีโดยไม่ถาม', async (_label, change) => {
    const { router } = setup();
    act(change);
    fireEvent.click(screen.getByRole('link', { name: 'หน้าหลัก' }));

    expect(await screen.findByText('หน้า lobby')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/lobby');
    expect(dialog()).toBeNull();
  });

  it('บอกผลของการออก: เป็นคนสุดท้าย → ห้องปิด · เป็นเจ้าของห้อง → ย้ายสิทธิ์ให้คนที่อยู่นานสุด', () => {
    useRoomStore.setState({ hostId: 'u1', members: [mine] });
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'ปุ่มออกด้านล่าง' }));
    expect(screen.getByText(/ห้องจะปิดเมื่อคุณออก/)).toBeInTheDocument();

    act(() => useRoomStore.setState({ members: [mine, friend] }));
    expect(screen.getByText(/สิทธิ์เจ้าของห้องจะย้ายไปให้ “เป็ดเพื่อน”/)).toBeInTheDocument();
  });
});
