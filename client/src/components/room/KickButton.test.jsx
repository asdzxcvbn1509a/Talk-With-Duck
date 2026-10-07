// ปุ่มเชิญออกจากห้อง: ถามยืนยันก่อนทุกครั้ง แล้วบอกผลด้วย toast
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmDialog } from '../../lib/dialog';
import { roomSession } from '../../lib/roomSession';
import { useUiStore } from '../../stores/uiStore';
import KickButton from './KickButton';

vi.mock('../../lib/dialog', () => ({ confirmDialog: vi.fn() }));
vi.mock('../../lib/roomSession', () => ({ roomSession: { kick: vi.fn() } }));

const troll = { userId: 'u9', nickname: 'เป็ดเกเร' };
const toastMessages = () => useUiStore.getState().toasts.map((t) => t.message);

describe('KickButton', () => {
  afterEach(() => {
    vi.resetAllMocks();
    useUiStore.setState({ toasts: [] });
  });

  it('กดแล้วเปลี่ยนใจ → ไม่ส่งคำขอ', async () => {
    vi.mocked(confirmDialog).mockResolvedValue(false);
    render(<KickButton member={troll} />);
    fireEvent.click(screen.getByRole('button', { name: 'เชิญ เป็ดเกเร ออกจากห้อง' }));
    await waitFor(() => expect(confirmDialog).toHaveBeenCalledTimes(1));
    expect(confirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'เชิญ “เป็ดเกเร” ออกจากห้องใช่ไหม?', danger: true }),
    );
    expect(roomSession.kick).not.toHaveBeenCalled();
  });

  it('ยืนยัน → เชิญออก แล้วบอกว่าสำเร็จ', async () => {
    vi.mocked(confirmDialog).mockResolvedValue(true);
    vi.mocked(roomSession.kick).mockResolvedValue();
    render(<KickButton member={troll} />);
    fireEvent.click(screen.getByRole('button', { name: 'เชิญ เป็ดเกเร ออกจากห้อง' }));
    await waitFor(() => expect(toastMessages()).toContain('เชิญ เป็ดเกเร ออกจากห้องแล้ว'));
    expect(roomSession.kick).toHaveBeenCalledWith('u9');
  });

  it('server ไม่ยอม → บอกข้อความจาก server', async () => {
    vi.mocked(confirmDialog).mockResolvedValue(true);
    vi.mocked(roomSession.kick).mockRejectedValue(new Error('เฉพาะเจ้าของห้องที่เชิญคนออกได้'));
    render(<KickButton member={troll} />);
    fireEvent.click(screen.getByRole('button', { name: 'เชิญ เป็ดเกเร ออกจากห้อง' }));
    await waitFor(() => expect(toastMessages()).toContain('เฉพาะเจ้าของห้องที่เชิญคนออกได้'));
    expect(screen.getByRole('button', { name: 'เชิญ เป็ดเกเร ออกจากห้อง' })).toBeEnabled();
  });
});
