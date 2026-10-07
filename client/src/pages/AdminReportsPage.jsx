// หน้าผู้ดูแลคอมมูนิตี้: ตรวจรายการแจ้งรายงาน ซ่อนเนื้อหา ระงับ/ปลดระงับบัญชี และดูสถิติตามตัวชี้วัดข้อ 4.6
import {
  Ban,
  CircleCheck,
  DoorClosed,
  EyeOff,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import DuckAvatar from '../components/DuckAvatar';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  PageTitle,
  Segmented,
  Skeleton,
  SkeletonGroup,
  Spinner,
} from '../components/ui';
import { REPORT_REASONS, ROOM_TYPES } from '../config/constants';
import { COMMUNITY_WEEK } from '../config/dailyActivities';
import { HOTLINES, KMUTT_COUNSELING } from '../config/helpLines';
import { listBannedUsers, listReports, readStats, reviewReport, unbanUser } from '../api/admin';
import { useApiQuery } from '../hooks/useApiQuery';
import { errorMessage } from '../lib/api';
import { confirmDialog } from '../lib/dialog';
import { getSocket } from '../lib/socket';
import { dayRange, localYmd, shortDate, timeAgo } from '../lib/format';
import { toast, useUiStore } from '../stores/uiStore';

// สายด่วนที่ผู้ดูแลแนะนำเมื่อมีรายงานความเสี่ยงทำร้ายตัวเอง
const MENTAL_HEALTH_LINE = HOTLINES.find((line) => line.key === 'dmh');

const TARGET_LABELS = {
  question: 'คำถาม',
  answer: 'คำตอบ',
  message: 'ข้อความแชท',
  user: 'ผู้ใช้',
  room: 'ห้อง',
};
const STATUS_TABS = [
  { value: 'pending', label: 'รอตรวจสอบ' },
  { value: 'actioned', label: 'จัดการแล้ว' },
  { value: 'dismissed', label: 'ยกเลิกแล้ว' },
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

// ช่วงเวลาของสถิติ: นับเฉพาะช่วง Duck Community Week หรือช่วงที่เลือกเอง จะได้ไม่นับข้อมูลตอนทีมทดสอบระบบ
// "Duck Week" ตามที่รูปเล่มบทที่ 2 เรียก (ชื่อเต็มยาวเกินจอมือถือ 320px) ชื่อเต็มอยู่ในบรรทัดใต้ตัวเลือก
const RANGES = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'week', label: 'Duck Week' },
  { value: 'custom', label: 'เลือกวันเอง' },
];
// วันแรก/วันสุดท้ายของ Duck Community Week อ่านจากไฟล์กิจกรรม (ทีมแก้วันที่ที่เดียว)
const WEEK = { from: COMMUNITY_WEEK[0].date, to: COMMUNITY_WEEK.at(-1).date };

const yearCounts = (counts) => [1, 2, 3, 4].map((y) => `ปี${y} ${counts[y]}`).join(' · ');

const StatsSkeleton = () => {
  return (
    <SkeletonGroup className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="card space-y-2 p-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </SkeletonGroup>
  );
};

const Stats = () => {
  const [range, setRange] = useState('all');
  const [custom, setCustom] = useState(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    return { from: localYmd(weekAgo), to: localYmd() };
  });
  const customValid = Boolean(custom.from && custom.to && custom.from <= custom.to);
  const params =
    range === 'week'
      ? dayRange(WEEK.from, WEEK.to)
      : range === 'custom' && customValid
        ? dayRange(custom.from, custom.to)
        : undefined;
  // เลือกวันเองแต่ยังเลือกไม่ครบ/วันสลับกัน: ยังไม่โหลด
  const waiting = range === 'custom' && !customValid;
  const { data, loading } = useApiQuery(waiting ? null : readStats, params);
  const stats = data?.stats;
  // จำนวนรอตรวจล่าสุด (อัปเดตตามรายงานที่เข้ามา/ถูกตรวจ ไม่ต้องรอโหลดสถิติใหม่)
  const pending = useUiStore((s) => s.reportSummary.pending);
  const ranged = range !== 'all';

  return (
    <section aria-labelledby="stats-heading" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="stats-heading" className="text-lg font-medium">
          สถิติตามตัวชี้วัด (ข้อ 4.6)
        </h2>
        <Segmented
          label="ช่วงเวลาของสถิติ"
          options={RANGES}
          value={range}
          onChange={setRange}
          fit
        />
      </div>
      {range === 'all' && (
        <p className="text-sm text-muted">นับทั้งหมดตั้งแต่เริ่มใช้ระบบ (รวมตอนที่ทีมทดสอบด้วย)</p>
      )}
      {range === 'week' && (
        <p className="text-sm text-muted">
          Duck Community Week:{' '}
          {/* ช่วงวันที่ขึ้นบรรทัดใหม่ทั้งช่วง ไม่ให้ปีหลุดไปอยู่บรรทัดถัดไปตัวเดียว */}
          <span className="whitespace-nowrap">
            {shortDate(`${WEEK.from}T00:00:00`)} – {shortDate(`${WEEK.to}T00:00:00`)}
          </span>
        </p>
      )}
      {range === 'custom' && (
        // จอแคบเรียงช่องวันที่ลงมา ช่องจะได้กว้างพอแสดงปีครบ
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:max-w-md">
          <Field label="ตั้งแต่วันที่" htmlFor="stats-from">
            <input
              id="stats-from"
              type="date"
              className="input"
              value={custom.from}
              max={custom.to || undefined}
              onChange={(e) => setCustom({ ...custom, from: e.target.value })}
            />
          </Field>
          <Field label="ถึงวันที่" htmlFor="stats-to">
            <input
              id="stats-to"
              type="date"
              className="input"
              value={custom.to}
              min={custom.from || undefined}
              onChange={(e) => setCustom({ ...custom, to: e.target.value })}
            />
          </Field>
        </div>
      )}

      {waiting ? (
        <p className="text-sm text-muted">
          เลือกวันเริ่มต้นและวันสิ้นสุด (วันเริ่มต้องไม่หลังวันสิ้นสุด)
        </p>
      ) : loading || !stats ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StatTile
            label={ranged ? 'สมาชิกใหม่' : 'สมาชิก'}
            value={stats.users.total}
            sub={yearCounts(stats.users.byYear)}
          />
          <StatTile
            label="ใช้งานจริง"
            value={stats.users.active}
            sub="เข้าห้อง ตั้ง/ตอบคำถาม หรือส่งใจ อย่างน้อย 1 ครั้ง"
          />
          <StatTile
            label={ranged ? 'ห้องที่เปิด' : 'ห้องที่เคยเปิด'}
            value={stats.rooms.total}
            sub={
              <>
                <span className="block">
                  1-1 {stats.rooms.byType.private} · กลุ่ม {stats.rooms.byType.group} · คาราโอเกะ{' '}
                  {stats.rooms.byType.karaoke}
                </span>
                <span className="block">
                  แยกชั้นปี: {yearCounts(stats.rooms.byYear)} · ทุกชั้นปี {stats.rooms.byYear.all}
                </span>
              </>
            }
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
            sub={`รอตรวจสอบ ${pending} รายการ`}
          />
        </div>
      )}
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
          <Link to={`/qa/${target.questionId}`} className="link mt-1 inline-block text-xs">
            ดูคำถาม
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
          {/* ผู้ดูแลไม่เห็นอีเมลของผู้ใช้ จึงบอกขั้นตอนที่ทำได้จากในเว็บ */}
          <span>
            อาจมีความเสี่ยงทำร้ายตัวเอง ตรวจรายการนี้ก่อน · ถ้าเป็นคำถามหรือคำตอบ
            ให้ตอบกลับด้วยความเห็นใจพร้อมช่องทางช่วยเหลือ (สายด่วนสุขภาพจิต{' '}
            {MENTAL_HEALTH_LINE.number} ฟรี 24 ชั่วโมง · ให้คำปรึกษา มจธ. {KMUTT_COUNSELING.phone})
            แล้วแจ้งอาจารย์ที่ปรึกษาโครงการ
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
        {/* ผู้รายงานลบบัญชีไปแล้ว: รายงานยังอยู่ แต่ไม่ผูกกับบัญชีใด */}
        <span>ผู้รายงาน: {report.reporter?.nickname ?? 'บัญชีที่ลบไปแล้ว'}</span>
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

      <Stats />

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
