// ผู้ดูแลรู้เมื่อมีรายงานใหม่ทุกหน้า: รายงานทั่วไปขึ้น toast · รายงานเสี่ยงทำร้ายตัวเองขึ้นหน้าต่างชวนไปดู
import { act, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readReportSummary } from '../api/admin';
import { confirmDialog } from '../lib/dialog';
import { getSocket } from '../lib/socket';
import { useUiStore } from '../stores/uiStore';
import { useModeratorAlerts } from './useModeratorAlerts';

vi.mock('../api/admin', () => ({ readReportSummary: vi.fn() }));
vi.mock('../lib/dialog', () => ({ confirmDialog: vi.fn() }));
vi.mock('../lib/socket', () => ({ getSocket: vi.fn() }));

// socket จำลอง: เก็บ handler ไว้ แล้วเทสต์ส่ง event เข้าไปเองด้วย fire()
const createFakeSocket = () => {
  const handlers = new Map();
  return {
    on: vi.fn((event, fn) => handlers.set(event, fn)),
    off: vi.fn((event) => handlers.delete(event)),
    fire: async (event, payload) => {
      await act(async () => {
        await handlers.get(event)?.(payload);
      });
    },
  };
};

const Probe = ({ enabled }) => {
  useModeratorAlerts(enabled);
  return null;
};

const renderAt = (path, enabled = true) => {
  const router = createMemoryRouter(
    [
      {
        path: '/qa',
        element: (
          <>
            <Probe enabled={enabled} />
            <p>หน้าบอร์ด</p>
          </>
        ),
      },
      {
        path: '/admin/reports',
        element: (
          <>
            <Probe enabled={enabled} />
            <p>หน้ารายงาน</p>
          </>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
};

const toastMessages = () => useUiStore.getState().toasts.map((t) => t.message);

describe('useModeratorAlerts', () => {
  let socket;

  beforeEach(() => {
    socket = createFakeSocket();
    vi.mocked(getSocket).mockReturnValue(socket);
    vi.mocked(readReportSummary).mockResolvedValue({ data: { pending: 2, urgent: 0 } });
  });

  afterEach(() => {
    vi.resetAllMocks();
    useUiStore.setState({ toasts: [], reportSummary: { pending: 0, urgent: 0 } });
  });

  it('ไม่ใช่ผู้ดูแล → ไม่ต่อ socket และไม่โหลดจำนวนรายงาน', () => {
    renderAt('/qa', false);
    expect(getSocket).not.toHaveBeenCalled();
    expect(readReportSummary).not.toHaveBeenCalled();
  });

  it('โหลดจำนวนรายงานที่รอตรวจ และโหลดใหม่เมื่อผู้ดูแลคนอื่นตรวจรายงานแล้ว', async () => {
    renderAt('/qa');
    await waitFor(() => expect(useUiStore.getState().reportSummary.pending).toBe(2));

    vi.mocked(readReportSummary).mockResolvedValue({ data: { pending: 1, urgent: 0 } });
    await socket.fire('admin:report-reviewed', { targetType: 'question', targetId: 'q1' });
    await waitFor(() => expect(useUiStore.getState().reportSummary.pending).toBe(1));
  });

  it('รายงานหัวข้อทั่วไป → ขึ้น toast ไม่มีหน้าต่างเด้ง', async () => {
    renderAt('/qa');
    await socket.fire('admin:report-created', { id: 'p1', targetType: 'answer', reason: 'spam' });
    expect(toastMessages()).toContain('มีรายงานใหม่เข้ามา');
    expect(confirmDialog).not.toHaveBeenCalled();
  });

  it('รายงานเสี่ยงทำร้ายตัวเอง → ขึ้นหน้าต่าง กด "ไปที่หน้ารายงาน" แล้วพาไปหน้ารายงาน', async () => {
    vi.mocked(confirmDialog).mockResolvedValue(true);
    renderAt('/qa');
    await socket.fire('admin:report-created', {
      id: 'p2',
      targetType: 'question',
      reason: 'self_harm',
    });
    expect(confirmDialog).toHaveBeenCalledWith(
      expect.objectContaining({ confirmText: 'ไปที่หน้ารายงาน', cancelText: 'ไว้ทีหลัง' }),
    );
    expect(await screen.findByText('หน้ารายงาน')).toBeInTheDocument();
  });

  it('รายงานเสี่ยงทำร้ายตัวเองตอนเปิดหน้ารายงานอยู่ → ไม่ขึ้นหน้าต่าง แค่ toast', async () => {
    renderAt('/admin/reports');
    await socket.fire('admin:report-created', {
      id: 'p3',
      targetType: 'question',
      reason: 'self_harm',
    });
    expect(confirmDialog).not.toHaveBeenCalled();
    expect(toastMessages().some((m) => m.includes('มีความเสี่ยงทำร้ายตัวเอง'))).toBe(true);
  });
});
