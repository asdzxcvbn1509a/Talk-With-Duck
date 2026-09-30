import { describe, expect, it } from 'vitest';
import { expectedPosition, needsSeek, songOver } from './karaokeSync';
import { timeAgo, yearLabel } from './format';
import { rmsLevel } from './rtc/levels';
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
});

describe('Speaking Indicator', () => {
  it('ความเงียบมีค่าความดัง 0 และเสียงดังมีค่ามากกว่าเกณฑ์', () => {
    expect(rmsLevel(new Uint8Array(512).fill(128))).toBe(0);
    const loud = new Uint8Array(512).map((_, i) => (i % 2 ? 200 : 56));
    expect(rmsLevel(loud)).toBeGreaterThan(0.5);
  });
});

describe('กิจกรรมประจำวัน', () => {
  it('วันใน Duck Community Week แสดงกิจกรรมพิเศษ', () => {
    expect(activityFor(new Date(2026, 11, 15)).special).toBe(true);
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
});
