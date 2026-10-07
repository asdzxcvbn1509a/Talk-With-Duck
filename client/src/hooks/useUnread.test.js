// ป้ายข้อความที่ยังไม่อ่านบนปุ่มแชท: นับจากข้อความที่ได้รับทั้งหมด ไม่ใช่ความยาวรายการ
// (รายการในห้องเก็บแค่ 200 ข้อความล่าสุด และข้อความที่ผู้ดูแลซ่อนจะถูกเอาออก)
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useRoomStore } from '../stores/roomStore';
import { useUnread } from './useUnread';

const message = (i) => ({ id: `m${i}`, type: 'text', content: `ข้อความที่ ${i}` });

/** ข้อความใหม่เข้ามาทาง socket (chat:message) */
const receive = (...messages) => {
  act(() => {
    for (const m of messages) useRoomStore.getState().addMessage(m);
  });
};

describe('useUnread', () => {
  beforeEach(() => useRoomStore.getState().reset('r1'));
  afterEach(() => useRoomStore.getState().reset());

  it('ข้อความเกิน 200 ยังนับต่อ และผู้ดูแลซ่อนข้อความแล้วตัวนับไม่ลดลง', () => {
    const { result } = renderHook(() => useUnread(false));
    receive(...Array.from({ length: 205 }, (_, i) => message(i)));
    expect(useRoomStore.getState().messages).toHaveLength(200);
    expect(result.current).toBe(205);

    act(() => useRoomStore.getState().hideMessage('m204'));
    expect(result.current).toBe(205);
  });

  it('เปิดแชทอยู่ = อ่านแล้วทั้งหมด · ปิดแล้วนับเฉพาะข้อความใหม่', () => {
    const { result, rerender } = renderHook(({ open }) => useUnread(open), {
      initialProps: { open: true },
    });
    receive(message(1), message(2));
    expect(result.current).toBe(0);

    rerender({ open: false });
    receive(message(3));
    expect(result.current).toBe(1);
  });

  it('ต่อใหม่หลังเน็ตหลุด (ได้รายการข้อความทั้งชุด) → นับเฉพาะข้อความที่พลาดไป', () => {
    act(() => useRoomStore.getState().setMessages([message(1), message(2)]));
    const { result } = renderHook(() => useUnread(false));
    expect(result.current).toBe(0);

    act(() => useRoomStore.getState().setMessages([message(1), message(2), message(3)]));
    expect(result.current).toBe(1);
  });

  it('ออกแล้วกลับเข้าห้องในหน้าเดิม (store ถูก reset) → เริ่มนับใหม่จากข้อความของห้อง', () => {
    const { result, rerender } = renderHook(({ open }) => useUnread(open), {
      initialProps: { open: true },
    });
    receive(message(1), message(2), message(3)); // อ่านแล้ว 3 ข้อความ
    rerender({ open: false });

    act(() => useRoomStore.getState().reset('r1'));
    act(() => useRoomStore.getState().setMessages([message(1)]));
    expect(result.current).toBe(1);
  });
});
