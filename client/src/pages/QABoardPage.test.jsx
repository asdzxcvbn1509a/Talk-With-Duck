// บอร์ดคำถาม: ตอนบอร์ดว่าง ข้อความแยกกรณีกรองหัวข้อ/ชั้นปี กับไม่ได้กรอง · ค้นหาด้วยคำ
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listQuestions } from '../api/questions';
import { useUiStore } from '../stores/uiStore';
import QABoardPage from './QABoardPage';

vi.mock('../api/questions');

const renderBoard = () => {
  const router = createMemoryRouter(
    [
      { path: '/qa', element: <QABoardPage /> },
      { path: '/qa/new', element: <p>หน้าตั้งคำถาม</p> },
    ],
    { initialEntries: ['/qa'] },
  );
  render(<RouterProvider router={router} />);
};

describe('QABoardPage (บอร์ดว่าง)', () => {
  beforeEach(() => {
    vi.mocked(listQuestions).mockResolvedValue({ data: { items: [], nextCursor: null } });
  });

  afterEach(() => {
    useUiStore.getState().setQaFilter({ year: null, topic: null, sort: 'latest', q: '' });
    vi.resetAllMocks();
  });

  it('ไม่ได้กรอง → บอกว่ายังไม่มีคำถามบนบอร์ด ไม่มีปุ่มล้างตัวกรอง', async () => {
    renderBoard();
    expect(await screen.findByText('ยังไม่มีคำถามบนบอร์ด')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'ล้างตัวกรอง' })).toBeNull();
  });

  it('กรองหัวข้ออยู่ → บอกว่ายังไม่มีคำถามในหมวดนี้ และกดล้างตัวกรองได้', async () => {
    useUiStore.getState().setQaFilter({ topic: 'life' });
    renderBoard();
    expect(await screen.findByText('ยังไม่มีคำถามในหมวดนี้')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ล้างตัวกรอง' }));
    expect(useUiStore.getState().qaFilter).toMatchObject({ year: null, topic: null });
    expect(await screen.findByText('ยังไม่มีคำถามบนบอร์ด')).toBeInTheDocument();
  });

  it('เรียงแบบ "รอคำตอบ" และกรองอยู่ → บอกว่าคำถามในหมวดนี้มีคนตอบครบแล้ว', async () => {
    useUiStore.getState().setQaFilter({ year: 2, sort: 'unanswered' });
    renderBoard();
    expect(await screen.findByText('คำถามในหมวดนี้มีคนตอบครบแล้ว')).toBeInTheDocument();
  });

  it('พิมพ์คำค้น → หยุดพิมพ์แล้วค่อยค้น (ส่ง q ไปกับตัวกรองอื่น)', async () => {
    useUiStore.getState().setQaFilter({ topic: 'internship' });
    renderBoard();
    await screen.findByText('ยังไม่มีคำถามในหมวดนี้');
    expect(listQuestions).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByRole('textbox', { name: 'ค้นหาคำถาม' }), {
      target: { value: '  ฝึกงาน ' },
    });
    // ยังไม่ค้นทันทีที่พิมพ์
    expect(listQuestions).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(listQuestions).toHaveBeenLastCalledWith({
        year: undefined,
        topic: 'internship',
        sort: 'latest',
        q: 'ฝึกงาน',
      }),
    );
    expect(listQuestions).toHaveBeenCalledTimes(2);
  });

  it('ค้นไม่เจอ → บอกคำที่ค้น และกดล้างการค้นหาแล้วกลับมาดูทั้งบอร์ด', async () => {
    useUiStore.getState().setQaFilter({ q: 'ฝึกงาน' });
    renderBoard();
    expect(await screen.findByText('ไม่พบคำถามที่มีคำว่า “ฝึกงาน”')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'ค้นหาคำถาม' })).toHaveValue('ฝึกงาน');
    expect(screen.getByRole('link', { name: 'ตั้งคำถามนี้เลย' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'ล้างการค้นหา' }));
    expect(useUiStore.getState().qaFilter.q).toBe('');
    expect(screen.getByRole('textbox', { name: 'ค้นหาคำถาม' })).toHaveValue('');
    expect(await screen.findByText('ยังไม่มีคำถามบนบอร์ด')).toBeInTheDocument();
  });
});
