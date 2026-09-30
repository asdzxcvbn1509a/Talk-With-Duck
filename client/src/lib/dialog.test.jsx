// หน้าต่างยืนยันของแอป (SweetAlert2 แทน window.confirm): กดยืนยันได้ true กดยกเลิกได้ false
import { fireEvent, screen } from '@testing-library/react';
import { Trash } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { confirmDialog } from './dialog';

describe('confirmDialog', () => {
  it('กดยืนยัน → true', async () => {
    const answer = confirmDialog({
      title: 'ลบคำตอบนี้ใช่ไหม?',
      confirmText: 'ลบคำตอบ',
      icon: Trash,
      danger: true,
    });
    expect(await screen.findByRole('heading', { name: 'ลบคำตอบนี้ใช่ไหม?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'ลบคำตอบ' }));
    await expect(answer).resolves.toBe(true);
  });

  it('หัวข้อแสดงเป็นข้อความเสมอ: ชื่อเล่นที่มี HTML ต้องไม่กลายเป็น element (กัน XSS)', async () => {
    const title = 'ระงับบัญชี “<img src=x onerror=alert(1)>” ใช่ไหม?';
    const answer = confirmDialog({ title, confirmText: 'ระงับบัญชี', danger: true });
    const heading = await screen.findByRole('heading', { name: title });
    expect(heading.querySelector('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    await expect(answer).resolves.toBe(false);
  });

  it('กดยกเลิก → false', async () => {
    const answer = confirmDialog({ title: 'ไม่พบการทำผิดใช่ไหม?', confirmText: 'ไม่พบการทำผิด' });
    fireEvent.click(await screen.findByRole('button', { name: 'ยกเลิก' }));
    await expect(answer).resolves.toBe(false);
  });
});
