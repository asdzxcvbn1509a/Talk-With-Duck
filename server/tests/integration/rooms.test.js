import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma.js';
import { api, bearer, createUser, hasTestDb, resetDb } from '../helpers.js';

describe.skipIf(!hasTestDb)('ห้องสนทนา 1-1 / กลุ่ม / ตัวกรองชั้นปี (ตาราง 3.5)', () => {
  beforeEach(resetDb);

  it('ต้องยอมรับข้อตกลงการใช้งานก่อนเข้าห้อง', async () => {
    const { token } = await createUser({ acceptedGuidelinesAt: null });
    const res = await api().get('/api/rooms').set(bearer(token));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('GUIDELINES_REQUIRED');
  });

  it('ห้อง 1-1 รับได้ 2 คน คนที่ 3 เข้าไม่ได้', async () => {
    const a = await createUser();
    const b = await createUser();
    const c = await createUser();

    const created = await api()
      .post('/api/rooms')
      .set(bearer(a.token))
      .send({ name: 'คุยเรื่องเรียน', type: 'private', yearFilter: 1 });
    expect(created.status).toBe(201);
    const roomId = created.body.room.id;
    expect(created.body.room).toMatchObject({ capacity: 2, memberCount: 1, hostId: a.user.id });

    const joinB = await api().post(`/api/rooms/${roomId}/join`).set(bearer(b.token));
    expect(joinB.body.room.memberCount).toBe(2);

    const joinC = await api().post(`/api/rooms/${roomId}/join`).set(bearer(c.token));
    expect(joinC.status).toBe(409);
    expect(joinC.body.error.code).toBe('ROOM_FULL');
  });

  it('ห้องกลุ่มรับได้ 5 คนขึ้นไปพร้อมกัน', async () => {
    const host = await createUser();
    const { body } = await api()
      .post('/api/rooms')
      .set(bearer(host.token))
      .send({ name: 'สุมหัวทำงาน', type: 'group' });
    const others = await Promise.all([1, 2, 3, 4].map(() => createUser()));
    // เข้าพร้อมกัน เพื่อทดสอบการล็อกแถวห้อง
    const results = await Promise.all(
      others.map((u) => api().post(`/api/rooms/${body.room.id}/join`).set(bearer(u.token))),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    const room = await api().get(`/api/rooms/${body.room.id}`).set(bearer(host.token));
    expect(room.body.room.memberCount).toBe(5);
  });

  it('ตัวกรองชั้นปีแสดงเฉพาะห้องของปีนั้น', async () => {
    const u = await createUser();
    const v = await createUser();
    await api()
      .post('/api/rooms')
      .set(bearer(u.token))
      .send({ name: 'ปี 1', type: 'group', yearFilter: 1 });
    await api()
      .post('/api/rooms')
      .set(bearer(v.token))
      .send({ name: 'ปี 3', type: 'group', yearFilter: 3 });

    const year3 = await api().get('/api/rooms?year=3').set(bearer(u.token));
    expect(year3.body.rooms.map((r) => r.name)).toEqual(['ปี 3']);
    const all = await api().get('/api/rooms').set(bearer(u.token));
    expect(all.body.rooms).toHaveLength(2);
  });

  it('host ออกแล้วย้าย host ให้คนต่อไป ทุกคนออกแล้วห้องปิด', async () => {
    const a = await createUser();
    const b = await createUser();
    const { body } = await api()
      .post('/api/rooms')
      .set(bearer(a.token))
      .send({ name: 'x', type: 'group' });
    const roomId = body.room.id;
    await api().post(`/api/rooms/${roomId}/join`).set(bearer(b.token));

    await api().post(`/api/rooms/${roomId}/leave`).set(bearer(a.token)).expect(204);
    let room = await prisma.room.findUnique({ where: { id: roomId } });
    expect(room.hostId).toBe(b.user.id);
    expect(room.isActive).toBe(true);

    await api().post(`/api/rooms/${roomId}/leave`).set(bearer(b.token)).expect(204);
    room = await prisma.room.findUnique({ where: { id: roomId } });
    expect(room.isActive).toBe(false);
    const list = await api().get('/api/rooms').set(bearer(a.token));
    expect(list.body.rooms).toHaveLength(0);
  });

  it('อยู่ได้ทีละห้อง: เข้าห้องใหม่แล้วออกจากห้องเดิมอัตโนมัติ', async () => {
    const a = await createUser();
    const b = await createUser();
    const r1 = await api()
      .post('/api/rooms')
      .set(bearer(a.token))
      .send({ name: 'r1', type: 'group' });
    await api().post(`/api/rooms/${r1.body.room.id}/join`).set(bearer(b.token));
    const r2 = await api()
      .post('/api/rooms')
      .set(bearer(b.token))
      .send({ name: 'r2', type: 'group' });

    const room1 = await api().get(`/api/rooms/${r1.body.room.id}`).set(bearer(a.token));
    expect(room1.body.room.memberCount).toBe(1);
    expect(r2.body.room.memberCount).toBe(1);
  });

  it('แชท: เฉพาะคนในห้องที่ส่งและอ่านข้อความได้', async () => {
    const a = await createUser();
    const outsider = await createUser();
    const { body } = await api()
      .post('/api/rooms')
      .set(bearer(a.token))
      .send({ name: 'x', type: 'group' });
    const roomId = body.room.id;

    const sent = await api()
      .post(`/api/rooms/${roomId}/messages`)
      .set(bearer(a.token))
      .send({ type: 'text', content: 'สวัสดีจ้า' });
    expect(sent.status).toBe(201);
    await api()
      .post(`/api/rooms/${roomId}/messages`)
      .set(bearer(a.token))
      .send({ type: 'sticker', content: 'heart' })
      .expect(201);

    const denied = await api().get(`/api/rooms/${roomId}/messages`).set(bearer(outsider.token));
    expect(denied.status).toBe(403);

    const list = await api().get(`/api/rooms/${roomId}/messages`).set(bearer(a.token));
    expect(list.body.messages.map((m) => m.content)).toEqual(['สวัสดีจ้า', 'heart']);
    expect(JSON.stringify(list.body)).not.toContain('@mail.kmutt.ac.th');
  });

  it.each(['private', 'group'])(
    'แชทห้อง %s: คนที่เข้าทีหลังไม่เห็นข้อความที่คุยกันก่อนเข้า แม้ย้อนดูด้วย before',
    async (type) => {
      const a = await createUser();
      const b = await createUser();
      const { body } = await api()
        .post('/api/rooms')
        .set(bearer(a.token))
        .send({ name: 'x', type });
      const roomId = body.room.id;
      const send = (who, content) =>
        api()
          .post(`/api/rooms/${roomId}/messages`)
          .set(bearer(who.token))
          .send({ type: 'text', content })
          .expect(201);
      const contents = async (who, query = '') => {
        const res = await api()
          .get(`/api/rooms/${roomId}/messages${query}`)
          .set(bearer(who.token))
          .expect(200);
        return res.body.messages.map((m) => m.content);
      };

      await send(a, 'คุยก่อนมีคนเข้า');
      await api().post(`/api/rooms/${roomId}/join`).set(bearer(b.token)).expect(200);
      await send(a, 'คุยหลังเข้า');

      expect(await contents(b)).toEqual(['คุยหลังเข้า']);
      const later = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      expect(await contents(b, `?before=${later}`)).toEqual(['คุยหลังเข้า']);
      // คนที่อยู่ในห้องตั้งแต่แรกยังเห็นครบ
      expect(await contents(a)).toEqual(['คุยก่อนมีคนเข้า', 'คุยหลังเข้า']);

      // ออกแล้วเข้าใหม่: เห็นเฉพาะข้อความหลังเข้ารอบล่าสุด
      await api().post(`/api/rooms/${roomId}/leave`).set(bearer(b.token)).expect(204);
      await send(a, 'คุยตอนที่ b ไม่อยู่');
      await api().post(`/api/rooms/${roomId}/join`).set(bearer(b.token)).expect(200);
      expect(await contents(b)).toEqual([]);
    },
  );

  it('quick-match จับคู่คนที่รออยู่ในห้อง 1-1', async () => {
    const a = await createUser();
    const b = await createUser();
    const first = await api().post('/api/rooms/quick-match').set(bearer(a.token)).send({});
    expect(first.body.room.memberCount).toBe(1);
    const second = await api().post('/api/rooms/quick-match').set(bearer(b.token)).send({});
    expect(second.body.room.id).toBe(first.body.room.id);
    expect(second.body.room.memberCount).toBe(2);
  });
});

describe.skipIf(!hasTestDb)('คิวเพลง Duck Karaoke Lounge (ตาราง 3.5)', () => {
  beforeEach(resetDb);

  const song = (n) => ({ videoId: `abcdefghij${n}`, title: `เพลงที่ ${n}` });

  it('เพลงแรกเล่นทันที เพลงต่อไปเข้าคิว และเฉพาะ host ที่กดเพลงถัดไปได้', async () => {
    const host = await createUser();
    const guest = await createUser();
    const { body } = await api()
      .post('/api/rooms')
      .set(bearer(host.token))
      .send({ name: 'ร้องเพลงคลายเครียด', type: 'karaoke' });
    const roomId = body.room.id;
    await api().post(`/api/rooms/${roomId}/join`).set(bearer(guest.token));

    const q1 = await api()
      .post(`/api/rooms/${roomId}/queue`)
      .set(bearer(guest.token))
      .send(song(1));
    expect(q1.body.queue[0]).toMatchObject({ status: 'playing', title: 'เพลงที่ 1' });
    const q2 = await api().post(`/api/rooms/${roomId}/queue`).set(bearer(host.token)).send(song(2));
    expect(q2.body.queue.map((s) => s.status)).toEqual(['playing', 'queued']);

    const denied = await api()
      .post(`/api/rooms/${roomId}/queue/next`)
      .set(bearer(guest.token))
      .send({});
    expect(denied.status).toBe(403);

    const next = await api()
      .post(`/api/rooms/${roomId}/queue/next`)
      .set(bearer(host.token))
      .send({});
    expect(next.body.queue).toHaveLength(1);
    expect(next.body.queue[0]).toMatchObject({ status: 'playing', title: 'เพลงที่ 2' });
  });

  it('รายการห้องบอกเพลงที่กำลังเล่น (การ์ดในหน้า lobby: กำลังเล่น / คิวว่าง)', async () => {
    const host = await createUser();
    const { body } = await api()
      .post('/api/rooms')
      .set(bearer(host.token))
      .send({ name: 'ร้องเพลงยามเย็น', type: 'karaoke' });
    const roomId = body.room.id;
    const nowPlaying = async () => {
      const list = await api().get('/api/rooms?type=karaoke').set(bearer(host.token));
      return list.body.rooms.find((r) => r.id === roomId).nowPlaying;
    };

    expect(await nowPlaying()).toBeNull();

    const added = await api()
      .post(`/api/rooms/${roomId}/queue`)
      .set(bearer(host.token))
      .send(song(1));
    expect(await nowPlaying()).toBe('เพลงที่ 1');

    // ลบเพลงที่กำลังเล่นตอนคิวไม่มีเพลงอื่น → กลับเป็นคิวว่าง
    await api()
      .delete(`/api/rooms/${roomId}/queue/${added.body.queue[0].id}`)
      .set(bearer(host.token))
      .expect(200);
    expect(await nowPlaying()).toBeNull();
  });

  it('เพิ่มเพลงในห้องที่ไม่ใช่คาราโอเกะไม่ได้', async () => {
    const u = await createUser();
    const { body } = await api()
      .post('/api/rooms')
      .set(bearer(u.token))
      .send({ name: 'x', type: 'group' });
    const res = await api()
      .post(`/api/rooms/${body.room.id}/queue`)
      .set(bearer(u.token))
      .send(song(1));
    expect(res.body.error.code).toBe('NOT_KARAOKE_ROOM');
  });

  it('รูปปกเพลงสร้างจากรหัสวิดีโอที่ server ไม่ใช้ URL ที่ส่งมา', async () => {
    const host = await createUser();
    const { body } = await api()
      .post('/api/rooms')
      .set(bearer(host.token))
      .send({ name: 'ร้องเพลง', type: 'karaoke' });
    const res = await api()
      .post(`/api/rooms/${body.room.id}/queue`)
      .set(bearer(host.token))
      .send({ ...song(1), thumbnail: 'https://tracker.example/pixel.gif' })
      .expect(201);
    expect(res.body.queue[0].thumbnail).toBe('https://i.ytimg.com/vi/abcdefghij1/mqdefault.jpg');
  });

  it('คิวเพลงอ่านได้เฉพาะคนในห้อง', async () => {
    const host = await createUser();
    const outsider = await createUser();
    const { body } = await api()
      .post('/api/rooms')
      .set(bearer(host.token))
      .send({ name: 'ร้องเพลง', type: 'karaoke' });
    const roomId = body.room.id;
    await api()
      .post(`/api/rooms/${roomId}/queue`)
      .set(bearer(host.token))
      .send(song(1))
      .expect(201);

    const denied = await api().get(`/api/rooms/${roomId}/queue`).set(bearer(outsider.token));
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('NOT_A_MEMBER');
    const queue = await api().get(`/api/rooms/${roomId}/queue`).set(bearer(host.token)).expect(200);
    expect(queue.body.queue).toHaveLength(1);
  });
});
