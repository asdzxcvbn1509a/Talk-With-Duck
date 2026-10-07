import crypto from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
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

  it('สถิติสำหรับรายงานผลโครงการ', async () => {
    const mod = await createUser({ role: 'moderator', year: 4 });
    await createUser({ year: 1 });
    const res = await api().get('/api/admin/stats').set(bearer(mod.token));
    expect(res.status).toBe(200);
    expect(res.body.stats.users).toMatchObject({ total: 2, byYear: { 1: 1, 2: 0, 3: 0, 4: 1 } });
  });
});
