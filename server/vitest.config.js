import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    globalSetup: ['tests/global-setup.js'],
    // เทสต์ integration ใช้ฐานข้อมูลเดียวกัน จึงรันทีละไฟล์
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
