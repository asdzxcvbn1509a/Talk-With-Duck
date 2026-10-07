// สถิติตามตัวชี้วัดข้อ 4.6 ในหน้าผู้ดูแล สำหรับทีมใช้สรุปผลโครงการ
// เลือกช่วงเวลาได้: ทั้งหมด / Duck Community Week / เลือกวันเอง
import { useState } from 'react';
import { COMMUNITY_WEEK } from '../../config/dailyActivities';
import { readStats } from '../../api/admin';
import { useApiQuery } from '../../hooks/useApiQuery';
import { dayRange, localYmd, shortDate } from '../../lib/format';
import { useUiStore } from '../../stores/uiStore';
import { Field, Segmented, Skeleton, SkeletonGroup } from '../ui';

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

const StatsPanel = () => {
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

export default StatsPanel;
