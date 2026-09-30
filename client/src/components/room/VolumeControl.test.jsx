// ปรับเสียงเพื่อนรายคน: ค่าเก็บใน uiStore (เฉพาะเครื่องนี้) · iPhone/iPad ปิดเสียงได้อย่างเดียว
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { supportsVolumeControl } from '../../lib/rtc/volume';
import { useUiStore } from '../../stores/uiStore';
import VolumeControl from './VolumeControl';

vi.mock('../../lib/rtc/volume', async (importOriginal) => ({
  ...(await importOriginal()),
  supportsVolumeControl: vi.fn(() => true),
}));

const friend = { userId: 'u2', nickname: 'เป็ดข้างบ้าน' };
const buttonName = 'ปรับเสียงของ เป็ดข้างบ้าน';

const openControl = () => {
  render(<VolumeControl member={friend} />);
  fireEvent.click(screen.getByRole('button', { name: buttonName }));
};

describe('VolumeControl', () => {
  afterEach(() => {
    useUiStore.setState({ volumes: {}, mutedUsers: {} });
    vi.mocked(supportsVolumeControl).mockReturnValue(true);
  });

  it('ลากแถบเสียง → จำค่าไว้ และปุ่มบอกระดับที่ปรับ', () => {
    openControl();
    expect(screen.getByRole('heading', { name: 'เสียงของ เป็ดข้างบ้าน' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('slider', { name: 'ระดับเสียง' }), {
      target: { value: '40' },
    });
    expect(useUiStore.getState().volumes.u2).toBe(0.4);
    expect(screen.getByRole('button', { name: buttonName })).toHaveTextContent('40%');
  });

  it('ปิดเสียงคนนี้ → แถบเลื่อนใช้ไม่ได้ และปุ่มบอกว่าปิดเสียงอยู่', () => {
    openControl();
    fireEvent.click(screen.getByRole('checkbox', { name: /ปิดเสียงคนนี้/ }));
    expect(useUiStore.getState().mutedUsers.u2).toBe(true);
    expect(screen.getByRole('slider', { name: 'ระดับเสียง' })).toBeDisabled();
    expect(screen.getByRole('button', { name: buttonName })).toHaveTextContent('ปิดเสียง');
  });

  it('คืนค่าเดิม → กลับเป็น 100% และเปิดเสียง (ไม่เหลือค่าค้างในเครื่อง)', () => {
    useUiStore.setState({ volumes: { u2: 0.3 }, mutedUsers: { u2: true } });
    openControl();
    fireEvent.click(screen.getByRole('button', { name: 'คืนค่าเดิม' }));
    expect(useUiStore.getState().volumes).toEqual({});
    expect(useUiStore.getState().mutedUsers).toEqual({});
  });

  it('iPhone/iPad: ไม่มีแถบเลื่อน แต่ยังปิดเสียงได้', () => {
    vi.mocked(supportsVolumeControl).mockReturnValue(false);
    openControl();
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.getByText(/ข้อจำกัดของ iOS/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /ปิดเสียงคนนี้/ })).toBeInTheDocument();
  });
});
