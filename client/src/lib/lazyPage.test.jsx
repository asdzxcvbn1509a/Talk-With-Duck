// โหลดหน้าแบบ lazy: โหลดไม่สำเร็จ (เช่น หลัง deploy) ให้รีโหลดเว็บเองหนึ่งครั้ง ถ้ายังไม่ได้จึงแสดงหน้า error
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RouteError from '../components/RouteError';
import { PageLoadError, lazyPage } from './lazyPage';

const Page = () => <p>หน้าที่โหลดมา</p>;
const loaded = async () => ({ default: Page });
const failed = async () => {
  throw new TypeError('Failed to fetch dynamically imported module: /assets/LobbyPage-old.js');
};

/** ดูว่า promise ยังค้างอยู่ไหม (lazyPage คืน promise ที่ไม่จบระหว่างรอเบราว์เซอร์รีโหลด) */
const isPending = async (promise) => {
  let settled = false;
  const watch = async () => {
    try {
      await promise;
    } catch {
      // ดูแค่ว่าจบหรือยัง ไม่สนผล
    } finally {
      settled = true;
    }
  };
  watch();
  await new Promise((resolve) => setTimeout(resolve, 20));
  return !settled;
};

const renderRoute = (route) => {
  const router = createMemoryRouter([
    {
      HydrateFallback: () => null,
      ErrorBoundary: RouteError,
      children: [{ index: true, ...route }],
    },
  ]);
  render(<RouterProvider router={router} />);
};

describe('lazyPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    // React รายงาน error ที่ ErrorBoundary จับได้ลง console
    // (ส่วนข้อความ "Not implemented: navigation" มาจาก jsdom ตอนสั่งรีโหลด แสดงว่ารีโหลดจริง ซึ่งเป็นผลที่ต้องการ)
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('โหลดสำเร็จ → ได้ Component ของหน้า', async () => {
    expect(await lazyPage(loaded)()).toEqual({ Component: Page });
  });

  it('โหลดไม่สำเร็จครั้งแรก → รีโหลดเว็บเอง · ยังไม่ได้อีก → PageLoadError', async () => {
    expect(await isPending(lazyPage(failed)())).toBe(true);

    const again = lazyPage(failed)();
    await expect(again).rejects.toBeInstanceOf(PageLoadError);
    await expect(again).rejects.toHaveProperty('cause', expect.any(TypeError));
  });

  it('โหลดหน้าไหนสำเร็จแล้ว → deploy ครั้งถัดไปรีโหลดเองได้อีก', async () => {
    expect(await isPending(lazyPage(failed)())).toBe(true);
    await lazyPage(loaded)();
    expect(await isPending(lazyPage(failed)())).toBe(true);
  });

  it('รีโหลดแล้วยังโหลดไม่ได้ → หน้า error บอกให้โหลดใหม่', async () => {
    await isPending(lazyPage(failed)());
    renderRoute({ lazy: lazyPage(failed) });

    expect(
      await screen.findByText('มีเว็บเวอร์ชันใหม่ หรือการเชื่อมต่อขัดข้อง'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'โหลดหน้าใหม่' })).toBeInTheDocument();
  });

  it('error อื่นในหน้า → ข้อความทั่วไป', async () => {
    const Broken = () => {
      throw new Error('bug');
    };
    renderRoute({ lazy: lazyPage(async () => ({ default: Broken })) });

    expect(await screen.findByText('เกิดข้อผิดพลาดบางอย่าง')).toBeInTheDocument();
  });
});
