// รายชื่อในห้อง: เสียงของเพื่อนแต่ละคนเล่นตามระดับที่ผู้ฟังปรับไว้ใน uiStore
// · ปุ่มเชิญออกมีเฉพาะเจ้าของห้องกลุ่ม/คาราโอเกะ
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';
import { useUiStore } from '../../stores/uiStore';
import ParticipantGrid from './ParticipantGrid';

const member = (userId, nickname) => ({
  userId,
  nickname,
  avatar: 'duck-classic',
  year: 2,
  isMuted: false,
  joinedAt: new Date().toISOString(),
});

describe('ParticipantGrid', () => {
  beforeEach(() => {
    // jsdom เล่นเสียงไม่ได้ (play ยังไม่ได้ทำไว้)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    useAuthStore.setState({ user: { id: 'u1', nickname: 'เป็ดตัวเอง' } });
    useRoomStore.setState({
      hostId: 'u1',
      members: [member('u1', 'เป็ดตัวเอง'), member('u2', 'เป็ดข้างบ้าน')],
      online: ['u2'],
      peerStates: { u2: 'connected' },
      streams: { u2: {} },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    useRoomStore.getState().reset();
    useUiStore.setState({ volumes: {}, mutedUsers: {} });
  });

  it('เสียงของเพื่อนเล่นตามระดับที่ปรับไว้ และปรับได้เฉพาะคนอื่น', () => {
    useUiStore.setState({ volumes: { u2: 0.3 } });
    const { container } = render(<ParticipantGrid />);
    const audio = container.querySelector('audio');
    expect(audio.volume).toBe(0.3);
    expect(audio.muted).toBe(false);

    act(() => useUiStore.getState().setUserMuted('u2', true));
    expect(audio.muted).toBe(true);

    expect(screen.getByRole('button', { name: 'ปรับเสียงของ เป็ดข้างบ้าน' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ปรับเสียงของ เป็ดตัวเอง' })).toBeNull();
  });

  it('เจ้าของห้องกลุ่มเห็นปุ่มเชิญออกบนช่องของคนอื่น แต่ไม่มีบนช่องตัวเอง', () => {
    useRoomStore.setState({ room: { id: 'r1', type: 'group' } });
    render(<ParticipantGrid />);
    expect(
      screen.getByRole('button', { name: 'เชิญ เป็ดข้างบ้าน ออกจากห้อง' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'เชิญ เป็ดตัวเอง ออกจากห้อง' })).toBeNull();
  });

  it('ห้อง 1-1 หรือไม่ใช่เจ้าของห้อง → ไม่มีปุ่มเชิญออก', () => {
    useRoomStore.setState({ room: { id: 'r1', type: 'private' } });
    const { unmount } = render(<ParticipantGrid />);
    expect(screen.queryByRole('button', { name: /ออกจากห้อง/ })).toBeNull();
    unmount();

    useRoomStore.setState({ room: { id: 'r1', type: 'group' }, hostId: 'u2' });
    render(<ParticipantGrid />);
    expect(screen.queryByRole('button', { name: /ออกจากห้อง/ })).toBeNull();
  });
});
