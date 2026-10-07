// โหมดสว่าง/มืดที่เลือกในหน้า "ฉัน": ตั้ง data-theme ที่ <html> จำค่าไว้ และ "ตามเครื่อง" ตามการตั้งค่าของระบบ
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_KEY,
  applyTheme,
  readThemePreference,
  setThemePreference,
  watchSystemTheme,
} from './theme';

// จำลองการตั้งค่าโหมดของระบบ และเก็บตัวฟังการเปลี่ยนโหมดไว้เรียกเอง
const mockSystem = (dark) => {
  const media = {
    matches: dark,
    listeners: [],
    addEventListener: (_event, fn) => media.listeners.push(fn),
    removeEventListener: (_event, fn) => {
      media.listeners = media.listeners.filter((l) => l !== fn);
    },
  };
  window.matchMedia = vi.fn(() => media);
  return media;
};

describe('theme', () => {
  const originalMatchMedia = window.matchMedia;
  let meta;

  beforeEach(() => {
    localStorage.clear();
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#FFC93C';
    document.head.appendChild(meta);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    meta.remove();
    delete document.documentElement.dataset.theme;
  });

  it('เลือกโหมดมืด → <html data-theme="dark"> จำค่าไว้ และเปลี่ยนสีแถบเบราว์เซอร์', () => {
    mockSystem(false);
    setThemePreference('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(readThemePreference()).toBe('dark');
    expect(meta.content).toBe('#1c1814');

    setThemePreference('light');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(meta.content).toBe('#FFC93C');
  });

  it('"ตามเครื่อง" ใช้โหมดของระบบ', () => {
    mockSystem(true);
    applyTheme('system');
    expect(document.documentElement.dataset.theme).toBe('dark');

    mockSystem(false);
    applyTheme('system');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('ยังไม่เคยเลือก หรือค่าที่จำไว้ไม่ถูกต้อง → ตามเครื่อง', () => {
    expect(readThemePreference()).toBe('system');
    localStorage.setItem(THEME_KEY, 'neon');
    expect(readThemePreference()).toBe('system');
  });

  it('เลือก "ตามเครื่อง" แล้วระบบเปลี่ยนโหมด → หน้าเว็บเปลี่ยนตาม · เลือกโหมดเองไว้ → ไม่เปลี่ยน', () => {
    const media = mockSystem(false);
    setThemePreference('system');
    const stop = watchSystemTheme();
    expect(document.documentElement.dataset.theme).toBe('light');

    media.matches = true;
    media.listeners.forEach((fn) => fn());
    expect(document.documentElement.dataset.theme).toBe('dark');

    setThemePreference('light');
    media.listeners.forEach((fn) => fn());
    expect(document.documentElement.dataset.theme).toBe('light');

    stop();
    expect(media.listeners).toHaveLength(0);
  });
});
