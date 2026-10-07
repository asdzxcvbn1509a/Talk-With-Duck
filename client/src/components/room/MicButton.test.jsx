// ปุ่มไมค์ (MicButton): คำใต้ปุ่มและ label บอกทั้งสถานะและผลของการกด แยกกรณีไม่ได้รับสิทธิ์ใช้ไมค์
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MicButton from './MicButton';

describe('MicButton', () => {
  it.each([
    [{ muted: false, micAvailable: true }, 'ไมค์เปิด', 'ไมค์เปิดอยู่ แตะเพื่อปิดไมค์'],
    [{ muted: true, micAvailable: true }, 'ไมค์ปิดอยู่', 'ไมค์ปิดอยู่ แตะเพื่อเปิดไมค์'],
    [
      { muted: true, micAvailable: false },
      'ขอใช้ไมค์',
      'ยังไม่ได้รับสิทธิ์ใช้ไมค์ แตะเพื่อขอสิทธิ์',
    ],
  ])('%o → ใต้ปุ่มเขียนว่า "%s"', (state, caption, label) => {
    render(<MicButton {...state} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    expect(screen.getByText(caption)).toBeInTheDocument();
  });

  it('ไม่ได้รับสิทธิ์ใช้ไมค์ไม่ใช้สีแดง (สีแดง = ปิดไมค์เอง)', () => {
    render(<MicButton muted micAvailable={false} onToggle={() => {}} />);
    expect(screen.getByRole('button')).not.toHaveClass('bg-danger-strong');
  });

  it('กดแล้วเรียก onToggle', () => {
    const onToggle = vi.fn();
    render(<MicButton muted={false} micAvailable onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button', { name: /แตะเพื่อปิดไมค์/ }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
