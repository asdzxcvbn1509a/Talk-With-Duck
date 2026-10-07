// ผู้ดูแลรู้ทันทีเมื่อมีรายงานใหม่ ไม่ว่าจะอยู่หน้าไหน (เดิมรู้เฉพาะตอนเปิดหน้ารายงาน)
// - จำนวนรายงานที่รอตรวจเก็บใน uiStore ให้เมนูแสดงป้ายตัวเลข
// - รายงาน "มีความเสี่ยงทำร้ายตัวเอง" ขึ้นหน้าต่างชวนไปดูทันที ส่วนหัวข้ออื่นขึ้น toast
import { TriangleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { readReportSummary } from '../api/admin';
import { getSocket } from '../lib/socket';
import { toast, useUiStore } from '../stores/uiStore';

const ADMIN_PATH = '/admin/reports';
const URGENT_TOAST = 'มีรายงาน “มีความเสี่ยงทำร้ายตัวเอง” เข้ามา ตรวจรายการนี้ก่อนนะ';

/**
 * หน้าต่างชวนไปดูรายงานด่วน · คืน true เมื่อกด "ไปที่หน้ารายงาน"
 * โหลดโค้ดหน้าต่าง (SweetAlert2) ตอนจะใช้เท่านั้น: Layout อยู่ในไฟล์แรกที่ทุกคนโหลด
 * ถ้า import ตรง ๆ ไฟล์แรกจะใหญ่ขึ้นสำหรับทุกคน ทั้งที่ใช้แค่ผู้ดูแลไม่กี่คน
 */
const askToOpenReports = async () => {
  const { confirmDialog } = await import('../lib/dialog');
  return confirmDialog({
    title: 'มีรายงานว่าเพื่อนอาจมีความเสี่ยงทำร้ายตัวเอง',
    text: 'รายงานนี้ควรดูก่อนเรื่องอื่น เปิดหน้ารายงานเพื่อตรวจและส่งช่องทางช่วยเหลือให้เพื่อนได้เลย',
    confirmText: 'ไปที่หน้ารายงาน',
    cancelText: 'ไว้ทีหลัง',
    icon: TriangleAlert,
  });
};

export const useModeratorAlerts = (enabled) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // อ่าน path ล่าสุดผ่าน ref: ไม่ต้องสมัครรับ event ใหม่ทุกครั้งที่เปลี่ยนหน้า
  const pathRef = useRef(pathname);
  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!enabled) return undefined;
    const socket = getSocket();
    let active = true;

    const refresh = async () => {
      try {
        const { data } = await readReportSummary();
        if (active) useUiStore.getState().setReportSummary(data);
      } catch {
        // โหลดไม่สำเร็จ (เช่น เน็ตหลุด): ใช้ตัวเลขเดิมไปก่อน รอบหน้าค่อยโหลดใหม่
      }
    };

    const onCreated = async ({ reason }) => {
      refresh();
      if (reason !== 'self_harm') {
        toast('มีรายงานใหม่เข้ามา');
        return;
      }
      // อยู่หน้ารายงานอยู่แล้ว: การ์ดกรอบแดงขึ้นในรายการให้เห็นทันที
      if (pathRef.current === ADMIN_PATH) {
        toast(URGENT_TOAST, 'error');
        return;
      }
      let go;
      try {
        go = await askToOpenReports();
      } catch {
        // โหลดโค้ดหน้าต่างไม่สำเร็จ (เช่น เน็ตสะดุด): แจ้งด้วย toast แทน
        toast(URGENT_TOAST, 'error');
        return;
      }
      if (go && active) navigate(ADMIN_PATH);
    };

    socket.on('admin:report-created', onCreated);
    // ผู้ดูแลคนอื่นตรวจรายงานแล้ว หรือเน็ตเพิ่งต่อกลับมา: โหลดตัวเลขใหม่
    socket.on('admin:report-reviewed', refresh);
    socket.on('connect', refresh);
    refresh();
    return () => {
      active = false;
      socket.off('admin:report-created', onCreated);
      socket.off('admin:report-reviewed', refresh);
      socket.off('connect', refresh);
    };
  }, [enabled, navigate]);
};
