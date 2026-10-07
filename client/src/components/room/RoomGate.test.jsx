// หน้าห้องตอนยังไม่ได้อยู่ในห้อง (RoomGate): หลุดจากห้อง → บอกสาเหตุ · ยังไม่เข้า/เข้าไม่สำเร็จ → หน้าก่อนเข้าห้อง
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRoomStore } from '../../stores/roomStore';
import RoomGate from './RoomGate';

const preview = {
  id: 'r1',
  name: 'ห้องคุยเรื่องเรียน',
  type: 'group',
  yearFilter: null,
  capacity: 10,
  isActive: true,
  memberCount: 1,
  members: [{ userId: 'u2', nickname: 'เป็ดเพื่อน', avatar: 'duck-classic', year: 1 }],
};

// ค่าแบบเดียวกับที่ useRoomLifecycle คืนให้หน้าห้อง
const lifecycle = (overrides = {}) => ({
  status: 'idle',
  preview,
  previewError: null,
  joining: false,
  joinError: null,
  join: vi.fn(),
  leave: vi.fn(),
  backTo: '/lobby',
  ...overrides,
});

const renderGate = (value) =>
  render(
    <MemoryRouter>
      <RoomGate lifecycle={value} />
    </MemoryRouter>,
  );

describe('RoomGate', () => {
  afterEach(() => useRoomStore.getState().reset());

  it('ยังไม่ได้เข้าห้อง → หน้าก่อนเข้าห้อง กดเข้าห้องแล้วเปิดไมค์ตามที่เลือก', () => {
    const value = lifecycle();
    renderGate(value);
    expect(screen.getByRole('heading', { name: 'ห้องคุยเรื่องเรียน' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'เข้าห้อง' }));
    expect(value.join).toHaveBeenCalledWith({ withMic: true, startMuted: false });
  });

  it('ห้องปิดระหว่างอยู่ในห้อง → บอกว่าห้องปิด และปุ่มกลับพาไปหน้าที่หน้าห้องกำหนด', () => {
    renderGate(lifecycle({ status: 'closed', backTo: '/karaoke' }));
    expect(screen.getByText('ห้องนี้ปิดแล้ว')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'กลับไปเลือกห้อง' })).toHaveAttribute(
      'href',
      '/karaoke',
    );
  });

  it('ผู้ดูแลปิดห้อง → บอกเหตุผลจาก error ใน roomStore', () => {
    useRoomStore.setState({ error: 'moderated' });
    renderGate(lifecycle({ status: 'closed' }));
    expect(screen.getByText('ผู้ดูแลปิดห้องนี้แล้ว')).toBeInTheDocument();
  });

  it('ถูกเชิญออก → บอกว่าเจ้าของห้องเชิญออก และไม่มีปุ่มเข้าห้องอีกครั้ง', () => {
    renderGate(lifecycle({ status: 'kicked' }));
    expect(screen.getByText('เจ้าของห้องเชิญคุณออกจากห้องนี้')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'เข้าห้องอีกครั้ง' })).toBeNull();
  });

  it('เชื่อมต่อหลุดหลังเข้าห้องแล้ว → กดเข้าห้องอีกครั้งได้', () => {
    const value = lifecycle({ status: 'error' });
    renderGate(value);
    expect(screen.getByText('เชื่อมต่อห้องไม่สำเร็จ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'เข้าห้องอีกครั้ง' }));
    expect(value.join).toHaveBeenCalledWith({ withMic: true });
  });

  it('เข้าไม่สำเร็จตั้งแต่แรก (มี joinError) → อยู่หน้าก่อนเข้าห้องพร้อมบอกสาเหตุ', () => {
    const joinError = Object.assign(new Error('Request failed'), {
      response: {
        status: 500,
        data: { error: { code: 'INTERNAL', message: 'ระบบขัดข้อง ลองใหม่อีกครั้งนะ' } },
      },
    });
    renderGate(lifecycle({ status: 'error', joinError }));
    expect(screen.getByRole('alert')).toHaveTextContent('ระบบขัดข้อง ลองใหม่อีกครั้งนะ');
    expect(screen.getByRole('button', { name: 'เข้าห้อง' })).toBeInTheDocument();
  });

  it('หลุดจากห้องแต่กำลังเข้าใหม่ → แสดงหน้าก่อนเข้าห้องแทนหน้าบอกสาเหตุ', () => {
    renderGate(lifecycle({ status: 'replaced', joining: true }));
    expect(screen.queryByText('คุณเปิดห้องนี้ในอีกแท็บหนึ่ง')).toBeNull();
    expect(screen.getByRole('heading', { name: 'ห้องคุยเรื่องเรียน' })).toBeInTheDocument();
  });
});
