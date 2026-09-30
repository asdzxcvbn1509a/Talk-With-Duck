// ตัวเล่นคาราโอเกะ: ไม่มีใครคลิกหรือหยุดเพลงได้ รวมถึง host · เพลงโดนหยุดจากทางอื่นจะเล่นต่อเองตามเวลาของห้อง
// host ไม่บอกห้องให้หยุด และส่งเวลาของห้อง (ไม่ใช่ตำแหน่งที่ตัวเล่นช้าอยู่) · หยุดเพลงเก่าทันทีเมื่อ host ข้าม/ลบเพลง
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextSong } from '../../api/rooms';
import { roomSession } from '../../lib/roomSession';
import { PLAYER_STATE } from '../../lib/youtube';
import { useRoomStore } from '../../stores/roomStore';
import KaraokePlayer from './KaraokePlayer';

vi.mock('../../lib/roomSession', () => ({ roomSession: { socket: { emit: vi.fn() } } }));
vi.mock('../../api/rooms', () => ({ nextSong: vi.fn() }));

const song = {
  id: 's1',
  videoId: 'vid-1',
  title: 'เพลงของเป็ด',
  status: 'playing',
  requestedBy: { nickname: 'เป็ดนักร้อง' },
};

/** ตัวเล่นที่ถูกสร้างล่าสุด ค่าที่ใช้สร้าง และ event ที่เทสต์เรียกเองแทน YouTube */
let yt = null;

// ตัวเล่น YouTube ปลอม (เล่นเพลงเดียวกับ host อยู่ที่วินาทีที่ 30 เพลงยาว 212 วินาที)
class FakePlayer {
  constructor(_mount, { events, playerVars }) {
    this.state = PLAYER_STATE.PLAYING;
    this.videoId = song.videoId;
    this.playVideo = vi.fn(() => {
      this.state = PLAYER_STATE.PLAYING;
    });
    this.pauseVideo = vi.fn(() => {
      this.state = PLAYER_STATE.PAUSED;
    });
    this.stopVideo = vi.fn(() => {
      this.state = PLAYER_STATE.UNSTARTED;
    });
    this.loadVideoById = vi.fn(({ videoId }) => {
      this.videoId = videoId;
      this.state = PLAYER_STATE.PLAYING;
    });
    this.seekTo = vi.fn();
    yt = { player: this, events, playerVars };
  }

  getPlayerState() {
    return this.state;
  }

  getCurrentTime() {
    return 30;
  }

  getDuration() {
    return 212;
  }

  getVideoData() {
    return { video_id: this.videoId };
  }

  setVolume() {}

  destroy() {}
}

/** สถานะของห้องที่ host ส่งมา: เล่นเพลงนี้ถึงวินาทีที่ 30 */
const hostState = (target) => ({
  songId: target.id,
  videoId: target.videoId,
  playing: true,
  position: 30,
  serverTime: Date.now(),
});

/**
 * karaoke = สถานะของห้องที่เครื่องนี้ได้รับล่าสุด
 * host เป็นคนเริ่มเพลงเองจึงยังไม่มี ส่วนคนอื่นได้สถานะว่าห้องเล่นถึงวินาทีที่ 30
 */
const openPlayer = async ({ isHost = false, karaoke = isHost ? null : hostState(song) } = {}) => {
  useRoomStore.setState({ queue: [song], karaoke, clockOffset: 0 });
  yt = null;
  const view = render(<KaraokePlayer roomId="r1" isHost={isHost} />);
  await waitFor(() => expect(yt).not.toBeNull());
  act(() => yt.events.onReady());
  // นับเฉพาะคำสั่งที่เกิดหลังจากนี้ (ตอนพร้อมเล่นอาจถูกปรับให้ตรงกับห้องไปแล้วหนึ่งครั้ง)
  for (const method of ['playVideo', 'pauseVideo', 'stopVideo', 'loadVideoById', 'seekTo']) {
    yt.player[method].mockClear();
  }
  roomSession.socket.emit.mockClear();
  nextSong.mockClear();
  return view;
};

/** จำลองว่าตัวเล่นเปลี่ยนสถานะเอง (เช่น กดปุ่มบนหูฟัง หรือส่วนขยายหยุดเพลง) */
const changeState = (...states) => {
  act(() => {
    for (const state of states) {
      yt.player.state = state;
      yt.events.onStateChange({ data: state });
    }
  });
};

/** จำลองข้อมูลที่มาจาก server ผ่าน socket (queue:updated / karaoke:state) */
const receive = (partial) => {
  act(() => useRoomStore.getState().patch(partial));
};

let visibility = 'visible';

/** จำลองสลับไปแท็บอื่น/เปิดโปรแกรมอื่นทับ ('hidden') แล้วกลับมา ('visible') */
const setVisibility = (value) => {
  act(() => {
    visibility = value;
    document.dispatchEvent(new Event('visibilitychange'));
  });
};

/** host ส่งสถานะ "หยุด" ให้ห้องหรือยัง */
const emittedPause = () =>
  roomSession.socket.emit.mock.calls.some(
    ([event, state]) => event === 'karaoke:state' && state.playing === false,
  );

/** ตำแหน่งล่าสุดที่ host ส่งให้ห้อง */
const lastEmitted = () =>
  roomSession.socket.emit.mock.calls.findLast(([event]) => event === 'karaoke:state')?.[1];

/** วิดีโอถูกล็อก: คลิกไม่ได้ กด Tab เข้าไปไม่ได้ ไม่มีปุ่มควบคุม และปิดคีย์ลัดของ YouTube */
const expectLocked = (container) => {
  const video = container.querySelector('.pointer-events-none');
  expect(video).not.toBeNull();
  expect(video).toHaveAttribute('inert');
  expect(yt.playerVars).toMatchObject({ controls: 0, disablekb: 1 });
};

describe('KaraokePlayer', () => {
  beforeEach(() => {
    window.YT = { Player: FakePlayer };
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.YT;
    useRoomStore.getState().reset();
    vi.restoreAllMocks();
  });

  it('ทุกคนรวมถึง host คลิกหรือกดคีย์ที่วิดีโอไม่ได้ และตัวเล่นไม่มีปุ่มควบคุม', async () => {
    const guest = await openPlayer();
    expectLocked(guest.container);
    guest.unmount();

    const host = await openPlayer({ isHost: true });
    expectLocked(host.container);
  });

  describe('คนที่ไม่ใช่ host', () => {
    it('เพลงถูกหยุด (เช่น ปุ่มบนหูฟัง) → เล่นต่อทันที', async () => {
      await openPlayer();
      changeState(PLAYER_STATE.PLAYING, PLAYER_STATE.PAUSED);
      expect(yt.player.playVideo).toHaveBeenCalledTimes(1);
    });

    it('ห้องยังไม่เริ่มเพลงนี้ แต่ตัวเล่นเล่นขึ้นมาเอง → หยุดรอ host', async () => {
      await openPlayer({ karaoke: null });
      changeState(PLAYER_STATE.PLAYING);
      expect(yt.player.stopVideo).toHaveBeenCalledTimes(1);
    });

    it('เบราว์เซอร์บล็อกเสียงตั้งแต่แรก (ไม่เคยเล่น) → ไม่สั่งเล่นวนซ้ำ', async () => {
      await openPlayer();
      changeState(PLAYER_STATE.BUFFERING, PLAYER_STATE.PAUSED);
      expect(yt.player.playVideo).not.toHaveBeenCalled();
    });

    it('หน้านี้ถูกซ่อนแล้วเพลงโดนหยุด → สั่งเล่นต่อทันที แต่ไม่เกิน 3 ครั้ง', async () => {
      await openPlayer();
      yt.player.playVideo.mockImplementation(() => {}); // มือถือไม่ยอมให้เล่นเบื้องหลัง
      setVisibility('hidden');
      for (let i = 0; i < 5; i++) changeState(PLAYER_STATE.PLAYING, PLAYER_STATE.PAUSED);
      expect(yt.player.playVideo).toHaveBeenCalledTimes(3);
    });

    it('กลับมาที่หน้านี้ → ปรับตาม host ทันทีโดยไม่ต้องรอรอบตรวจ', async () => {
      await openPlayer();
      setVisibility('hidden');
      yt.player.state = PLAYER_STATE.PAUSED; // มือถือหยุดเพลงระหว่างพับจอ
      setVisibility('visible');
      expect(yt.player.playVideo).toHaveBeenCalledTimes(1);
    });

    it('ห้องเล่นเลยท้ายเพลงไปแล้ว → ไม่เริ่มเพลงเดิมใหม่ตั้งแต่ต้น', async () => {
      await openPlayer();
      yt.player.state = PLAYER_STATE.ENDED;
      receive({ karaoke: { ...hostState(song), position: 300 } });
      expect(yt.player.seekTo).not.toHaveBeenCalled();
      expect(yt.player.playVideo).not.toHaveBeenCalled();
    });

    it('host ข้ามหรือลบเพลงสุดท้าย (คิวว่าง) → หยุดเพลงเก่าทันที', async () => {
      await openPlayer();
      receive({ queue: [] });
      expect(yt.player.stopVideo).toHaveBeenCalledTimes(1);
    });

    it('host ข้ามไปเพลงถัดไป → หยุดเพลงเก่าทันที แล้วเล่นเพลงใหม่เมื่อ host เริ่มเพลงนั้น', async () => {
      await openPlayer();
      const next = { ...song, id: 's2', videoId: 'vid-2', title: 'เพลงถัดไป' };

      // คิวเปลี่ยนแล้ว แต่สถานะล่าสุดจาก host ยังเป็นของเพลงเก่า
      receive({ queue: [next] });
      expect(yt.player.stopVideo).toHaveBeenCalledTimes(1);
      expect(yt.player.loadVideoById).not.toHaveBeenCalled();

      receive({ karaoke: hostState(next) });
      expect(yt.player.loadVideoById).toHaveBeenCalledWith(
        expect.objectContaining({ videoId: 'vid-2' }),
      );
    });
  });

  describe('host (หยุดเพลงไม่ได้เหมือนคนอื่น)', () => {
    it('เพลงถูกหยุดตอนดูหน้าอยู่ (เช่น ปุ่มเล่น/หยุดบนคีย์บอร์ด) → ไม่บอกห้องให้หยุด และเล่นต่อทันที', async () => {
      await openPlayer({ isHost: true });
      changeState(PLAYER_STATE.PLAYING, PLAYER_STATE.PAUSED);
      expect(emittedPause()).toBe(false);
      expect(yt.player.playVideo).toHaveBeenCalledTimes(1);
    });

    it('เพลงโดนหยุดตอนอยู่แท็บอื่น → ไม่บอกห้องให้หยุดตาม และสั่งเล่นต่อทันที', async () => {
      await openPlayer({ isHost: true });
      changeState(PLAYER_STATE.PLAYING);
      setVisibility('hidden');
      changeState(PLAYER_STATE.PAUSED); // เช่น ส่วนขยายหยุดเพลงตอนสลับแท็บ
      expect(emittedPause()).toBe(false);
      expect(yt.player.playVideo).toHaveBeenCalledTimes(1);
    });

    it('เล่นต่อไม่ได้ → ลองไม่เกิน 3 ครั้ง แล้วกลับมาเล่นต่อจากเวลาของห้อง', async () => {
      await openPlayer({ isHost: true });
      let now = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => now);
      changeState(PLAYER_STATE.PLAYING); // เพลงเริ่มที่เครื่อง host: ห้องเริ่มนับที่วินาทีที่ 30
      yt.player.playVideo.mockImplementation(() => {}); // มือถือไม่ยอมให้เล่นเบื้องหลัง

      setVisibility('hidden');
      for (let i = 0; i < 5; i++) changeState(PLAYER_STATE.PLAYING, PLAYER_STATE.PAUSED);
      expect(yt.player.playVideo).toHaveBeenCalledTimes(3);

      now += 10_000;
      yt.player.playVideo.mockClear();
      setVisibility('visible');
      expect(yt.player.seekTo).toHaveBeenCalledWith(40, true);
      expect(yt.player.playVideo).toHaveBeenCalledTimes(1);
      // ส่งเวลาของห้อง (40) ไม่ใช่ตำแหน่งที่ตัวเล่นค้างอยู่ (30)
      expect(lastEmitted()).toMatchObject({ playing: true, position: 40 });
      expect(emittedPause()).toBe(false);
    });

    it('ไม่อยู่จนห้องเล่นจบเพลงไปแล้ว → กลับมาแล้วขึ้นเพลงถัดไป', async () => {
      await openPlayer({ isHost: true });
      let now = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => now);
      changeState(PLAYER_STATE.PLAYING);
      yt.player.playVideo.mockImplementation(() => {});
      setVisibility('hidden');
      changeState(PLAYER_STATE.PAUSED);

      now += 200_000; // 30 + 200 วินาที เลยความยาวเพลง (212 วินาที)
      yt.player.playVideo.mockClear();
      setVisibility('visible');
      expect(nextSong).toHaveBeenCalledWith('r1', { reason: 'done' });
      expect(yt.player.playVideo).not.toHaveBeenCalled();
    });

    it('เบราว์เซอร์ไม่ยอมเล่นเพลงใหม่เอง → ขึ้นปุ่มแตะเพื่อฟัง กดแล้วห้องเริ่มเพลงนั้น', async () => {
      await openPlayer({ isHost: true });
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      yt.player.loadVideoById.mockImplementation(({ videoId }) => {
        yt.player.videoId = videoId;
        yt.player.state = PLAYER_STATE.UNSTARTED; // ถูกบล็อกไม่ให้เล่นเสียงเอง
      });
      const next = { ...song, id: 's2', videoId: 'vid-2', title: 'เพลงถัดไป' };

      receive({ queue: [next] });
      expect(yt.player.loadVideoById).toHaveBeenCalledWith({ videoId: 'vid-2', startSeconds: 0 });
      act(() => vi.advanceTimersByTime(1500));

      fireEvent.click(screen.getByRole('button', { name: /แตะเพื่อเริ่มฟัง/ }));
      expect(yt.player.playVideo).toHaveBeenCalledTimes(1);
      expect(lastEmitted()).toMatchObject({ songId: 's2', playing: true });
    });

    it('เพลงถัดไปเป็นวิดีโอเดียวกัน → โหลดใหม่ตั้งแต่ต้น ไม่ค้างอยู่ท้ายเพลงเดิม', async () => {
      await openPlayer({ isHost: true });
      changeState(PLAYER_STATE.PLAYING, PLAYER_STATE.ENDED);
      expect(nextSong).toHaveBeenCalledWith('r1', { reason: 'done' });

      receive({ queue: [{ ...song, id: 's2' }] }); // คนละคิว แต่เป็นวิดีโอเดิม
      expect(yt.player.loadVideoById).toHaveBeenCalledWith({
        videoId: song.videoId,
        startSeconds: 0,
      });
    });

    it('ได้เป็น host กลางเพลง → ใช้ตัวเล่นเดิมโดยไม่โหลดใหม่ และเล่นต่อตามเวลาของห้องเดิม', async () => {
      let now = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => now);
      const view = await openPlayer(); // ยังเป็นคนฟัง: ห้องเล่นถึงวินาทีที่ 30
      const player = yt.player;

      now += 5_000;
      view.rerender(<KaraokePlayer roomId="r1" isHost />);
      expect(yt.player).toBe(player);
      expect(player.loadVideoById).not.toHaveBeenCalled();

      // รอบตรวจของ host (ทุก 4 วินาที หรือตอนกลับมาที่หน้านี้) นับต่อจากเวลาของห้องเดิม: 30 + 5 วินาที
      setVisibility('visible');
      expect(player.seekTo).toHaveBeenCalledWith(35, true);
      expect(lastEmitted()).toMatchObject({ songId: song.id, playing: true, position: 35 });
    });
  });
});
