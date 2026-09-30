// หน้าผู้ดูแลคอมมูนิตี้: ตรวจรายการแจ้งรายงาน ซ่อนเนื้อหา ระงับ/ปลดระงับบัญชี และดูสถิติตามตัวชี้วัดข้อ 4.6
import {
  Ban,
  CircleCheck,
  DoorClosed,
  EyeOff,
  ShieldCheck,
  Sun,
  TriangleAlert,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import DuckAvatar from '../components/DuckAvatar';
import { Badge, Button, EmptyState, Spinner } from '../components/ui';
import { REPORT_REASONS, ROOM_TYPES } from '../config/constants';
import { listBannedUsers, listReports, readStats, reviewReport, unbanUser } from '../api/admin';
import { useApiQuery } from '../hooks/useApiQuery';
import { errorMessage } from '../lib/api';
import { confirmDialog } from '../lib/dialog';
import { getSocket } from '../lib/socket';
import { timeAgo } from '../lib/format';
import { toast } from '../stores/uiStore';

const TARGET_LABELS = {
  question: 'กระทู้',
  answer: 'คำตอบ',
  message: 'ข้อความแชท',
  user: 'ผู้ใช้',
  room: 'ห้อง',
};
const STATUS_TABS = [
  ['pending', 'รอตรวจสอบ'],
  ['actioned', 'จัดการแล้ว'],
  ['dismissed', 'ยกเลิกแล้ว'],
];

const StatTile = ({ label, value, sub }) => {
  return (
    <div className="card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-3xl">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
};

const Stats = () => {
  const stats = useApiQuery(readStats).data?.stats;
  if (!stats) return null;
  const byYear = Object.entries(stats.users.byYear)
    .map(([y, n]) => `ปี${y} ${n}`)
    .join(' · ');
  return (
    <section aria-label="สถิติการใช้งาน" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatTile label="สมาชิก" value={stats.users.total} sub={byYear} />
      <StatTile
        label="ห้องที่เคยเปิด"
        value={stats.rooms.total}
        sub={`1-1 ${stats.rooms.byType.private} · กลุ่ม ${stats.rooms.byType.group} · คาราโอเกะ ${stats.rooms.byType.karaoke}`}
      />
      <StatTile
        label="คำถาม / คำตอบ"
        value={`${stats.qa.questions} / ${stats.qa.answers}`}
        sub={`ส่งใจ ${stats.qa.loves} ครั้ง`}
      />
      <StatTile
        label="ร่วมคาราโอเกะ"
        value={stats.karaoke.participants}
        sub={`เล่นไป ${stats.karaoke.songsPlayed} เพลง`}
      />
      <StatTile
        label="เปิดอยู่ตอนนี้"
        value={stats.rooms.activeNow}
        sub={`รอตรวจสอบ ${stats.reports.pending} รายการ`}
      />
    </section>
  );
};

// บัญชีที่ถูกระงับ แสดงเฉพาะเมื่อมี · ใช้คำว่า “ปลดระงับ” ไม่ให้สับสนกับปุ่ม “ยกเลิก” ในหน้าต่างยืนยัน
const BannedUsers = ({ users, onChanged }) => {
  const [busy, setBusy] = useState(null);

  const unban = async (user) => {
    const confirmed = await confirmDialog({
      title: `ปลดระงับบัญชี “${user.nickname}” ใช่ไหม?`,
      text: 'ผู้ใช้จะเข้าสู่ระบบได้อีกครั้ง ส่วนเนื้อหาที่ถูกซ่อนไว้จะยังซ่อนอยู่',
      confirmText: 'ปลดระงับ',
      icon: UserCheck,
    });
    if (!confirmed) return;
    setBusy(user.id);
    try {
      await unbanUser(user.id);
      toast(`ปลดระงับบัญชี “${user.nickname}” แล้ว`, 'success');
      onChanged();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!users?.length) return null;
  return (
    <section className="card space-y-2 p-5">
      <h2 className="flex items-center gap-2 font-medium">
        <UserX size={20} className="shrink-0 text-danger" />
        บัญชีที่ถูกระงับ ({users.length})
      </h2>
      <ul className="divide-y divide-line">
        {users.map((user) => (
          <li key={user.id} className="flex items-center gap-3 py-2">
            <DuckAvatar avatar={user.avatar} size={32} />
            <span className="min-w-0 flex-1 truncate">
              {user.nickname} <span className="text-sm text-muted">(ปี {user.year})</span>
            </span>
            <Button
              size="sm"
              variant="soft"
              loading={busy === user.id}
              aria-label={`ปลดระงับ ${user.nickname}`}
              onClick={() => unban(user)}
            >
              ปลดระงับ
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
};

const TargetPreview = ({ report }) => {
  const { target, targetType } = report;
  if (!target.exists) return <p className="text-sm text-muted italic">(ถูกลบไปแล้ว)</p>;
  const hidden = target.isHidden || target.isActive === false;
  const roomType = targetType === 'room' ? ROOM_TYPES[target.roomType] : null;
  return (
    <div className={`rounded-2xl bg-surface-2 p-3 text-sm ${hidden ? 'opacity-60' : ''}`}>
      {targetType === 'question' && (
        <>
          <Link to={`/qa/${target.questionId}`} className="font-semibold hover:underline">
            {target.title}
          </Link>
          <p className="mt-1 line-clamp-3 text-muted">{target.content}</p>
        </>
      )}
      {targetType === 'answer' && (
        <>
          <p className="line-clamp-4">{target.content}</p>
          <Link
            to={`/qa/${target.questionId}`}
            className="mt-1 inline-block text-xs text-calm-600 hover:underline dark:text-calm-300"
          >
            ดูกระทู้
          </Link>
        </>
      )}
      {targetType === 'message' && (
        <p className="line-clamp-4">
          {target.type === 'sticker' ? `[สติกเกอร์ ${target.content}]` : target.content}
        </p>
      )}
      {targetType === 'user' && <p>ผู้ใช้ “{target.nickname}”</p>}
      {targetType === 'room' && (
        <p className="flex items-center gap-1.5">
          {roomType && <roomType.icon size={16} className="shrink-0" />} {target.name}{' '}
          {target.isActive ? '' : '(ปิดแล้ว)'}
        </p>
      )}
      {hidden && <p className="mt-1 text-xs font-semibold text-danger">ซ่อน/ปิดแล้ว</p>}
    </div>
  );
};

const ReportCard = ({ report, onReviewed }) => {
  const [busy, setBusy] = useState(null);
  const urgent = report.reason === 'self_harm';

  const act = async (action) => {
    // ข้อความบนปุ่มยืนยันตรงกับปุ่มที่ผู้ดูแลกด
    const dialogs = {
      hide:
        report.targetType === 'room'
          ? {
              title: 'ปิดห้องนี้ใช่ไหม?',
              text: 'ทุกคนในห้องจะถูกพาออกจากห้องทันที',
              confirmText: 'ปิดห้อง',
              icon: DoorClosed,
              danger: true,
            }
          : {
              title: 'ซ่อนเนื้อหานี้จากทุกคนใช่ไหม?',
              confirmText: 'ซ่อนเนื้อหา',
              icon: EyeOff,
              danger: true,
            },
      ban: {
        title: `ระงับบัญชี “${report.owner?.nickname}” ใช่ไหม?`,
        text: 'ผู้ใช้จะถูกออกจากระบบทันที',
        confirmText: 'ระงับบัญชี',
        icon: Ban,
        danger: true,
      },
      dismiss: {
        title: 'ไม่พบการทำผิดใช่ไหม?',
        text: 'รายงานทั้งหมดของเนื้อหานี้จะถูกปิด โดยไม่ซ่อนหรือลบอะไร',
        confirmText: 'ไม่พบการทำผิด',
        icon: CircleCheck,
      },
    };
    if (!(await confirmDialog(dialogs[action]))) return;
    setBusy(action);
    try {
      await reviewReport(report.id, { action });
      toast('บันทึกการตรวจสอบแล้ว', 'success');
      onReviewed();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className={`card space-y-3 p-5 ${urgent ? 'ring-2 ring-danger' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={urgent ? 'danger' : 'beak'}>{REPORT_REASONS[report.reason]}</Badge>
        <Badge tone="muted">{TARGET_LABELS[report.targetType]}</Badge>
        {report.sameTargetCount > 1 && (
          <Badge tone="danger">ถูกรายงาน {report.sameTargetCount} ครั้ง</Badge>
        )}
        <span className="ml-auto text-xs text-muted">{timeAgo(report.createdAt)}</span>
      </div>
      {urgent && (
        <p className="flex gap-2 rounded-2xl bg-danger-soft p-3 text-sm text-danger">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <span>
            อาจมีความเสี่ยงทำร้ายตัวเอง — ควรติดต่อผู้ใช้/อาจารย์ที่ปรึกษาโดยเร็ว
            และแนะนำสายด่วนสุขภาพจิต 1323
          </span>
        </p>
      )}
      <TargetPreview report={report} />
      {report.details && <p className="text-sm">“{report.details}”</p>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        {report.owner && (
          <span className="flex min-w-0 items-center gap-1">
            เจ้าของ: <DuckAvatar avatar={report.owner.avatar} size={18} />
            <span className="min-w-0 truncate">
              {report.owner.nickname} (ปี {report.owner.year})
            </span>
            {report.owner.isBanned && <Badge tone="danger">ถูกระงับแล้ว</Badge>}
          </span>
        )}
        <span>ผู้รายงาน: {report.reporter?.nickname}</span>
        {report.reviewedBy && <span>ตรวจโดย: {report.reviewedBy.nickname}</span>}
      </div>
      {report.status === 'pending' && (
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          {report.targetType !== 'user' && report.target.exists && (
            <Button size="sm" variant="soft" loading={busy === 'hide'} onClick={() => act('hide')}>
              {report.targetType === 'room' ? 'ปิดห้อง' : 'ซ่อนเนื้อหา'}
            </Button>
          )}
          {report.owner && !report.owner.isBanned && (
            <Button size="sm" variant="danger" loading={busy === 'ban'} onClick={() => act('ban')}>
              ระงับบัญชี
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            loading={busy === 'dismiss'}
            onClick={() => act('dismiss')}
          >
            ไม่พบการทำผิด
          </Button>
        </div>
      )}
    </li>
  );
};

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
    if (error) toast(errorMessage(error), 'error');
  }, [error]);

  // มีรายงานใหม่เข้ามาขณะเปิดหน้านี้
  useEffect(() => {
    const socket = getSocket();
    const onNew = () => {
      toast('มีรายงานใหม่เข้ามา');
      if (status === 'pending') load();
    };
    socket.on('admin:report-created', onNew);
    return () => socket.off('admin:report-created', onNew);
  }, [status, load]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-medium sm:text-3xl">
          <ShieldCheck size={28} className="shrink-0 text-calm-600 dark:text-calm-300" />
          ดูแลคอมมูนิตี้
        </h1>
        <p className="text-muted">ตรวจสอบรายงาน และดูสถิติการใช้งานสำหรับสรุปผลโครงการ</p>
      </header>

      <Stats />

      <BannedUsers users={bans?.users} onChanged={refresh} />

      <div
        className="flex gap-1 rounded-full bg-surface-2 p-1 text-sm font-semibold sm:w-fit"
        role="tablist"
      >
        {STATUS_TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={status === key}
            onClick={() => setStatus(key)}
            className={`flex-1 rounded-full px-2 py-2 transition sm:flex-none sm:px-4 ${status === key ? 'bg-surface shadow' : 'text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {reports === null ? (
        <div className="flex justify-center py-12 text-muted">
          <Spinner />
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Sun}
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
