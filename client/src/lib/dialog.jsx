// หน้าต่างยืนยันของแอป (SweetAlert2) ใช้แทน alert/confirm ของเบราว์เซอร์ (ESLint no-alert กันไว้)
// - ไอคอนเป็น lucide ผ่าน sweetalert2-react-content เหมือนส่วนอื่นของแอป
// - สี ขอบโค้ง และโหมดมืดตาม Modal ของแอป (ตั้งใน index.css) · ปุ่มใช้ class เดียวกับ <Button>
import { TriangleAlert } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { buttonClass } from '../components/buttonClass';

const DuckSwal = withReactContent(Swal);

/**
 * ถามยืนยันก่อนทำรายการ · คืน true เมื่อกดยืนยัน
 * title/text แสดงเป็นข้อความเสมอ (ไม่แปลงเป็น HTML) จึงใส่ข้อมูลที่ผู้ใช้พิมพ์ เช่น ชื่อเล่น ได้ปลอดภัย
 * danger: ปุ่มยืนยันสีแดงและโฟกัสปุ่มยกเลิกไว้ก่อน กันกด Enter แล้วลบทันที (ลบ ระงับบัญชี ฯลฯ)
 */
export const confirmDialog = async ({
  title,
  text,
  confirmText = 'ยืนยัน',
  cancelText = 'ยกเลิก',
  icon: Icon = TriangleAlert,
  danger = false,
}) => {
  const { isConfirmed } = await DuckSwal.fire({
    // title ของ SweetAlert2 เป็น HTML (ชื่อเล่นอย่าง <img onerror=...> จะรันโค้ดได้) จึงใช้ titleText
    titleText: title,
    text,
    icon: 'warning',
    iconHtml: <Icon size={40} />,
    iconColor: danger ? 'var(--color-danger)' : 'var(--color-duck-500)',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    // ปุ่มยกเลิกอยู่ซ้าย ปุ่มยืนยันอยู่ขวา เหมือน Modal ของแอป
    reverseButtons: true,
    focusCancel: danger,
    buttonsStyling: false,
    customClass: {
      actions: 'gap-2',
      confirmButton: buttonClass({ variant: danger ? 'danger' : 'primary' }),
      cancelButton: buttonClass({ variant: 'soft' }),
    },
  });
  return isConfirmed;
};
