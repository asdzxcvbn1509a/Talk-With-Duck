import { afterEach, describe, expect, it, vi } from 'vitest';
import { expectedPosition, needsSeek, songOver } from './karaokeSync';
import { clockTime, timeAgo, yearLabel } from './format';
import { SPEAKING_THRESHOLD, quantizeLevel, rmsLevel } from './rtc/levels';
import { activityFor } from '../config/dailyActivities';
import { useRoomStore } from '../stores/roomStore';

describe('การซิงก์เพลงคาราโอเกะ', () => {
  const state = { position: 30, playing: true, serverTime: 1_000_000 };

  it('เพลงเล่นอยู่: ตำแหน่ง = ตำแหน่งล่าสุด + เวลาที่ผ่านไป (ชดเชยนาฬิกาต่างกัน)', () => {
    // เครื่องเราช้ากว่า server 2 วินาที และผ่านไป 5 วินาทีหลัง host ส่งสถานะ
    expect(expectedPosition(state, 1_003_000, 2_000)).toBeCloseTo(35);
  });

  it('เพลงหยุดอยู่: ตำแหน่งคงที่', () => {
    expect(expectedPosition({ ...state, playing: false }, 9_999_999, 0)).toBe(30);
  });

  it('ไม่ย้อนเวลาแม้นาฬิกาเครื่องเราเร็วกว่า', () => {
    expect(expectedPosition(state, 990_000, 0)).toBe(30);
  });

  it('กระโดดตำแหน่งเมื่อคลาดเกิน 1 วินาทีเท่านั้น', () => {
    expect(needsSeek(10, 10.8)).toBe(false);
    expect(needsSeek(10, 11.5)).toBe(true);
    expect(needsSeek(12, 10)).toBe(true);
  });

  it('เลยท้ายเพลงหรือเหลือไม่ถึง 1 วินาที = เพลงจบแล้ว · ยังไม่รู้ความยาวเพลง = ยังไม่จบ', () => {
    expect(songOver(300, 212)).toBe(true);
    expect(songOver(211.5, 212)).toBe(true);
    expect(songOver(200, 212)).toBe(false);
    expect(songOver(300, 0)).toBe(false);
  });
});

describe('format', () => {
  const now = new Date('2026-10-01T12:00:00Z').getTime();
  it('แสดงเวลาแบบย่อ', () => {
    expect(timeAgo(now - 10_000, now)).toBe('เมื่อสักครู่');
    expect(timeAgo(now - 5 * 60_000, now)).toBe('5 นาทีที่แล้ว');
    expect(timeAgo(now - 3 * 3600_000, now)).toBe('3 ชั่วโมงที่แล้ว');
    expect(timeAgo(now - 2 * 86400_000, now)).toBe('2 วันที่แล้ว');
  });
  it('ป้ายชั้นปี', () => {
    expect(yearLabel(2)).toBe('ปี 2');
    expect(yearLabel(null)).toBe('ทุกชั้นปี');
  });
  it('ใช้ตัวจัดรูปแบบร่วมกันแล้วได้ผลเหมือน toLocaleTimeString/toLocaleDateString เดิม', () => {
    const sent = new Date(2026, 9, 1, 9, 5);
    expect(clockTime(sent.toISOString())).toBe(
      sent.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    );
    const old = now - 30 * 86400_000;
    expect(timeAgo(old, now)).toBe(
      new Date(old).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
      }),
    );
  });
});

describe('Speaking Indicator', () => {
  it('ความเงียบมีค่าความดัง 0 และเสียงดังมีค่ามากกว่าเกณฑ์', () => {
    expect(rmsLevel(new Uint8Array(512).fill(128))).toBe(0);
    const loud = new Uint8Array(512).map((_, i) => (i % 2 ? 200 : 56));
    expect(rmsLevel(loud)).toBeGreaterThan(0.5);
  });

  it('ปัดความดังก่อนส่งให้หน้าเว็บ: เงียบ = 0 · พูดเบาสุดยังนับว่ากำลังพูด · ค่าใกล้กันได้ค่าเดียวกัน', () => {
    expect(quantizeLevel(0)).toBe(0);
    expect(quantizeLevel(SPEAKING_THRESHOLD - 0.001)).toBe(0);
    expect(quantizeLevel(SPEAKING_THRESHOLD)).toBeGreaterThan(SPEAKING_THRESHOLD);
    expect(quantizeLevel(0.101)).toBe(quantizeLevel(0.109));
  });
});

describe('กิจกรรมประจำวัน', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('วันใน Duck Community Week แสดงกิจกรรมพิเศษ', () => {
    expect(activityFor(new Date(2026, 11, 15)).special).toBe(true);
  });
  it('วันสุดท้าย: ตั้งลิงก์แบบประเมินไว้ → การ์ดพาไปแบบประเมิน (ลิงก์ภายนอก)', () => {
    vi.stubEnv('VITE_SURVEY_URL', 'https://forms.gle/duck-survey');
    const a = activityFor(new Date(2026, 11, 18));
    expect(a.special).toBe(true);
    expect(a.href).toBe('https://forms.gle/duck-survey');
    expect(a.to).toBeUndefined();
    expect(a.detail).toContain('แบบประเมิน');
  });
  it('วันสุดท้าย: ยังไม่ตั้งลิงก์แบบประเมิน → ไม่ชวนทำแบบประเมินที่ไม่มีอยู่ และพาไปบอร์ดแทน', () => {
    vi.stubEnv('VITE_SURVEY_URL', '');
    const a = activityFor(new Date(2026, 11, 18));
    expect(a.href).toBeUndefined();
    expect(a.to).toBe('/qa');
    expect(a.detail).not.toContain('แบบประเมิน');
  });
  it('วันปกติแสดงข้อความตามวันในสัปดาห์', () => {
    const a = activityFor(new Date(2026, 9, 5));
    expect(a.special).toBe(false);
    expect(a.title).toBeTruthy();
  });
});

describe('roomStore', () => {
  it('ไม่เพิ่มข้อความซ้ำ และเรียงสมาชิกตามเวลาที่เข้าห้อง', () => {
    const s = useRoomStore.getState();
    s.reset('r1');
    s.addMessage({ id: 'm1', content: 'a' });
    s.addMessage({ id: 'm1', content: 'a' });
    expect(useRoomStore.getState().messages).toHaveLength(1);

    s.upsertMember({ userId: 'b', joinedAt: '2026-10-01T10:05:00Z' });
    s.upsertMember({ userId: 'a', joinedAt: '2026-10-01T10:00:00Z' });
    expect(useRoomStore.getState().members.map((m) => m.userId)).toEqual(['a', 'b']);
    s.updateMember('a', { isMuted: true });
    expect(useRoomStore.getState().members[0].isMuted).toBe(true);
  });

  it('ระดับเสียงเท่าเดิมไม่เปลี่ยน state (หน้าเว็บไม่ต้อง render ใหม่ทุก 100 ms)', () => {
    const s = useRoomStore.getState();
    s.reset('r1');
    s.setLevels({ a: 0, b: 0.12 });
    const first = useRoomStore.getState().levels;
    s.setLevels({ a: 0, b: 0.12 });
    expect(useRoomStore.getState().levels).toBe(first);
    s.setLevels({ a: 0.04, b: 0.12 });
    expect(useRoomStore.getState().levels).toEqual({ a: 0.04, b: 0.12 });
  });
});
