// บอร์ดคำถาม: ตอนบอร์ดว่าง ข้อความแยกกรณีกรองหัวข้อ/ชั้นปี กับไม่ได้กรอง
import { fireEvent, render, screen } from '@testing-library/react';
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
    useUiStore.getState().setQaFilter({ year: null, topic: null, sort: 'latest' });
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
});
