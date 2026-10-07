// การ์ดรายงาน 1 รายการในหน้าผู้ดูแล: สิ่งที่ถูกรายงาน เจ้าของตัวจริง และปุ่มซ่อน/ปิดห้อง/ระงับบัญชี/ไม่พบการทำผิด
// รายงาน "มีความเสี่ยงทำร้ายตัวเอง" มีกรอบแดง และบอกขั้นตอนที่ผู้ดูแลทำได้จากในเว็บ
import { Ban, CircleCheck, DoorClosed, EyeOff, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { REPORT_REASONS, ROOM_TYPES } from '../../config/constants';
import { HOTLINES, KMUTT_COUNSELING } from '../../config/helpLines';
import { reviewReport } from '../../api/admin';
import { toastError } from '../../lib/api';
import { confirmDialog } from '../../lib/dialog';
import { timeAgo } from '../../lib/format';
import { toast } from '../../stores/uiStore';
import DuckAvatar from '../DuckAvatar';
import { Badge, Button } from '../ui';

// สายด่วนที่ผู้ดูแลแนะนำเมื่อมีรายงานความเสี่ยงทำร้ายตัวเอง
const MENTAL_HEALTH_LINE = HOTLINES.find((line) => line.key === 'dmh');

const TARGET_LABELS = {
  question: 'คำถาม',
  answer: 'คำตอบ',
  message: 'ข้อความแชท',
  user: 'ผู้ใช้',
  room: 'ห้อง',
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
      toastError(err);
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

export default ReportCard;
