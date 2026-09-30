// ตรวจว่าฟังก์ชันใน src/api ยิง method + path + ข้อมูลถูกต้องตาม docs/api.md
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE, api } from '../lib/api';
import * as admin from './admin';
import * as answers from './answers';
import * as auth from './auth';
import * as karaoke from './karaoke';
import * as me from './me';
import * as questions from './questions';
import * as reports from './reports';
import * as rooms from './rooms';
import * as rtc from './rtc';

const data = { hello: 'duck' };
const params = { year: 2 };

// [ชื่อ, เรียกฟังก์ชัน, method ของ axios, arguments ที่ควรส่งให้ axios]
const cases = [
  ['auth.signInWithGoogle', () => auth.signInWithGoogle(data), 'post', ['/auth/google', data]],
  ['auth.listDevAccounts', () => auth.listDevAccounts(), 'get', ['/auth/dev-accounts']],
  ['auth.devLogin', () => auth.devLogin(data), 'post', ['/auth/dev-login', data]],

  ['me.updateMe', () => me.updateMe(data), 'patch', ['/me', data]],
  ['me.acceptGuidelines', () => me.acceptGuidelines(), 'post', ['/me/accept-guidelines']],

  ['rooms.listRooms', () => rooms.listRooms(params), 'get', ['/rooms', { params }]],
  ['rooms.readRoom', () => rooms.readRoom('r1'), 'get', ['/rooms/r1']],
  ['rooms.createRoom', () => rooms.createRoom(data), 'post', ['/rooms', data]],
  ['rooms.quickMatch', () => rooms.quickMatch(data), 'post', ['/rooms/quick-match', data]],
  ['rooms.joinRoom', () => rooms.joinRoom('r1'), 'post', ['/rooms/r1/join']],
  ['rooms.leaveRoom', () => rooms.leaveRoom('r1'), 'post', ['/rooms/r1/leave']],
  ['rooms.sendMessage', () => rooms.sendMessage('r1', data), 'post', ['/rooms/r1/messages', data]],
  ['rooms.addSong', () => rooms.addSong('r1', data), 'post', ['/rooms/r1/queue', data]],
  ['rooms.removeSong', () => rooms.removeSong('r1', 's1'), 'delete', ['/rooms/r1/queue/s1']],
  ['rooms.nextSong', () => rooms.nextSong('r1', data), 'post', ['/rooms/r1/queue/next', data]],

  ['karaoke.readKaraokeConfig', () => karaoke.readKaraokeConfig(), 'get', ['/karaoke/config']],
  [
    'karaoke.searchSongs',
    () => karaoke.searchSongs(params),
    'get',
    ['/karaoke/search', { params }],
  ],
  ['karaoke.resolveSong', () => karaoke.resolveSong(data), 'post', ['/karaoke/resolve', data]],

  [
    'questions.listQuestions',
    () => questions.listQuestions(params),
    'get',
    ['/questions', { params }],
  ],
  ['questions.readQuestion', () => questions.readQuestion('q1'), 'get', ['/questions/q1']],
  ['questions.createQuestion', () => questions.createQuestion(data), 'post', ['/questions', data]],
  [
    'questions.updateQuestion',
    () => questions.updateQuestion('q1', data),
    'patch',
    ['/questions/q1', data],
  ],
  ['questions.removeQuestion', () => questions.removeQuestion('q1'), 'delete', ['/questions/q1']],
  [
    'questions.createAnswer',
    () => questions.createAnswer('q1', data),
    'post',
    ['/questions/q1/answers', data],
  ],
  ['questions.loveQuestion', () => questions.loveQuestion('q1'), 'post', ['/questions/q1/love']],

  ['answers.updateAnswer', () => answers.updateAnswer('a1', data), 'patch', ['/answers/a1', data]],
  ['answers.removeAnswer', () => answers.removeAnswer('a1'), 'delete', ['/answers/a1']],

  ['reports.createReport', () => reports.createReport(data), 'post', ['/reports', data]],

  ['admin.readStats', () => admin.readStats(), 'get', ['/admin/stats']],
  ['admin.listReports', () => admin.listReports(params), 'get', ['/admin/reports', { params }]],
  [
    'admin.reviewReport',
    () => admin.reviewReport('p1', data),
    'patch',
    ['/admin/reports/p1', data],
  ],
  ['admin.listBannedUsers', () => admin.listBannedUsers(), 'get', ['/admin/bans']],
  ['admin.unbanUser', () => admin.unbanUser('u1'), 'delete', ['/admin/bans/u1']],

  ['rtc.readIceServers', () => rtc.readIceServers(), 'get', ['/rtc/ice-servers']],
];

describe('ฟังก์ชันเรียก API (src/api)', () => {
  const response = { data: { ok: true } };

  beforeEach(() => {
    for (const method of ['get', 'post', 'patch', 'delete']) {
      vi.spyOn(api, method).mockResolvedValue(response);
    }
  });

  afterEach(() => vi.restoreAllMocks());

  it.each(cases)('%s', async (_name, call, method, expectedArgs) => {
    await expect(call()).resolves.toBe(response);
    expect(api[method]).toHaveBeenCalledTimes(1);
    expect(api[method]).toHaveBeenCalledWith(...expectedArgs);
  });

  it('auth.logout ไม่ผ่าน interceptor (ใช้ axios ตรงพร้อม cookie)', async () => {
    const post = vi.spyOn(axios, 'post').mockResolvedValue(response);
    await expect(auth.logout()).resolves.toBe(response);
    expect(post).toHaveBeenCalledWith(`${API_BASE}/auth/logout`, null, { withCredentials: true });
    expect(api.post).not.toHaveBeenCalled();
  });
});
