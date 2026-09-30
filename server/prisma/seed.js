// ข้อมูลตัวอย่างสำหรับพัฒนาและทดสอบ (ห้ามรันบนฐานข้อมูลจริง)
// บัญชีทดสอบไม่มีบัญชี Google: เข้าด้วยปุ่มบัญชีทดสอบในหน้าเข้าสู่ระบบ (ตั้ง DEV_LOGIN=true ใน server/.env)
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { parseEmailDomains } from '../src/utils/emailDomain.js';

if (process.env.NODE_ENV === 'production') {
  console.error('❌ ไม่อนุญาตให้ seed ข้อมูลตัวอย่างใน production');
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// บัญชีทดสอบใช้โดเมนแรกใน ALLOWED_EMAIL_DOMAINS (ถ้ารับทุกโดเมน ใช้โดเมนมหาวิทยาลัย)
const domain = parseEmailDomains(process.env.ALLOWED_EMAIL_DOMAINS)[0] ?? 'mail.kmutt.ac.th';

const people = [
  { key: 'mod', nickname: 'พี่เป็ดผู้ดูแล', year: 4, avatar: 'duck-glasses', role: 'moderator' },
  { key: 'year1', nickname: 'เป็ดน้อยปีหนึ่ง', year: 1, avatar: 'duck-bow' },
  { key: 'year2', nickname: 'เป็ดขี้สงสัย', year: 2, avatar: 'duck-cap' },
  { key: 'year3', nickname: 'เป็ดหาที่ฝึกงาน', year: 3, avatar: 'duck-headphones' },
  { key: 'year4', nickname: 'เป็ดใกล้จบ', year: 4, avatar: 'duck-scarf' },
];

const questions = [
  {
    by: 'year1',
    title: 'ปรับตัวกับการเรียนปี 1 ยังไงดี รู้สึกตามเพื่อนไม่ทัน',
    content:
      'เรียนมาได้เดือนกว่าแล้ว รู้สึกว่าวิชาพื้นฐานเขียนโปรแกรมยากมาก เพื่อนบางคนเขียนเป็นตั้งแต่ ม.ปลาย รู้สึกกดดันนิดหน่อย พี่ ๆ มีวิธีปรับตัวยังไงบ้างคะ',
    tagYear: 1,
    topic: 'study',
    isAnonymous: true,
    answers: [
      {
        by: 'year3',
        content:
          'ตอนปี 1 พี่ก็รู้สึกแบบนี้เลย ลองฝึกโจทย์วันละข้อสองข้อ แล้วจับกลุ่มติวกับเพื่อน ช่วยได้เยอะมาก ไม่ต้องรีบเทียบกับใครนะ 💛',
      },
      {
        by: 'year4',
        content:
          'ทุกคนเริ่มไม่เท่ากันเป็นเรื่องปกติ สิ่งสำคัญคือไปต่อเรื่อย ๆ ถ้าติดตรงไหนมาถามในบอร์ดนี้ได้เลย',
      },
    ],
  },
  {
    by: 'year3',
    title: 'หาที่ฝึกงานสาย Frontend ควรเตรียมพอร์ตแบบไหน',
    content:
      'อยากฝึกงานสาย Frontend ช่วงปิดเทอมปี 3 ควรมีโปรเจกต์ในพอร์ตกี่ชิ้น และบริษัทดูอะไรเป็นหลักบ้าง',
    tagYear: 3,
    topic: 'internship',
    isAnonymous: false,
    answers: [
      {
        by: 'year4',
        content:
          'มี 2–3 โปรเจกต์ที่ทำจริงจังดีกว่ามีเยอะแต่ไม่เสร็จ ใส่ลิงก์ GitHub กับเว็บที่ deploy แล้วด้วย กรรมการชอบเห็นของที่เปิดดูได้จริง',
      },
    ],
  },
  {
    by: 'year2',
    title: 'ทำงานกลุ่มแล้วเพื่อนไม่ช่วย ควรคุยยังไงไม่ให้ผิดใจกัน',
    content: 'โปรเจกต์กลุ่มวิชาเอก มีเพื่อนบางคนหายเงียบ ไม่อยากทะเลาะแต่ก็เหนื่อยที่ต้องทำคนเดียว',
    tagYear: 2,
    topic: 'project',
    isAnonymous: true,
    answers: [],
  },
  {
    by: 'year4',
    title: 'ช่วงนี้เครียดเรื่องธีสิส มีใครอยากนั่งทำงานเงียบ ๆ ด้วยกันไหม',
    content: 'เปิดห้องกลุ่มนั่งทำงานด้วยกันตอนหัวค่ำ ใครสนใจกดใจไว้ เดี๋ยวเปิดห้องให้ 🦆',
    tagYear: 4,
    topic: 'life',
    isAnonymous: false,
    answers: [{ by: 'year3', content: 'สนใจครับ! เปิดไมค์ไม่ได้แต่ขอเข้าไปนั่งด้วยนะ' }],
  },
];

const main = async () => {
  const users = {};
  for (const p of people) {
    const email = `${p.key}@${domain}`;
    users[p.key] = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        nickname: p.nickname,
        year: p.year,
        avatar: p.avatar,
        role: p.role ?? 'member',
        emailVerifiedAt: new Date(),
        acceptedGuidelinesAt: new Date(),
      },
    });
  }

  if ((await prisma.question.count()) === 0) {
    for (const q of questions) {
      await prisma.question.create({
        data: {
          userId: users[q.by].id,
          title: q.title,
          content: q.content,
          tagYear: q.tagYear,
          topic: q.topic,
          isAnonymous: q.isAnonymous,
          answers: {
            create: q.answers.map((a) => ({ userId: users[a.by].id, content: a.content })),
          },
        },
      });
    }
  }

  console.log(
    `✅ seed เสร็จแล้ว — บัญชีทดสอบ: ${people.map((p) => `${p.key}@${domain}`).join(', ')}`,
  );
  console.log(
    `   เข้าด้วยปุ่มบัญชีทดสอบในหน้าเข้าสู่ระบบ (DEV_LOGIN=true) · ผู้ดูแลคือ mod@${domain}`,
  );
};

try {
  await main();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
