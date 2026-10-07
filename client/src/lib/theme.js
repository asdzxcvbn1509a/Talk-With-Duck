// โหมดสว่าง/มืดที่ผู้ใช้เลือกในหน้า "ฉัน": ตามเครื่อง (system) / สว่าง (light) / มืด (dark)
// - ตั้ง data-theme="light|dark" ที่ <html> แล้ว CSS (index.css) กับ class dark: ของ Tailwind เปลี่ยนสีตาม
// - index.html มี script สั้น ๆ ทำแบบเดียวกันก่อนหน้าเว็บวาด (จอจะได้ไม่กระพริบเป็นสีสว่าง) แก้ที่นี่ต้องแก้ที่นั่นด้วย
export const THEME_KEY = 'twd-theme';
export const THEMES = ['system', 'light', 'dark'];

// สีแถบเบราว์เซอร์บนมือถือ (meta theme-color)
const THEME_COLORS = { light: '#FFC93C', dark: '#1c1814' };

const systemPrefersDark = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

export const readThemePreference = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return THEMES.includes(saved) ? saved : 'system';
  } catch {
    // เบราว์เซอร์ปิด localStorage (เช่น โหมดส่วนตัวบางตัว): ใช้ตามเครื่อง
    return 'system';
  }
};

export const applyTheme = (preference) => {
  const dark = preference === 'dark' || (preference === 'system' && systemPrefersDark());
  const theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
};

export const setThemePreference = (preference) => {
  try {
    localStorage.setItem(THEME_KEY, preference);
  } catch {
    // จำค่าไม่ได้ก็ยังเปลี่ยนโหมดได้ในครั้งนี้
  }
  applyTheme(preference);
};

/** เลือก "ตามเครื่อง" ไว้ แล้วผู้ใช้เปลี่ยนโหมดของระบบระหว่างเปิดเว็บ: เปลี่ยนตามทันที · คืนฟังก์ชันเลิกฟัง */
export const watchSystemTheme = () => {
  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (!media) return () => {};
  const onChange = () => {
    if (readThemePreference() === 'system') applyTheme('system');
  };
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};
