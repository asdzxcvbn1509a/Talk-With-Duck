import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// dev: ส่ง /api และ /socket.io ต่อไปที่ Express (localhost:4000) ให้เป็น same-origin เหมือนตอน deploy
// `npm run dev:https` เปิด HTTPS เพื่อทดสอบไมโครโฟนบนมือถือในวง LAN
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), ...(mode === 'https' ? [basicSsl()] : [])],
  server: {
    port: 5173,
    // ปุ่ม Google บน http://localhost ต้องใช้ Referrer-Policy นี้ (ตามคู่มือ Google Identity Services)
    headers: { 'Referrer-Policy': 'no-referrer-when-downgrade' },
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/socket.io': { target: 'http://localhost:4000', ws: true, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.js'],
    css: false,
  },
}));
