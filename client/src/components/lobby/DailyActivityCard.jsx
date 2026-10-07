// การ์ดกิจกรรมประจำวันบนหน้าหลัก (ช่วง Duck Community Week เปลี่ยนเป็นกิจกรรมของสัปดาห์นั้น)
// แก้กิจกรรมได้ที่ config/dailyActivities.js
import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router';
import { activityFor } from '../../config/dailyActivities';
import { NewTabLink } from '../ui';

const ACTIVITY_CARD_CLASS =
  'relative block overflow-hidden rounded-(--radius-card) bg-gradient-to-br from-duck-300 via-duck-400 to-beak-400 p-6 text-on-duck shadow-(--shadow-soft)';

const DailyActivityCard = () => {
  const activity = activityFor();
  const content = (
    <>
      <p className="flex items-center gap-1.5 text-sm font-semibold opacity-80">
        <activity.icon size={16} />
        {activity.special ? 'Duck Community Week' : 'กิจกรรมวันนี้'}
        {activity.href && <ExternalLink size={14} aria-hidden="true" />}
      </p>
      <h2 className="mt-1 max-w-[80%] text-2xl font-medium">{activity.title}</h2>
      <p className="mt-2 max-w-[75%] text-on-duck/80">{activity.detail}</p>
      <img
        src="/duck.svg"
        alt=""
        className="absolute -right-4 -bottom-6 h-24 w-24 rotate-12 opacity-90 sm:h-32 sm:w-32"
      />
    </>
  );

  // แบบประเมิน (Google Forms) เป็นเว็บภายนอก: เปิดแท็บใหม่ ผู้ใช้จะได้ไม่หลุดจากบ่อเป็ด
  return activity.href ? (
    <NewTabLink href={activity.href} className={ACTIVITY_CARD_CLASS}>
      {content}
    </NewTabLink>
  ) : (
    <Link to={activity.to} className={ACTIVITY_CARD_CLASS}>
      {content}
    </Link>
  );
};

export default DailyActivityCard;
