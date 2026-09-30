// ปุ่มและหน้าต่างแจ้งรายงานเนื้อหา/พฤติกรรมที่ไม่เหมาะสม (ข้อ 3.5.7)
import { Flag } from 'lucide-react';
import { useState } from 'react';
import { REPORT_REASONS } from '../config/constants';
import { createReport } from '../api/reports';
import { errorMessage } from '../lib/api';
import CrisisSupport from './CrisisSupport';
import { toast } from '../stores/uiStore';
import { Button, Field, IconButton, Modal } from './ui';

const ReportModal = ({ open, onClose, target }) => {
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const close = () => {
    setReason(null);
    setDetails('');
    onClose();
  };

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await createReport({
        targetType: target.type,
        targetId: target.id,
        reason,
        details: details.trim() || undefined,
      });
      toast(data.message, 'success');
      close();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={`รายงาน${target?.label ? ` “${target.label}”` : ''}`}
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            ยกเลิก
          </Button>
          <Button variant="danger" onClick={submit} loading={loading} disabled={!reason}>
            ส่งรายงาน
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted">
        ผู้ถูกรายงานจะไม่รู้ว่าใครเป็นคนรายงาน ทีมผู้ดูแลจะตรวจสอบโดยเร็วที่สุด
      </p>
      <fieldset className="space-y-2">
        <legend className="label">เกิดอะไรขึ้น?</legend>
        {Object.entries(REPORT_REASONS).map(([key, label]) => (
          <label
            key={key}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 transition ${
              reason === key ? 'border-danger bg-danger-soft' : 'border-line hover:border-duck-300'
            }`}
          >
            <input
              type="radio"
              name="reason"
              value={key}
              checked={reason === key}
              onChange={() => setReason(key)}
              className="accent-[#e5484d]"
            />
            {label}
          </label>
        ))}
      </fieldset>
      {reason === 'self_harm' && (
        <div className="mt-4">
          <CrisisSupport compact />
        </div>
      )}
      <div className="mt-4">
        <Field label="รายละเอียดเพิ่มเติม (ไม่บังคับ)" htmlFor="report-details">
          <textarea
            id="report-details"
            className="input min-h-24"
            maxLength={500}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
};

/** ปุ่มธงเล็ก ๆ ที่เปิดหน้าต่างรายงาน */
export const ReportButton = ({ target, className = '', size = 36 }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        icon={Flag}
        label="รายงาน"
        size={size}
        iconSize={16}
        className={`hover:text-danger ${className}`}
        onClick={() => setOpen(true)}
      />
      <ReportModal open={open} onClose={() => setOpen(false)} target={target} />
    </>
  );
};

export default ReportModal;
