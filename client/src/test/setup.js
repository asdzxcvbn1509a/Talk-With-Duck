import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

// jsdom ไม่มี innerText แต่ SweetAlert2 ใช้ใส่หัวข้อแบบข้อความ (titleText) · เทสต์ไม่สนการจัดหน้าจึงใช้ textContent แทนได้
if (!('innerText' in HTMLElement.prototype)) {
  Object.defineProperty(HTMLElement.prototype, 'innerText', {
    configurable: true,
    get() {
      return this.textContent;
    },
    set(value) {
      this.textContent = value;
    },
  });
}

// jsdom ไม่มี window.matchMedia แต่ SweetAlert2 (lib/dialog.jsx) เรียกใช้ตอนแสดงไอคอน
window.matchMedia ??= (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
});
