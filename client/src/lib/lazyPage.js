// โหลดโค้ดของหน้าเมื่อเข้าหน้านั้นครั้งแรก (lazy route) · Vite แยกแต่ละหน้าเป็นไฟล์ของตัวเองจาก import()
// โหลดไม่สำเร็จมักเป็นเพราะเพิ่ง deploy เวอร์ชันใหม่ ไฟล์เก่าจึงหายไป: รีโหลดเว็บเองหนึ่งครั้งเพื่อรับไฟล์ชุดใหม่
// ถ้ายังไม่ได้อีก (เช่น เน็ตหลุด) ส่ง PageLoadError ให้ RouteError แสดงปุ่มโหลดหน้าใหม่
const RELOADED_KEY = 'talk-with-duck:page-reloaded';

export class PageLoadError extends Error {
  name = 'PageLoadError';
}

const hasReloaded = () => {
  try {
    return sessionStorage.getItem(RELOADED_KEY) === '1';
  } catch {
    return true; // อ่าน storage ไม่ได้: ไม่รีโหลดเอง กันวนไม่รู้จบ
  }
};

const setReloaded = (reloaded) => {
  try {
    if (reloaded) sessionStorage.setItem(RELOADED_KEY, '1');
    else sessionStorage.removeItem(RELOADED_KEY);
  } catch {
    // เบราว์เซอร์บล็อก storage: ข้ามไป (hasReloaded จะถือว่ารีโหลดแล้ว)
  }
};

export const lazyPage = (load) => async () => {
  try {
    const { default: Component } = await load();
    setReloaded(false);
    return { Component };
  } catch (err) {
    if (!hasReloaded()) {
      setReloaded(true);
      window.location.reload();
      return new Promise(() => {}); // รอเบราว์เซอร์โหลดหน้าใหม่ ไม่ต้องแสดงหน้า error
    }
    throw new PageLoadError('โหลดหน้านี้ไม่สำเร็จ', { cause: err });
  }
};
