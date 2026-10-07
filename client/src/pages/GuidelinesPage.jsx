// ข้อตกลงการใช้งานพื้นที่ปลอดภัย (Community Guidelines) — ต้องกดยอมรับก่อนใช้งานครั้งแรก (ข้อ 3.5.7)
import {
  Ban,
  Flag,
  HandHelping,
  Heart,
  LifeBuoy,
  Lock,
  OctagonX,
  SlidersHorizontal,
  UserRoundX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import CrisisSupport from '../components/CrisisSupport';
import { Button, PageTitle } from '../components/ui';
import { toastError } from '../lib/api';
import { acceptGuidelines } from '../lib/auth';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/uiStore';

const RULES = [
  {
    icon: Heart,
    title: 'ฟังโดยไม่ตัดสิน',
    body: 'ความเหงา ความเครียด หรือความกังวลเป็นเรื่องปกติที่คุยกันได้ ฟังให้จบก่อนแนะนำ และไม่ตีตราความรู้สึกของใครว่า "คิดมากไปเอง"',
  },
  {
    icon: Lock,
    title: 'เรื่องเล่าจบในห้อง',
    body: 'ห้ามแคปหน้าจอ อัดเสียง หรือนำเรื่องที่คุยกันไปเล่าต่อข้างนอก ความไว้ใจคือหัวใจของพื้นที่นี้',
  },
  {
    icon: Ban,
    title: 'ห้ามใช้ถ้อยคำรุนแรงและห้ามล้อเลียนปมด้อย',
    body: 'ไม่ด่าทอ เหยียด ข่มขู่ หรือล้อเลียนรูปร่างหน้าตา ผลการเรียน ฐานะ เพศ หรือความเชื่อของใคร',
  },
  {
    icon: OctagonX,
    title: 'ห้ามคุกคามทางเพศ',
    body: 'ไม่พูดหรือส่งข้อความเชิงเพศที่อีกฝ่ายไม่ยินยอม ไม่ตื๊อขอช่องทางติดต่อส่วนตัว',
  },
  {
    icon: UserRoundX,
    title: 'เคารพความเป็นส่วนตัว',
    body: 'ทุกคนใช้ชื่อเล่นและอวาตาร์เป็ด ห้ามสืบหาหรือเปิดเผยตัวตนจริงของคนอื่น แม้จะเดาได้ก็ตาม',
  },
  {
    icon: SlidersHorizontal,
    title: 'คุณกำหนดขอบเขตเองได้เสมอ',
    body: 'ปิดไมค์ ออกจากห้อง หรือถามและตอบแบบไม่เปิดเผยตัวตนได้ทุกเมื่อ โดยไม่ต้องอธิบายเหตุผลกับใคร',
  },
  {
    icon: HandHelping,
    title: 'เพื่อนช่วยเพื่อน ไม่ใช่หมอ',
    body: 'แชร์ประสบการณ์และให้กำลังใจกันได้ แต่ไม่วินิจฉัยโรคหรือแนะนำยา ถ้าเพื่อนดูมีความเสี่ยงจะทำร้ายตัวเอง ชวนเขาติดต่อช่องทางด้านล่าง และกดรายงานหัวข้อ “มีความเสี่ยงทำร้ายตัวเอง” ทีมผู้ดูแลจะช่วยดูแลต่อ',
  },
  {
    icon: Flag,
    title: 'เห็นอะไรไม่โอเค กดรายงาน',
    body: 'ทีมผู้ดูแลจะตรวจสอบทุกรายงาน เนื้อหาที่ผิดข้อตกลงจะถูกซ่อน และบัญชีที่ทำผิดซ้ำอาจถูกระงับการใช้งาน',
  },
];

const GuidelinesPage = () => {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const accepted = Boolean(user?.acceptedGuidelinesAt);

  // ลิงก์ /guidelines#help (เช่น จากหน้า "ฉัน") เลื่อนลงไปที่ช่องทางขอความช่วยเหลือ (router ไม่เลื่อนตาม # ให้เอง)
  useEffect(() => {
    if (location.hash === '#help') document.getElementById('help')?.scrollIntoView();
  }, [location.hash]);

  const accept = async () => {
    setLoading(true);
    try {
      await acceptGuidelines();
      toast('ขอบคุณที่ช่วยกันดูแลบ่อเป็ดของเรา', 'success');
      navigate(location.state?.from ?? '/lobby', { replace: true });
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageTitle title="ข้อตกลงพื้นที่ปลอดภัย" />
      <header className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-calm-100 text-calm-700 dark:bg-calm-700/30 dark:text-calm-200">
          <LifeBuoy size={32} />
        </span>
        <h1 className="mt-3 text-3xl font-medium">ข้อตกลงพื้นที่ปลอดภัย</h1>
        <p className="mt-2 text-muted">
          {accepted
            ? 'ทบทวนกติกาของคอมมูนิตี้ได้ทุกเมื่อ'
            : 'ก่อนเริ่มใช้งาน อ่านกติกาสั้น ๆ นี้ด้วยกันนะ'}
        </p>
      </header>

      <ol className="space-y-3">
        {RULES.map((rule, i) => (
          <li key={rule.title} className="card flex gap-4 p-5">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-duck-100 text-duck-800 dark:bg-surface-2 dark:text-duck-300"
              aria-hidden
            >
              <rule.icon size={24} />
            </span>
            <div>
              <h2 className="text-lg font-medium">
                {i + 1}. {rule.title}
              </h2>
              <p className="mt-1 text-muted">{rule.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <CrisisSupport id="help" />

      {!accepted && (
        <div className="sticky bottom-24 md:bottom-6">
          <Button size="lg" className="w-full" loading={loading} onClick={accept}>
            ฉันเข้าใจและยอมรับข้อตกลงนี้
          </Button>
        </div>
      )}
    </div>
  );
};

export default GuidelinesPage;
