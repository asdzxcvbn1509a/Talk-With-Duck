// จุดเริ่มต้นของหน้าเว็บ: โหลดฟอนต์ (Noto Sans Thai สำหรับเนื้อหา, Mitr สำหรับหัวข้อ) แล้วแสดง App
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/noto-sans-thai/400.css';
import '@fontsource/noto-sans-thai/600.css';
import '@fontsource/noto-sans-thai/700.css';
import '@fontsource/mitr/400.css';
import '@fontsource/mitr/500.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
