// เส้นทางนอกกลุ่มฟังก์ชันหลัก: /health (Render ใช้ตรวจว่า server ยังทำงาน) และ /rtc/ice-servers (STUN/TURN)
import { describe, expect, it } from 'vitest';
import { api, bearer, createUser, hasTestDb } from '../helpers.js';

describe('/api/health และเส้นทางที่ไม่มีอยู่', () => {
  it('ตอบ ok พร้อมเวลา และบอก IP เฉพาะเมื่อขอ ?ip', async () => {
    const res = await api().get('/api/health').expect(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.time).toBe('string');
    expect(res.body).not.toHaveProperty('ip');

    const withIp = await api().get('/api/health?ip').expect(200);
    expect(typeof withIp.body.ip).toBe('string');
  });

  it('เส้นทางที่ไม่มีอยู่ได้ 404 NOT_FOUND', async () => {
    const res = await api().get('/api/no-such-path').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe.skipIf(!hasTestDb)('/api/health?db และ /api/rtc/ice-servers', () => {
  it('?db ตรวจการเชื่อมต่อฐานข้อมูล', async () => {
    const res = await api().get('/api/health?db').expect(200);
    expect(res.body.ok).toBe(true);
  });

  it('ICE servers ต้องเข้าสู่ระบบก่อน และมี STUN เสมอ', async () => {
    const anonymous = await api().get('/api/rtc/ice-servers');
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe('NO_TOKEN');

    const { token } = await createUser();
    const res = await api().get('/api/rtc/ice-servers').set(bearer(token)).expect(200);
    expect(res.body.iceServers[0].urls).toContain('stun:stun.l.google.com:19302');
  });
});
