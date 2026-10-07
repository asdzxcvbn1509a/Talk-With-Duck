import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { api, bearer, createUser, hasTestDb, resetDb } from '../helpers.js';

const question = {
  title: 'ปรับตัวกับการเรียนปี 1 ยังไงดี',
  content: 'รู้สึกตามเพื่อนไม่ทันเลย',
  tagYear: 1,
  topic: 'study',
};

describe.skipIf(!hasTestDb)('Open Q&A Board (ตาราง 3.5)', () => {
  beforeEach(resetDb);

  it('กระทู้ไม่ระบุตัวตนไม่เปิดเผยเจ้าของให้คนอื่นเห็น', async () => {
    const asker = await createUser({ nickname: 'เป็ดขี้อาย' });
    const reader = await createUser();
    const created = await api()
      .post('/api/questions')
      .set(bearer(asker.token))
      .send({ ...question, isAnonymous: true });
    expect(created.status).toBe(201);

    const seen = await api()
      .get(`/api/questions/${created.body.question.id}`)
      .set(bearer(reader.token));
    const json = JSON.stringify(seen.body);
    expect(seen.body.question.author.nickname).toBe('เป็ดนิรนาม');
    expect(json).not.toContain(asker.user.id);
    expect(json).not.toContain('เป็ดขี้อาย');
    expect(seen.body.question.isMine).toBe(false);

    const own = await api()
      .get(`/api/questions/${created.body.question.id}`)
      .set(bearer(asker.token));
    expect(own.body.question.isMine).toBe(true);
  });

  it('หลายคนตอบได้ ตัวนับคำตอบถูกต้อง และตัวกรอง "ยังไม่มีคนตอบ" ทำงาน', async () => {
    const asker = await createUser();
    const q1 = await api().post('/api/questions').set(bearer(asker.token)).send(question);
    await api()
      .post('/api/questions')
      .set(bearer(asker.token))
      .send({ ...question, title: 'คำถามที่ยังไม่มีคนตอบ' });

    const answerers = await Promise.all([1, 2, 3].map(() => createUser()));
    for (const u of answerers) {
      await api()
        .post(`/api/questions/${q1.body.question.id}/answers`)
        .set(bearer(u.token))
        .send({ content: 'สู้ ๆ นะ' })
        .expect(201);
    }

    const list = await api().get('/api/questions').set(bearer(asker.token));
    const card = list.body.items.find((q) => q.id === q1.body.question.id);
    expect(card.answerCount).toBe(3);

    const unanswered = await api().get('/api/questions?sort=unanswered').set(bearer(asker.token));
    expect(unanswered.body.items.map((q) => q.title)).toEqual(['คำถามที่ยังไม่มีคนตอบ']);
  });

  it('กดใจแล้วกดซ้ำเพื่อยกเลิก', async () => {
    const asker = await createUser();
    const fan = await createUser();
    const q = await api().post('/api/questions').set(bearer(asker.token)).send(question);
    const id = q.body.question.id;

    const loved = await api().post(`/api/questions/${id}/love`).set(bearer(fan.token));
    expect(loved.body).toEqual({ loved: true, loveCount: 1 });
    const unloved = await api().post(`/api/questions/${id}/love`).set(bearer(fan.token));
    expect(unloved.body).toEqual({ loved: false, loveCount: 0 });
  });

  it('แก้ไขได้เฉพาะเจ้าของ', async () => {
    const asker = await createUser();
    const other = await createUser();
    const q = await api().post('/api/questions').set(bearer(asker.token)).send(question);
    const res = await api()
      .patch(`/api/questions/${q.body.question.id}`)
      .set(bearer(other.token))
      .send({ title: 'แก้หัวข้อของคนอื่น' });
    expect(res.status).toBe(403);
  });

  it('แบ่งหน้าด้วย cursor ได้ครบไม่ซ้ำ', async () => {
    const u = await createUser();
    for (let i = 1; i <= 5; i += 1) {
      await api()
        .post('/api/questions')
        .set(bearer(u.token))
        .send({ ...question, title: `คำถามที่ ${i}` });
    }
    const page1 = await api().get('/api/questions?limit=3').set(bearer(u.token));
    expect(page1.body.items).toHaveLength(3);
    const page2 = await api()
      .get(`/api/questions?limit=3&cursor=${page1.body.nextCursor}`)
      .set(bearer(u.token));
    expect(page2.body.items).toHaveLength(2);
    expect(page2.body.nextCursor).toBeNull();
    const titles = [...page1.body.items, ...page2.body.items].map((q) => q.title);
    expect(new Set(titles).size).toBe(5);
  });

  it('ค้นหาคำถามจากหัวข้อและรายละเอียด ใช้ร่วมกับตัวกรองและ cursor ได้', async () => {
    const u = await createUser();
    const ask = async (body) => {
      const res = await api()
        .post('/api/questions')
        .set(bearer(u.token))
        .send({ ...question, ...body })
        .expect(201);
      return res.body.question.id;
    };
    await ask({
      title: 'หาที่ฝึกงานสาย UX ยังไงดี',
      content: 'อยากได้คำแนะนำ',
      topic: 'internship',
    });
    await ask({ title: 'เรียนตามเพื่อนไม่ทัน', content: 'มีใครเคยฝึกงานช่วงซัมเมอร์บ้าง' });
    await ask({ title: 'React hooks งงมาก', content: 'useEffect ทำงานตอนไหน' });
    const hiddenId = await ask({ title: 'ฝึกงานที่ถูกซ่อนไว้', content: 'ผู้ดูแลซ่อนแล้ว' });
    await prisma.question.update({ where: { id: hiddenId }, data: { isHidden: true } });

    const search = async (query) => {
      const res = await api().get('/api/questions').query(query).set(bearer(u.token)).expect(200);
      return res.body;
    };
    const titles = (body) => body.items.map((q) => q.title).sort();

    expect(titles(await search({ q: 'ฝึกงาน' }))).toEqual(
      ['หาที่ฝึกงานสาย UX ยังไงดี', 'เรียนตามเพื่อนไม่ทัน'].sort(),
    );
    // ภาษาอังกฤษไม่สนตัวพิมพ์เล็ก/ใหญ่
    expect(titles(await search({ q: 'REACT' }))).toEqual(['React hooks งงมาก']);
    expect(titles(await search({ q: 'ฝึกงาน', topic: 'internship' }))).toEqual([
      'หาที่ฝึกงานสาย UX ยังไงดี',
    ]);
    // ช่องค้นหาว่าง = ไม่ได้ค้น
    expect((await search({ q: '   ' })).items).toHaveLength(3);

    const page1 = await search({ q: 'ฝึกงาน', limit: 1 });
    expect(page1.items).toHaveLength(1);
    const page2 = await search({ q: 'ฝึกงาน', limit: 1, cursor: page1.nextCursor });
    expect(page2.items).toHaveLength(1);
    expect(page2.nextCursor).toBeNull();
    expect(page2.items[0].id).not.toBe(page1.items[0].id);

    const tooLong = await api()
      .get('/api/questions')
      .query({ q: 'ก'.repeat(101) })
      .set(bearer(u.token));
    expect(tooLong.status).toBe(400);
  });

  it('ค้นคำที่มี % _ หรือ \\ ได้ผลตรงตัวอักษร (ไม่ใช่ wildcard)', async () => {
    const u = await createUser();
    const titles = [
      'ลดราคา 50% จริงไหม',
      'ตั้งชื่อไฟล์ test_case ยังไง',
      'ไฟล์อยู่ที่ C:\\temp หาไม่เจอ',
      'คำถามธรรมดาทั่วไป',
    ];
    for (const title of titles) {
      await api()
        .post('/api/questions')
        .set(bearer(u.token))
        .send({ ...question, title, content: 'รายละเอียด' })
        .expect(201);
    }
    const search = async (q) => {
      const res = await api().get('/api/questions').query({ q }).set(bearer(u.token)).expect(200);
      return res.body.items.map((item) => item.title);
    };
    expect(await search('%')).toEqual(['ลดราคา 50% จริงไหม']);
    expect(await search('_')).toEqual(['ตั้งชื่อไฟล์ test_case ยังไง']);
    expect(await search('C:\\temp')).toEqual(['ไฟล์อยู่ที่ C:\\temp หาไม่เจอ']);
  });
});

describe.skipIf(!hasTestDb)('ระบบแจ้งรายงานและผู้ดูแล (ตาราง 3.5)', () => {
  beforeEach(resetDb);

  it('รายงาน → ผู้ดูแลซ่อนโพสต์ → โพสต์หายจากบอร์ด', async () => {
    const author = await createUser();
    const reporter = await createUser();
    const mod = await createUser({ role: 'moderator' });
    const q = await api().post('/api/questions').set(bearer(author.token)).send(question);
    const target = { targetType: 'question', targetId: q.body.question.id };

    const self = await api()
      .post('/api/reports')
      .set(bearer(author.token))
      .send({ ...target, reason: 'spam' });
    expect(self.body.error.code).toBe('CANNOT_REPORT_SELF');

    const report = await api()
      .post('/api/reports')
      .set(bearer(reporter.token))
      .send({ ...target, reason: 'hate' });
    expect(report.status).toBe(201);
    const dup = await api()
      .post('/api/reports')
      .set(bearer(reporter.token))
      .send({ ...target, reason: 'hate' });
    expect(dup.body.error.code).toBe('ALREADY_REPORTED');

    const notMod = await api().get('/api/admin/reports').set(bearer(reporter.token));
    expect(notMod.status).toBe(403);

    const list = await api().get('/api/admin/reports').set(bearer(mod.token));
    expect(list.body.reports).toHaveLength(1);
    expect(list.body.reports[0].owner.id).toBe(author.user.id);

    await api()
      .patch(`/api/admin/reports/${report.body.id}`)
      .set(bearer(mod.token))
      .send({ action: 'hide' })
      .expect(204);

    const board = await api().get('/api/questions').set(bearer(reporter.token));
    expect(board.body.items).toHaveLength(0);
    const pending = await api().get('/api/admin/reports').set(bearer(mod.token));
    expect(pending.body.reports).toHaveLength(0);
  });

  it('ผู้ดูแลเห็นรายงานครบทุกประเภทพร้อมเจ้าของตัวจริง รวมถึงรายการที่ถูกลบไปแล้ว', async () => {
    const author = await createUser();
    const helper = await createUser();
    const troll = await createUser();
    const reporter = await createUser();
    const second = await createUser();
    const mod = await createUser({ role: 'moderator' });

    const q = await api().post('/api/questions').set(bearer(author.token)).send(question);
    const questionId = q.body.question.id;
    const answer = await api()
      .post(`/api/questions/${questionId}/answers`)
      .set(bearer(helper.token))
      .send({ content: 'ลองคุยกับรุ่นพี่ดูนะ' });
    const gone = await api()
      .post('/api/questions')
      .set(bearer(author.token))
      .send({ ...question, title: 'กระทู้ที่จะถูกลบ' });
    const room = await api()
      .post('/api/rooms')
      .set(bearer(troll.token))
      .send({ name: 'ห้องของเป็ดเกเร', type: 'group' });
    const roomId = room.body.room.id;
    const message = await api()
      .post(`/api/rooms/${roomId}/messages`)
      .set(bearer(troll.token))
      .send({ type: 'text', content: 'ข้อความไม่ดี' });

    // ประเภท → [id ของสิ่งที่ถูกรายงาน, เจ้าของตัวจริง]
    const targets = {
      question: [questionId, author],
      answer: [answer.body.answer.id, helper],
      message: [message.body.message.id, troll],
      user: [troll.user.id, troll],
      room: [roomId, troll],
    };
    const report = (who, targetType, targetId) =>
      api()
        .post('/api/reports')
        .set(bearer(who.token))
        .send({ targetType, targetId, reason: 'spam' })
        .expect(201);
    for (const [targetType, [targetId]] of Object.entries(targets)) {
      await report(reporter, targetType, targetId);
    }
    await report(second, 'user', troll.user.id);
    await report(reporter, 'question', gone.body.question.id);
    await api()
      .delete(`/api/questions/${gone.body.question.id}`)
      .set(bearer(author.token))
      .expect(204);

    const { body } = await api().get('/api/admin/reports').set(bearer(mod.token)).expect(200);
    expect(body.reports).toHaveLength(7);
    const find = (targetType, targetId, who = reporter) =>
      body.reports.find(
        (r) =>
          r.targetType === targetType && r.targetId === targetId && r.reporter.id === who.user.id,
      );
    for (const [targetType, [targetId, owner]] of Object.entries(targets)) {
      const found = find(targetType, targetId);
      expect(found.target.exists).toBe(true);
      expect(found.owner.id).toBe(owner.user.id);
    }
    expect(find('room', roomId).target.name).toBe('ห้องของเป็ดเกเร');
    expect(find('user', troll.user.id).sameTargetCount).toBe(2);
    expect(find('user', troll.user.id, second).sameTargetCount).toBe(2);
    const deleted = find('question', gone.body.question.id);
    expect(deleted.target).toEqual({ exists: false });
    expect(deleted.owner).toBeNull();
  });

  it('ระงับบัญชีแล้วผู้ใช้นั้นใช้งานไม่ได้อีก', async () => {
    const troll = await createUser();
    const reporter = await createUser();
    const mod = await createUser({ role: 'moderator' });
    const report = await api()
      .post('/api/reports')
      .set(bearer(reporter.token))
      .send({ targetType: 'user', targetId: troll.user.id, reason: 'harassment' });

    await api()
      .patch(`/api/admin/reports/${report.body.id}`)
      .set(bearer(mod.token))
      .send({ action: 'ban' })
      .expect(204);

    const res = await api().get('/api/me').set(bearer(troll.token));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('BANNED');
  });

  it('ผู้ดูแลปลดระงับแล้วผู้ใช้กลับมาใช้งานได้', async () => {
    const troll = await createUser({ isBanned: true });
    const member = await createUser();
    const mod = await createUser({ role: 'moderator' });

    const notMod = await api().get('/api/admin/bans').set(bearer(member.token));
    expect(notMod.status).toBe(403);

    const bans = await api().get('/api/admin/bans').set(bearer(mod.token));
    expect(bans.body.users).toEqual([
      { id: troll.user.id, nickname: troll.user.nickname, avatar: 'duck-classic', year: 1 },
    ]);

    await api().delete(`/api/admin/bans/${troll.user.id}`).set(bearer(mod.token)).expect(204);
    const me = await api().get('/api/me').set(bearer(troll.token));
    expect(me.status).toBe(200);
    const after = await api().get('/api/admin/bans').set(bearer(mod.token));
    expect(after.body.users).toHaveLength(0);

    const missing = await api()
      .delete(`/api/admin/bans/${crypto.randomUUID()}`)
      .set(bearer(mod.token));
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('USER_NOT_FOUND');
  });

  it('สถิติสำหรับรายงานผลโครงการ: ห้องแยกชั้นปี คนที่ใช้งานจริง และเลือกช่วงเวลาได้', async () => {
    const mod = await createUser({ role: 'moderator', year: 4 });
    const member = await createUser({ year: 1 });
    const early = await createUser({ year: 2 });
    const openRoom = (who, body) =>
      api().post('/api/rooms').set(bearer(who.token)).send(body).expect(201);
    await openRoom(member, { name: 'ห้องปี 1', type: 'group', yearFilter: 1 });
    await openRoom(mod, { name: 'ห้องร้องเพลง', type: 'karaoke' });
    await openRoom(early, { name: 'ห้องที่ทีมลองเปิดตอนทดสอบ', type: 'group' });

    // ข้อมูลของ early ย้ายไปอยู่ช่วงทดสอบระบบ (ก่อนเปิดใช้จริง)
    const testing = new Date('2026-01-15T00:00:00Z');
    await prisma.user.update({ where: { id: early.user.id }, data: { createdAt: testing } });
    await prisma.room.updateMany({
      where: { hostId: early.user.id },
      data: { createdAt: testing },
    });
    await prisma.roomMember.updateMany({
      where: { userId: early.user.id },
      data: { joinedAt: testing },
    });

    const all = await api().get('/api/admin/stats').set(bearer(mod.token)).expect(200);
    expect(all.body.stats.range).toEqual({ from: null, to: null });
    expect(all.body.stats.users).toEqual({
      total: 3,
      byYear: { 1: 1, 2: 1, 3: 0, 4: 1 },
      active: 3,
    });
    expect(all.body.stats.rooms).toMatchObject({
      total: 3,
      byType: { private: 0, group: 2, karaoke: 1 },
      byYear: { all: 2, 1: 1, 2: 0, 3: 0, 4: 0 },
    });
    expect(all.body.stats.karaoke.participants).toBe(1);

    const range = { from: '2026-06-01T00:00:00.000Z', to: '2099-01-01T00:00:00.000Z' };
    const live = await api().get('/api/admin/stats').query(range).set(bearer(mod.token));
    expect(live.status).toBe(200);
    expect(live.body.stats.range).toEqual(range);
    expect(live.body.stats.users).toEqual({
      total: 2,
      byYear: { 1: 1, 2: 0, 3: 0, 4: 1 },
      active: 2,
    });
    expect(live.body.stats.rooms).toMatchObject({
      total: 2,
      byYear: { all: 1, 1: 1, 2: 0, 3: 0, 4: 0 },
      // ห้องที่เปิดอยู่ตอนนี้ไม่ขึ้นกับช่วงเวลา
      activeNow: 3,
    });

    const reversed = await api()
      .get('/api/admin/stats')
      .query({ from: range.to, to: range.from })
      .set(bearer(mod.token));
    expect(reversed.status).toBe(400);
  });

  it('ผู้ดูแลเห็นจำนวนรายงานที่รอตรวจ แยกหัวข้อเสี่ยงทำร้ายตัวเอง', async () => {
    const author = await createUser();
    const first = await createUser();
    const second = await createUser();
    const mod = await createUser({ role: 'moderator' });
    const q = await api().post('/api/questions').set(bearer(author.token)).send(question);
    const target = { targetType: 'question', targetId: q.body.question.id };
    const urgent = await api()
      .post('/api/reports')
      .set(bearer(first.token))
      .send({ ...target, reason: 'self_harm' })
      .expect(201);
    await api()
      .post('/api/reports')
      .set(bearer(second.token))
      .send({ ...target, reason: 'other' })
      .expect(201);

    const notMod = await api().get('/api/admin/reports/summary').set(bearer(first.token));
    expect(notMod.status).toBe(403);
    const before = await api().get('/api/admin/reports/summary').set(bearer(mod.token));
    expect(before.body).toEqual({ pending: 2, urgent: 1 });

    // ตรวจแล้วปิดทุกรายงานของเป้าหมายเดียวกัน
    await api()
      .patch(`/api/admin/reports/${urgent.body.id}`)
      .set(bearer(mod.token))
      .send({ action: 'dismiss' })
      .expect(204);
    const after = await api().get('/api/admin/reports/summary').set(bearer(mod.token));
    expect(after.body).toEqual({ pending: 0, urgent: 0 });
  });
});
