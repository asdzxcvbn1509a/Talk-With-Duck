// ลบบัญชีถาวร (DELETE /api/me): ข้อมูลของผู้ใช้หายไปทั้งหมด ยกเว้นรายงานที่เคยส่งไว้
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { issueSession } from '../../src/services/token.service.js';
import { api, bearer, createUser, hasTestDb, resetDb } from '../helpers.js';

const question = {
  title: 'ปรับตัวกับการเรียนปี 1 ยังไงดี',
  content: 'รู้สึกตามเพื่อนไม่ทันเลย',
  topic: 'study',
};

const song = (n) => ({ videoId: `song${n}`.padEnd(11, 'x'), title: `เพลงที่ ${n}` });

describe.skipIf(!hasTestDb)('ลบบัญชี (นโยบายความเป็นส่วนตัว)', () => {
  beforeEach(resetDb);

  it('ลบบัญชีแล้วข้อมูลของคนนั้นหายไป แต่รายงานที่เคยส่งยังอยู่', async () => {
    const leaver = await createUser({ nickname: 'เป็ดจะไปแล้ว' });
    const friend = await createUser();
    const mod = await createUser({ role: 'moderator' });

    // คำถามของคนที่จะลบบัญชี (มีเพื่อนตอบไว้)
    const own = await api()
      .post('/api/questions')
      .set(bearer(leaver.token))
      .send(question)
      .expect(201);
    await api()
      .post(`/api/questions/${own.body.question.id}/answers`)
      .set(bearer(friend.token))
      .send({ content: 'สู้ ๆ นะ' })
      .expect(201);

    // คำถามของเพื่อน ที่คนนั้นส่งใจ ตอบ และรายงานไว้
    const theirs = await api()
      .post('/api/questions')
      .set(bearer(friend.token))
      .send({ ...question, title: 'คำถามของเพื่อน' })
      .expect(201);
    const theirsId = theirs.body.question.id;
    await api().post(`/api/questions/${theirsId}/love`).set(bearer(leaver.token)).expect(200);
    await api().post(`/api/questions/${theirsId}/love`).set(bearer(mod.token)).expect(200);
    await api()
      .post(`/api/questions/${theirsId}/answers`)
      .set(bearer(leaver.token))
      .send({ content: 'เคยเป็นเหมือนกัน' })
      .expect(201);
    const report = await api()
      .post('/api/reports')
      .set(bearer(leaver.token))
      .send({ targetType: 'question', targetId: theirsId, reason: 'spam' })
      .expect(201);
    const { refreshToken } = await issueSession(leaver.user);

    const res = await api().delete('/api/me').set(bearer(leaver.token));
    expect(res.status).toBe(204);
    expect(res.headers['set-cookie'].join(';')).toMatch(/twd_rt=;/);

    expect(await prisma.user.findUnique({ where: { id: leaver.user.id } })).toBeNull();
    expect(await prisma.question.count({ where: { id: own.body.question.id } })).toBe(0);
    const after = await api()
      .get(`/api/questions/${theirsId}`)
      .set(bearer(friend.token))
      .expect(200);
    expect(after.body.question.loveCount).toBe(1);
    expect(after.body.question.answers).toHaveLength(0);

    // รายงานยังอยู่ให้ผู้ดูแลจัดการต่อ โดยไม่ผูกกับบัญชีที่ลบไปแล้ว
    const { body } = await api().get('/api/admin/reports').set(bearer(mod.token)).expect(200);
    expect(body.reports.map((r) => r.id)).toEqual([report.body.id]);
    expect(body.reports[0].reporter).toBeNull();

    // token เดิมใช้ไม่ได้อีก
    expect((await api().get('/api/me').set(bearer(leaver.token))).status).toBe(401);
    const refreshed = await api().post('/api/auth/refresh').set('Cookie', `twd_rt=${refreshToken}`);
    expect(refreshed.status).toBe(401);
  });

  it('ลบบัญชีตอนอยู่ในห้องคาราโอเกะ: เจ้าของห้องย้ายไปคนอื่น และคิวขึ้นเพลงถัดไป', async () => {
    const host = await createUser();
    const guest = await createUser();
    const room = await api()
      .post('/api/rooms')
      .set(bearer(host.token))
      .send({ name: 'ห้องร้องเพลง', type: 'karaoke' })
      .expect(201);
    const roomId = room.body.room.id;
    await api().post(`/api/rooms/${roomId}/join`).set(bearer(guest.token)).expect(200);
    const addSong = (who, n) =>
      api().post(`/api/rooms/${roomId}/queue`).set(bearer(who.token)).send(song(n)).expect(201);
    await addSong(host, 1); // เล่นทันที
    await addSong(host, 2);
    await addSong(guest, 3);

    await api().delete('/api/me').set(bearer(host.token)).expect(204);

    const after = await api().get(`/api/rooms/${roomId}`).set(bearer(guest.token)).expect(200);
    expect(after.body.room).toMatchObject({ isActive: true, hostId: guest.user.id });
    const queue = await api().get(`/api/rooms/${roomId}/queue`).set(bearer(guest.token));
    expect(queue.body.queue.map((s) => [s.title, s.status])).toEqual([['เพลงที่ 3', 'playing']]);
  });

  it('ยังไม่ได้ยอมรับข้อตกลงก็ลบบัญชีได้', async () => {
    const newcomer = await createUser({ acceptedGuidelinesAt: null });
    await api().delete('/api/me').set(bearer(newcomer.token)).expect(204);
    expect(await prisma.user.count({ where: { id: newcomer.user.id } })).toBe(0);
  });

  it('บัญชีผู้ดูแลลบเองไม่ได้', async () => {
    const mod = await createUser({ role: 'moderator' });
    const res = await api().delete('/api/me').set(bearer(mod.token));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MODERATOR_CANNOT_DELETE');
    expect(await prisma.user.count({ where: { id: mod.user.id } })).toBe(1);
  });
});
