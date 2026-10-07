// lib/api: การต่ออายุ session ด้วย refresh cookie ตาม docs/api.md แถว /auth/refresh และการแจ้ง error (toastError)
// อยู่ในโฟลเดอร์ src/api เพราะเทสต์ interceptor ต้องใช้ api ตัวกลาง
import axios, { AxiosError } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, refreshSession, toastError } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';

const session = { user: { id: 'u1', nickname: 'เป็ดทดสอบ' }, accessToken: 'test-access-token' };

const noCookie = { status: 204, data: '' };

describe('ต่ออายุ session (refresh cookie)', () => {
  beforeEach(() => {
    useAuthStore.setState({ status: 'loading', user: null, accessToken: null });
  });

  afterEach(() => vi.restoreAllMocks());

  it('ไม่มี cookie (204) = ยังไม่ได้เข้าสู่ระบบ: คืน null โดยไม่ throw', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue(noCookie);
    await expect(refreshSession()).resolves.toBeNull();
    expect(useAuthStore.getState()).toMatchObject({
      status: 'ready',
      user: null,
      accessToken: null,
    });
  });

  it('cookie ใช้ได้ (200) → ได้ session และเก็บลง store', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ status: 200, data: session });
    await expect(refreshSession()).resolves.toEqual(session);
    expect(useAuthStore.getState()).toMatchObject({ status: 'ready', ...session });
  });

  it('cookie ใช้ไม่ได้ (401) → reject และล้าง session', async () => {
    useAuthStore.setState({ status: 'ready', ...session });
    const unauthorized = Object.assign(new Error('Unauthorized'), { response: { status: 401 } });
    vi.spyOn(axios, 'post').mockRejectedValue(unauthorized);
    await expect(refreshSession()).rejects.toBe(unauthorized);
    expect(useAuthStore.getState()).toMatchObject({ user: null, accessToken: null });
  });

  it('token หมดอายุแต่ไม่มี session ให้ต่ออายุ → ได้ error เดิมกลับ และไม่ยิง request ซ้ำ', async () => {
    useAuthStore.setState({ status: 'ready', ...session });
    const adapter = vi.fn(async (config) => {
      throw new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, null, {
        status: 401,
        data: { error: { code: 'TOKEN_EXPIRED', message: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' } },
        headers: {},
        config,
      });
    });
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue(noCookie);

    await expect(api.get('/me', { adapter })).rejects.toMatchObject({
      response: { status: 401, data: { error: { code: 'TOKEN_EXPIRED' } } },
    });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});

describe('toastError', () => {
  afterEach(() => useUiStore.setState({ toasts: [] }));

  it('แจ้งข้อความภาษาไทยจาก server ถ้ามี ไม่งั้นบอกว่าเชื่อมต่อไม่ได้ (toast สีแดง)', () => {
    useUiStore.setState({ toasts: [] });
    toastError({ response: { status: 409, data: { error: { message: 'ห้องเต็มแล้ว' } } } });
    toastError(new Error('Network Error'));
    const toasts = useUiStore.getState().toasts.map(({ message, tone }) => ({ message, tone }));
    expect(toasts).toEqual([
      { message: 'ห้องเต็มแล้ว', tone: 'error' },
      { message: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่', tone: 'error' },
    ]);
  });
});
