import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useApiQuery } from './useApiQuery';

describe('useApiQuery', () => {
  it('เรียกฟังก์ชันด้วย arg ที่ส่งเข้าไป และโหลดใหม่เมื่อ arg เปลี่ยน', async () => {
    const fetcher = vi.fn(async (arg) => ({ data: { got: arg } }));
    const { result, rerender } = renderHook(({ arg }) => useApiQuery(fetcher, arg), {
      initialProps: { arg: { year: 1 } },
    });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual({ got: { year: 1 } }));
    expect(result.current.loading).toBe(false);

    rerender({ arg: { year: 2 } });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data).toEqual({ got: { year: 2 } }));

    // arg ค่าเดิม (object ใหม่แต่เนื้อหาเหมือนกัน) ต้องไม่ยิงซ้ำ
    rerender({ arg: { year: 2 } });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('ส่ง null แทนฟังก์ชัน = ยังไม่โหลด', () => {
    const { result } = renderHook(() => useApiQuery(null));
    expect(result.current).toMatchObject({ data: undefined, error: null, loading: false });
  });

  it('เก็บ error ไว้ให้หน้าเว็บแสดงผล', async () => {
    const failure = new Error('boom');
    const failing = () => Promise.reject(failure);
    const { result } = renderHook(() => useApiQuery(failing, 'x'));
    await waitFor(() => expect(result.current.error).toBe(failure));
    expect(result.current.data).toBeUndefined();
  });
});
