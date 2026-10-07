// Speaking Indicator: ระดับเสียงเปลี่ยนทุก 100 ms ต้อง render ใหม่เฉพาะช่องของคนที่พูด ไม่ใช่รายชื่อทั้งห้อง
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../stores/authStore';
import { useRoomStore } from '../../stores/roomStore';
import ParticipantGrid from './ParticipantGrid';

// นับว่ารายชื่อ (ParticipantGrid) render ใหม่กี่ครั้ง ผ่าน RemoteAudio ที่ ParticipantGrid วาดเองโดยตรง
const audio = vi.hoisted(() => ({ renders: 0 }));
vi.mock('./RemoteAudio', () => ({
  default: () => {
    audio.renders += 1;
    return null;
  },
}));
// ดูค่า speaking ที่แต่ละช่องส่งให้อวาตาร์เป็ดตรง ๆ
vi.mock('../DuckAvatar', () => ({
  default: ({ label, speaking }) => (
    <span data-testid={`avatar-${label}`} data-speaking={String(speaking)} />
  ),
}));

const member = (userId, nickname) => ({
  userId,
  nickname,
  avatar: 'duck-classic',
  year: 2,
  isMuted: false,
  joinedAt: new Date().toISOString(),
});

const speakingOf = (nickname) => screen.getByTestId(`avatar-${nickname}`).dataset.speaking;

describe('ParticipantTile (Speaking Indicator)', () => {
  beforeEach(() => {
    audio.renders = 0;
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
    useRoomStore.getState().reset();
  });

  it('มีคนพูด → วงเรืองแสงขึ้นเฉพาะคนนั้น โดยรายชื่อทั้งห้องไม่ render ใหม่', () => {
    render(<ParticipantGrid />);
    const gridRenders = audio.renders;
    expect(speakingOf('เป็ดข้างบ้าน')).toBe('false');

    act(() => useRoomStore.getState().setLevels({ u1: 0, u2: 0.12 }));
    expect(speakingOf('เป็ดข้างบ้าน')).toBe('true');
    expect(speakingOf('เป็ดตัวเอง')).toBe('false');

    act(() => useRoomStore.getState().setLevels({ u1: 0, u2: 0 }));
    expect(speakingOf('เป็ดข้างบ้าน')).toBe('false');
    expect(audio.renders).toBe(gridRenders);
  });
});
