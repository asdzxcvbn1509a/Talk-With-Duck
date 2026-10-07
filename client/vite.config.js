import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// รูปตัวอย่างลิงก์ (og:image) ต้องเป็น URL เต็ม LINE/Facebook ถึงจะแสดง
// ใช้ VITE_SITE_URL หรือโดเมน production ที่ Vercel ส่งให้ตอน build (VERCEL_PROJECT_PRODUCTION_URL ไม่มี https://)
// ไม่รู้โดเมน (เช่น build ในเครื่อง) ก็ไม่ใส่ ดีกว่าใส่ URL ที่เปิดไม่ได้
const linkPreview = (siteUrl) => ({
  name: 'link-preview',
  transformIndexHtml: () => {
    if (!siteUrl) return [];
    const image = `${siteUrl.replace(/\/+$/, '')}/og-image.png`;
    const meta = (attrs) => ({ tag: 'meta', attrs, injectTo: 'head' });
    return [
      meta({ property: 'og:image', content: image }),
      meta({ property: 'og:image:width', content: '1200' }),
      meta({ property: 'og:image:height', content: '630' }),
      meta({ property: 'og:image:alt', content: 'น้องเป็ดของมัลติเล่า มัลติฟัง Talk With Duck' }),
      meta({ name: 'twitter:card', content: 'summary_large_image' }),
    ];
  },
});

// dev: ส่ง /api และ /socket.io ต่อไปที่ Express (localhost:4000) ให้เป็น same-origin เหมือนตอน deploy
// `npm run dev:https` เปิด HTTPS เพื่อทดสอบไมโครโฟนบนมือถือในวง LAN
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const siteUrl = env.VITE_SITE_URL || (vercelDomain ? `https://${vercelDomain}` : '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      linkPreview(siteUrl),
      ...(mode === 'https' ? [basicSsl()] : []),
    ],
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
  };
});
