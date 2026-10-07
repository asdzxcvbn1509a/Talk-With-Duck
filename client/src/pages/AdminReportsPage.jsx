// หน้าผู้ดูแลคอมมูนิตี้: ตรวจรายการแจ้งรายงาน ซ่อนเนื้อหา ระงับ/ปลดระงับบัญชี และดูสถิติตามตัวชี้วัดข้อ 4.6
// ส่วนย่อยของหน้าอยู่ใน components/admin/ (StatsPanel, BannedUsers, ReportCard)
import { ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import BannedUsers from '../components/admin/BannedUsers';
import ReportCard from '../components/admin/ReportCard';
import StatsPanel from '../components/admin/StatsPanel';
import { EmptyState, PageTitle, Segmented, Spinner } from '../components/ui';
import { listBannedUsers, listReports } from '../api/admin';
import { useApiQuery } from '../hooks/useApiQuery';
import { toastError } from '../lib/api';
import { getSocket } from '../lib/socket';

const STATUS_TABS = [
  { value: 'pending', label: 'รอตรวจสอบ' },
  { value: 'actioned', label: 'จัดการแล้ว' },
  { value: 'dismissed', label: 'ยกเลิกแล้ว' },
];

const AdminReportsPage = () => {
  const [status, setStatus] = useState('pending');
  const { data, error, reload: load } = useApiQuery(listReports, { status });
  const { data: bans, reload: reloadBans } = useApiQuery(listBannedUsers);
  const reports = error ? [] : (data?.reports ?? null);

  // ระงับ/ปลดระงับแล้ว ป้าย “ถูกระงับแล้ว” บนการ์ดกับรายการบัญชีที่ถูกระงับต้องตรงกัน
  const refresh = () => {
    load();
    reloadBans();
  };

  useEffect(() => {
    if (error) toastError(error);
  }, [error]);

  // มีรายงานใหม่ หรือผู้ดูแลคนอื่นเพิ่งตรวจรายงาน ขณะเปิดหน้านี้อยู่: โหลดรายการใหม่
  // (toast/หน้าต่างแจ้งเตือนขึ้นจาก useModeratorAlerts ใน Layout ทุกหน้าอยู่แล้ว)
  useEffect(() => {
    const socket = getSocket();
    const onNew = () => {
      if (status === 'pending') load();
    };
    const onReviewed = () => {
      load();
      reloadBans();
    };
    socket.on('admin:report-created', onNew);
    socket.on('admin:report-reviewed', onReviewed);
    return () => {
      socket.off('admin:report-created', onNew);
      socket.off('admin:report-reviewed', onReviewed);
    };
  }, [status, load, reloadBans]);

  return (
    <div className="space-y-6">
      <PageTitle title="ดูแลคอมมูนิตี้" />
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-medium sm:text-3xl">
          <ShieldCheck size={28} className="shrink-0 text-calm-700 dark:text-calm-300" />
          ดูแลคอมมูนิตี้
        </h1>
        <p className="text-muted">ตรวจสอบรายงาน และดูสถิติการใช้งานสำหรับสรุปผลโครงการ</p>
      </header>

      <StatsPanel />

      <BannedUsers users={bans?.users} onChanged={refresh} />

      <Segmented
        label="สถานะรายงาน"
        options={STATUS_TABS}
        value={status}
        onChange={setStatus}
        fit
      />

      {reports === null ? (
        <div className="flex justify-center py-12 text-muted">
          <Spinner />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          mascot="duck-flower"
          title={status === 'pending' ? 'ไม่มีรายงานที่รอตรวจสอบ' : 'ยังไม่มีรายการ'}
        >
          บ่อเป็ดสงบสุขดี
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {reports.map((r) => (
            <ReportCard key={r.id} report={r} onReviewed={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdminReportsPage;
