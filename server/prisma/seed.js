// ข้อมูลตัวอย่างสำหรับพัฒนาและทดสอบ (ห้ามรันบนฐานข้อมูลจริง)
// บัญชีทดสอบไม่มีบัญชี Google: เข้าด้วยปุ่มบัญชีทดสอบในหน้าเข้าสู่ระบบ (ตั้ง DEV_LOGIN=true ใน server/.env)
// เนื้อหาตัวอย่างครบทุกหัวข้อ มียอดส่งใจ (ลองเรียง "ได้ใจมากสุด") คำถามที่ยังไม่มีคนตอบ (แท็บ "รอคำตอบ")
// และรายงานที่รอตรวจ (หน้าผู้ดูแล) · ใช้เป็นตัวอย่างน้ำเสียงตามข้อตกลงพื้นที่ปลอดภัยด้วย
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
  // บัญชีที่ถูกรายงาน: ลองซ่อนคำตอบหรือระงับบัญชีจากหน้าผู้ดูแล แล้วเข้าด้วยบัญชีนี้ดูข้อความที่ผู้ใช้เห็น
  { key: 'spam', nickname: 'เป็ดรับจ้างทำการบ้าน', year: 2, avatar: 'duck-star' },
];

// hoursAgo: เวลาที่ตั้งคำถามย้อนหลัง · lovedBy: ใครส่งใจ (ไม่ส่งใจคำถามของตัวเอง)
// คำตอบเรียงตามเวลา อยู่ระหว่างเวลาตั้งคำถามกับตอนนี้ · reports: ใครรายงานคำตอบนั้น
const questions = [
  {
    by: 'year1',
    hoursAgo: 144,
    title: 'ปรับตัวกับการเรียนปี 1 ยังไงดี รู้สึกตามเพื่อนไม่ทัน',
    content:
      'เรียนมาได้เดือนกว่าแล้ว รู้สึกว่าวิชาพื้นฐานเขียนโปรแกรมยากมาก เพื่อนบางคนเขียนเป็นตั้งแต่ ม.ปลาย รู้สึกกดดันนิดหน่อย พี่ ๆ มีวิธีปรับตัวยังไงบ้างคะ',
    tagYear: 1,
    topic: 'study',
    isAnonymous: true,
    lovedBy: ['year2', 'year3', 'year4'],
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
    hoursAgo: 120,
    title: 'หาที่ฝึกงานสาย Frontend ควรเตรียมพอร์ตแบบไหน',
    content:
      'อยากฝึกงานสาย Frontend ช่วงปิดเทอมปี 3 ควรมีโปรเจกต์ในพอร์ตกี่ชิ้น และบริษัทดูอะไรเป็นหลักบ้าง',
    tagYear: 3,
    topic: 'internship',
    isAnonymous: false,
    lovedBy: ['year1', 'year4'],
    answers: [
      {
        by: 'year4',
        content:
          'มี 2–3 โปรเจกต์ที่ทำจริงจังดีกว่ามีเยอะแต่ไม่เสร็จ ใส่ลิงก์ GitHub กับเว็บที่ deploy แล้วด้วย กรรมการชอบเห็นของที่เปิดดูได้จริง',
      },
    ],
  },
  {
    // ยังไม่มีคนตอบ: แสดงในแท็บ "รอคำตอบ"
    by: 'year2',
    hoursAgo: 96,
    title: 'ทำงานกลุ่มแล้วเพื่อนไม่ช่วย ควรคุยยังไงไม่ให้ผิดใจกัน',
    content: 'โปรเจกต์กลุ่มวิชาเอก มีเพื่อนบางคนหายเงียบ ไม่อยากทะเลาะแต่ก็เหนื่อยที่ต้องทำคนเดียว',
    tagYear: 2,
    topic: 'project',
    isAnonymous: true,
    lovedBy: ['year1'],
    answers: [],
  },
  {
    by: 'year4',
    hoursAgo: 72,
    title: 'ช่วงนี้เครียดเรื่องธีสิส มีใครอยากนั่งทำงานเงียบ ๆ ด้วยกันไหม',
    content: 'เปิดห้องกลุ่มนั่งทำงานด้วยกันตอนหัวค่ำ ใครสนใจกดใจไว้ เดี๋ยวเปิดห้องให้ 🦆',
    tagYear: 4,
    topic: 'life',
    isAnonymous: false,
    lovedBy: ['year3'],
    answers: [{ by: 'year3', content: 'สนใจครับ! เปิดไมค์ไม่ได้แต่ขอเข้าไปนั่งด้วยนะ' }],
  },
  {
    by: 'year1',
    hoursAgo: 50,
    title: 'ขึ้นปี 2 ต้องเตรียมตัวเรื่องเขียนโปรแกรมเชิงวัตถุ (OOP) ยังไงดี',
    content:
      'ได้ยินว่าวิชา OOP ตอนปี 2 งานเยอะมาก ช่วงปิดเทอมควรฝึกอะไรไว้ก่อนบ้าง จะได้ไม่ตามไม่ทัน',
    tagYear: 2,
    topic: 'study',
    isAnonymous: false,
    lovedBy: ['year3'],
    answers: [
      {
        by: 'year2',
        content:
          'ลองเอาโปรเจกต์เล็ก ๆ ที่เคยทำมาแยกเป็น class ดูว่าอะไรควรอยู่ด้วยกัน แล้วอ่านโค้ดคนอื่นบน GitHub ประกอบ ช่วยให้เห็นภาพเร็วขึ้นมาก',
      },
      {
        // ตัวอย่างสแปมที่ถูกรายงาน 2 ครั้ง (หน้าผู้ดูแลขึ้นป้าย "ถูกรายงาน 2 ครั้ง")
        by: 'spam',
        content: 'รับทำการบ้านเขียนโปรแกรมทุกวิชา ราคานักศึกษา งานไว ทักไลน์มาคุยได้เลย',
        reports: [
          { by: 'year1', reason: 'spam', details: 'โฆษณารับทำการบ้าน ไม่เกี่ยวกับคำถาม' },
          { by: 'year3', reason: 'spam' },
        ],
      },
    ],
  },
  {
    by: 'year3',
    hoursAgo: 30,
    title: 'ทำเกม multiplayer ด้วย Unity เป็นโปรเจกต์วิชา ใครเคยใช้ Netcode บ้าง',
    content:
      'กลุ่มเราอยากทำเกมเล่นสองคนผ่านเน็ต ลองทำตาม tutorial แล้วตัวละครของอีกฝั่งกระตุก ไม่แน่ใจว่าควรซิงก์ตำแหน่งแบบไหน',
    tagYear: 3,
    topic: 'project',
    isAnonymous: false,
    lovedBy: ['year2'],
    answers: [
      {
        by: 'year4',
        content:
          'ลองให้ฝั่ง host เป็นคนคำนวณตำแหน่ง แล้วให้อีกฝั่งค่อย ๆ เลื่อนตาม (interpolation) แทนการกระโดดไปตำแหน่งใหม่ทันที จะลื่นขึ้นเยอะ',
      },
    ],
  },
  {
    by: 'year2',
    hoursAgo: 20,
    title: 'แนะนำเพลงคาราโอเกะที่ร้องง่าย ๆ หน่อย เสียงไม่ค่อยดีแต่อยากร้อง',
    content:
      'อยากลองเข้าห้องคาราโอเกะแต่กลัวร้องเพี้ยน มีเพลงไหนที่คีย์ไม่สูงและคนส่วนใหญ่ร้องตามได้บ้าง',
    tagYear: null,
    topic: 'other',
    isAnonymous: false,
    lovedBy: ['year1', 'year3', 'year4'],
    answers: [
      {
        by: 'mod',
        content:
          'ห้องคาราโอเกะไม่มีใครตัดสินเสียงใครนะ ถ้ายังไม่กล้าร้อง เข้าไปฟังแล้วส่งสติกเกอร์เชียร์เพื่อนก่อนก็ได้ พอสนุกแล้วค่อยจองเพลงที่เคยร้องตามบ่อย ๆ',
      },
      {
        by: 'year4',
        content: 'ลองค้นชื่อเพลงต่อท้ายด้วยคำว่า "คีย์ต่ำ" มีหลายคลิปให้เลือก ร้องสบายขึ้นเยอะ',
      },
    ],
  },
  {
    // ตัวอย่างการตอบแบบรับฟังไม่ตัดสิน (ข้อตกลงข้อ 1) และการตอบแบบไม่เปิดเผยตัวตน
    by: 'year1',
    hoursAgo: 3,
    title: 'รู้สึกเหงา ยังไม่ค่อยมีเพื่อนสนิทในสาขาเลย',
    content:
      'เข้ากลุ่มเพื่อนไม่ค่อยติด เวลาว่างก็อยู่หอคนเดียว อยากมีเพื่อนคุยแต่ไม่รู้จะเริ่มยังไง',
    tagYear: 1,
    topic: 'life',
    isAnonymous: true,
    lovedBy: ['mod', 'year2', 'year3', 'year4'],
    answers: [
      {
        by: 'year4',
        content:
          'ขอบคุณที่กล้าเล่านะ ตอนปี 1 พี่ก็เคยรู้สึกแบบนี้ ลองเข้าห้องกลุ่มที่เปิดนั่งทำงานเงียบ ๆ ดูก่อน ไม่ต้องเปิดไมค์ก็ได้ เจอกันบ่อย ๆ เดี๋ยวก็เริ่มคุยกันเอง',
      },
      {
        by: 'year2',
        isAnonymous: true,
        content:
          'เราก็เคยเป็นเหมือนกัน ไม่แปลกเลย ถ้าอยากมีคนคุยด้วย ลองกด "สุ่มคุย 1-1" ในหน้าหลักดูนะ ที่นี่ไม่มีใครตัดสินกัน',
      },
    ],
  },
];

const HOUR_MS = 60 * 60 * 1000;

const seedQuestions = async (users) => {
  const now = Date.now();
  for (const q of questions) {
    const askedAt = new Date(now - q.hoursAgo * HOUR_MS);
    const question = await prisma.question.create({
      data: {
        userId: users[q.by].id,
        title: q.title,
        content: q.content,
        tagYear: q.tagYear,
        topic: q.topic,
        isAnonymous: q.isAnonymous,
        loveCount: q.lovedBy.length,
        createdAt: askedAt,
        updatedAt: askedAt,
        loves: { create: q.lovedBy.map((key) => ({ userId: users[key].id })) },
      },
    });

    // คำตอบกระจายระหว่างเวลาตั้งคำถามกับตอนนี้ · updatedAt เท่ากับ createdAt ไม่งั้นจะขึ้นว่า "(แก้ไขแล้ว)"
    const gap = (q.hoursAgo * HOUR_MS) / (q.answers.length + 1);
    for (const [i, a] of q.answers.entries()) {
      const answeredAt = new Date(askedAt.getTime() + gap * (i + 1));
      const answer = await prisma.answer.create({
        data: {
          questionId: question.id,
          userId: users[a.by].id,
          content: a.content,
          isAnonymous: a.isAnonymous ?? false,
          createdAt: answeredAt,
          updatedAt: answeredAt,
        },
      });
      for (const r of a.reports ?? []) {
        await prisma.report.create({
          data: {
            reporterId: users[r.by].id,
            targetType: 'answer',
            targetId: answer.id,
            reason: r.reason,
            details: r.details,
          },
        });
      }
    }
  }
};

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

  // seed ซ้ำได้: สร้างคำถาม คำตอบ ใจ และรายงานเฉพาะตอนที่ยังไม่มีคำถามในฐานข้อมูล
  if ((await prisma.question.count()) === 0) await seedQuestions(users);

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
