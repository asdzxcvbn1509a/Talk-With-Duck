// ตัวเล่นเพลงคาราโอเกะ (YouTube IFrame API) ที่ซิงก์ให้ทุกคนในห้องได้ยินตรงจังหวะเดียวกัน (ข้อ 3.5.6)
// - เพลงเล่นเองตั้งแต่ต้นจนจบ ไม่มีใครหยุด เลื่อน หรือคลิกที่วิดีโอได้ รวมถึงเจ้าของห้อง (host)
// - host จับเวลาของห้อง: เริ่มนับตอนเพลงเล่นจริงที่เครื่อง host แล้วส่งตำแหน่งเพลงผ่าน Socket.IO ทุก 4 วินาที
//   (สถานะที่ส่งเป็น "กำลังเล่น" เสมอ)
// - ทุกเครื่องรวมถึง host ปรับตัวเล่นให้ตรงกับเวลาของห้อง ถ้าคลาดเกิน 1 วินาทีจะกระโดดไปตำแหน่งที่ถูกต้อง
//   host เน็ตกระตุกจึงไม่ลากทั้งห้องย้อนกลับ
// - เพลงโดนหยุดจากทางอื่น (ปุ่มเล่น/หยุดบนคีย์บอร์ดหรือหูฟัง ส่วนขยาย สลับแท็บ พับจอ ฯลฯ) จะเล่นต่อเองจากตำแหน่งที่ห้องเล่นถึง
import { MicVocal, Play, Radio, SkipForward, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { nextSong } from '../../api/rooms';
import { errorMessage } from '../../lib/api';
import { expectedPosition, needsSeek, songOver } from '../../lib/karaokeSync';
import { roomSession } from '../../lib/roomSession';
import { PLAYER_STATE, UNPLAYABLE_ERRORS, loadYouTubeApi } from '../../lib/youtube';
import { useRoomStore } from '../../stores/roomStore';
import { toast } from '../../stores/uiStore';

const HEARTBEAT_MS = 4000;
const DRIFT_CHECK_MS = 3000;
const TAP_CHECK_MS = 1500;
// ตอนหน้านี้ถูกซ่อน สั่งเล่นต่อทันทีที่โดนหยุดได้กี่ครั้ง (นับใหม่ทุกครั้งที่ออกจากหน้านี้) เกินแล้วรอรอบตรวจ
// มือถือบางรุ่นไม่ยอมให้เล่นเบื้องหลัง หรืออาจมีอะไรคอยหยุดเพลงซ้ำ ถ้าไม่จำกัดจะสั่งวนไม่จบ
const MAX_RESUME_ATTEMPTS = 3;

/**
 * สถานะของ host ที่ยังใช้ได้: ต้องเป็นเพลงเดียวกับที่กำลังเล่นในคิว
 * ถ้า host เพิ่งข้าม/ลบเพลง หรือเพลงจบไปแล้ว สถานะล่าสุดที่ได้รับยังเป็นของเพลงเก่า จึงไม่นับ
 */
const hostStateOf = ({ karaoke, current }) =>
  karaoke?.videoId && karaoke.songId === current?.id ? karaoke : null;

const isPlaying = (playerState) =>
  playerState === PLAYER_STATE.PLAYING || playerState === PLAYER_STATE.BUFFERING;

const KaraokePlayer = ({ roomId, isHost }) => {
  const queue = useRoomStore((s) => s.queue);
  const karaoke = useRoomStore((s) => s.karaoke);
  const clockOffset = useRoomStore((s) => s.clockOffset);
  const current = queue.find((s) => s.status === 'playing') ?? null;

  const wrapperRef = useRef(null);
  const playerRef = useRef(null);
  const latest = useRef({});
  const advancing = useRef(null);
  const lastState = useRef(PLAYER_STATE.UNSTARTED);
  // host: ตำแหน่งเพลงล่าสุดที่ส่งให้ห้อง { songId, position, at } ใช้คำนวณว่าตอนนี้ห้องเล่นถึงไหนแล้ว
  const lastEmit = useRef(null);
  const resumeAttempts = useRef(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [volume, setVolume] = useState(80);

  useEffect(() => {
    latest.current = { current, karaoke, clockOffset, isHost };
  });

  /** เบราว์เซอร์บางตัว (โดยเฉพาะ iOS) ไม่ยอมเล่นเสียงเองจนกว่าผู้ใช้จะแตะหน้าจอ: ถ้ายังไม่เล่นให้ขึ้นปุ่มแตะเพื่อฟัง */
  const tapIfStillPaused = useCallback((shouldPlay) => {
    setTimeout(() => {
      const player = playerRef.current;
      if (player && shouldPlay() && !isPlaying(player.getPlayerState?.())) setNeedsTap(true);
    }, TAP_CHECK_MS);
  }, []);

  const advance = useCallback(
    async (reason) => {
      const song = latest.current.current;
      if (!song || advancing.current === song.id) return;
      advancing.current = song.id;
      try {
        await nextSong(roomId, { reason });
      } catch (err) {
        toast(errorMessage(err), 'error');
      }
    },
    [roomId],
  );

  /** คนที่ไม่ใช่ host: ปรับตัวเล่นให้ตรงกับเวลาของห้องตามสถานะล่าสุดของ host (มีสถานะ = กำลังเล่นเสมอ) */
  const applyHostState = useCallback(() => {
    const player = playerRef.current;
    const { clockOffset: offset, isHost: host } = latest.current;
    if (host || !player?.getPlayerState) return;
    const state = hostStateOf(latest.current);
    if (!state) {
      // ยังไม่มีเพลง หรือ host เพิ่งข้าม/ลบเพลง: หยุดเพลงเก่าทันที แล้วรอ host เริ่มเพลงใหม่
      if (isPlaying(player.getPlayerState())) player.stopVideo();
      return;
    }
    const target = expectedPosition(state, Date.now(), offset);
    if (player.getVideoData?.()?.video_id !== state.videoId) {
      player.loadVideoById({ videoId: state.videoId, startSeconds: target });
      return;
    }
    // ห้องเล่นจบเพลงไปแล้ว (เช่น host ไม่ได้ดูหน้าเว็บตอนเพลงจบ): รอ host ขึ้นเพลงถัดไป
    // ถ้าสั่งเล่นตอนนี้ ตัวเล่นที่จบไปแล้วจะเริ่มเพลงเดิมใหม่ตั้งแต่ต้น
    if (songOver(target, player.getDuration?.() ?? 0)) return;
    if (needsSeek(player.getCurrentTime() ?? 0, target)) player.seekTo(target, true);
    if (!isPlaying(player.getPlayerState())) {
      player.playVideo();
      tapIfStillPaused(() => Boolean(hostStateOf(latest.current)));
    }
  }, [tapIfStillPaused]);

  /**
   * host: ให้ตัวเล่นของตัวเองตรงกับเวลาของห้อง แล้วส่งตำแหน่งให้ห้องซ้ำ (เผื่อคนเพิ่งเข้าห้อง หรือ server เพิ่งเริ่มใหม่)
   * เวลาของห้องเริ่มนับตอนเพลงเล่นจริงที่เครื่อง host แล้วเดินตามนาฬิกา ไม่ได้ขึ้นกับตัวเล่นของ host
   */
  const syncHost = useCallback(() => {
    const player = playerRef.current;
    const { current: song, clockOffset: offset } = latest.current;
    // กำลังโหลดเพลงนี้อยู่: รอให้โหลดเสร็จก่อน
    if (!player?.getPlayerState || !song || player.getVideoData?.()?.video_id !== song.videoId) {
      return;
    }
    const emit = (position) => {
      lastEmit.current = { songId: song.id, position, at: Date.now() };
      roomSession.socket?.emit('karaoke:state', {
        songId: song.id,
        videoId: song.videoId,
        playing: true,
        position,
      });
    };
    const playerState = player.getPlayerState();
    const last = lastEmit.current;
    // เพิ่งได้เป็น host กลางเพลง หรือเพิ่งรีเฟรชหน้า: นับต่อจากเวลาของห้องที่ได้รับล่าสุด
    const previous = hostStateOf(latest.current);
    let target = null;
    if (last?.songId === song.id) target = last.position + (Date.now() - last.at) / 1000;
    else if (previous) target = expectedPosition(previous, Date.now(), offset);
    if (target === null) {
      // ห้องยังไม่เริ่มเพลงนี้: เริ่มนับตอนเพลงเล่นจริงที่เครื่อง host
      if (playerState === PLAYER_STATE.PLAYING) emit(player.getCurrentTime() ?? 0);
      return;
    }
    // ห้องเล่นจบเพลงนี้ไปแล้ว (เช่น host ไม่ได้ดูหน้าเว็บตอนเพลงจบ): ขึ้นเพลงถัดไปเลย ไม่สั่งเล่น
    // (ตัวเล่นที่จบไปแล้วจะเริ่มเพลงเดิมใหม่ตั้งแต่ต้น) · ถ้ายังเล่นอยู่ให้เล่นจนจบเอง แล้วค่อยขึ้นเพลงถัดไป
    if (songOver(target, player.getDuration?.() ?? 0)) {
      if (!isPlaying(playerState)) advance('done');
      return;
    }
    if (needsSeek(player.getCurrentTime() ?? 0, target)) player.seekTo(target, true);
    if (!isPlaying(playerState)) {
      player.playVideo();
      tapIfStillPaused(() => latest.current.current?.id === song.id);
    }
    // ส่งตำแหน่งตามเวลาของห้อง ไม่ใช่ตำแหน่งของตัวเล่น host เน็ตกระตุกจึงไม่ลากทั้งห้องย้อนกลับ
    emit(target);
  }, [tapIfStillPaused, advance]);

  // สร้างตัวเล่นครั้งเดียว ทุกคนใช้แบบเดียวกัน (ไม่มีปุ่มควบคุม ปิดคีย์ลัด) สิทธิ์ host เปลี่ยนจึงไม่ต้องโหลดเพลงใหม่
  useEffect(() => {
    let cancelled = false;
    const wrapper = wrapperRef.current;
    const mountPlayer = async () => {
      try {
        const YT = await loadYouTubeApi();
        if (cancelled) return;
        const mount = document.createElement('div');
        wrapper.appendChild(mount);
        lastState.current = PLAYER_STATE.UNSTARTED;
        lastEmit.current = null;
        const player = new YT.Player(mount, {
          width: '100%',
          height: '100%',
          playerVars: {
            controls: 0,
            disablekb: 1,
            rel: 0,
            playsinline: 1,
            modestbranding: 1,
          },
          events: {
            onReady: () => {
              player.setVolume(80);
              playerRef.current = player;
              setReady(true);
            },
            onStateChange: ({ data }) => {
              const previous = lastState.current;
              lastState.current = data;
              if (data === PLAYER_STATE.PLAYING) setNeedsTap(false);
              const host = latest.current.isHost;
              if (host && data === PLAYER_STATE.ENDED) {
                advance('done');
                return;
              }
              // host: เพลงเพิ่งเริ่มเล่น → เริ่มนับเวลาของห้องทันที ไม่ต้องรอรอบส่งตำแหน่ง
              if (
                host &&
                data === PLAYER_STATE.PLAYING &&
                lastEmit.current?.songId !== latest.current.current?.id
              ) {
                syncHost();
                return;
              }
              // ไม่มีใครหยุดเพลงได้: โดนหยุดจากทางอื่น (ปุ่มบนคีย์บอร์ด/หูฟัง ส่วนขยาย ฯลฯ) → เล่นต่อตามเวลาของห้องทันที
              // - นับเฉพาะตอนที่เพิ่งเล่นอยู่ ถ้าเบราว์เซอร์บล็อกเสียงตั้งแต่แรก ปุ่มแตะเพื่อฟังจัดการอยู่แล้ว
              // - คนที่ไม่ใช่ host: ห้องยังไม่เริ่มเพลงนี้ แต่ตัวเล่นกลับเล่นขึ้นมาเอง → หยุดรอ host
              // - ตอนหน้านี้ถูกซ่อน ลองได้ไม่เกิน MAX_RESUME_ATTEMPTS ครั้ง มือถือบางรุ่นหยุดวิดีโอเองตอนสลับแอป
              const shouldPlay = host || Boolean(hostStateOf(latest.current));
              const interrupted = shouldPlay
                ? data === PLAYER_STATE.PAUSED && previous === PLAYER_STATE.PLAYING
                : data === PLAYER_STATE.PLAYING;
              if (!interrupted) return;
              if (document.visibilityState === 'hidden') {
                if (resumeAttempts.current >= MAX_RESUME_ATTEMPTS) return;
                resumeAttempts.current += 1;
              }
              if (host) syncHost();
              else applyHostState();
            },
            onError: ({ data }) => {
              if (!latest.current.isHost || !UNPLAYABLE_ERRORS.has(data)) return;
              toast('วิดีโอนี้เปิดในเว็บไม่ได้ ข้ามไปเพลงถัดไปนะ', 'error');
              advance('skipped');
            },
          },
        });
      } catch {
        if (!cancelled) setLoadError(true);
      }
    };
    mountPlayer();

    return () => {
      cancelled = true;
      setReady(false);
      playerRef.current?.destroy?.();
      playerRef.current = null;
      wrapper.innerHTML = '';
    };
  }, [advance, applyHostState, syncHost]);

  // host: เพลงในคิวเปลี่ยน → เริ่มเพลงใหม่ (เพลงถัดไปเป็นวิดีโอเดิมก็โหลดใหม่ ไม่ค้างอยู่ท้ายเพลง)
  // เพิ่งได้เป็น host กลางเพลง: ตัวเล่นเล่นเพลงนี้อยู่แล้วก็เล่นต่อ ไม่งั้นโหลดที่ตำแหน่งที่ห้องเล่นถึง
  useEffect(() => {
    const player = playerRef.current;
    if (!ready || !isHost || !player) return;
    const song = latest.current.current;
    if (!song) {
      player.stopVideo?.();
      return;
    }
    const state = hostStateOf(latest.current);
    if (state && player.getVideoData?.()?.video_id === song.videoId) return;
    const resumeAt = state ? expectedPosition(state, Date.now(), latest.current.clockOffset) : 0;
    player.loadVideoById({ videoId: song.videoId, startSeconds: resumeAt });
    // host คลิกวิดีโอไม่ได้: ถ้าเบราว์เซอร์ไม่ยอมเล่นเอง ต้องขึ้นปุ่มแตะเพื่อฟัง ไม่งั้นทั้งห้องไม่ได้เริ่มเพลง
    tapIfStillPaused(() => latest.current.current?.id === song.id);
  }, [ready, isHost, current?.id, tapIfStillPaused]);

  // host: ทุก 4 วินาที ปรับตัวเล่นให้ตรงกับเวลาของห้อง (ถ้าโดนหยุดอยู่ก็สั่งเล่นต่อ) แล้วส่งตำแหน่งซ้ำ
  useEffect(() => {
    if (!ready || !isHost) return undefined;
    const timer = setInterval(syncHost, HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [ready, isHost, syncHost]);

  // ออกจากหน้านี้แล้วกลับมา: เพลงอาจโดนหยุดระหว่างนั้น ให้เล่นต่อทันทีโดยไม่ต้องรอรอบตรวจ
  useEffect(() => {
    if (!ready) return undefined;
    const onVisibilityChange = () => {
      resumeAttempts.current = 0;
      if (document.visibilityState !== 'visible') return;
      if (latest.current.isHost) syncHost();
      else applyHostState();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [ready, applyHostState, syncHost]);

  // คนอื่น: ตามสถานะของ host ทุกครั้งที่ได้รับ และตรวจความคลาดเคลื่อนเป็นระยะ
  useEffect(() => {
    if (ready && !isHost) applyHostState();
  }, [ready, isHost, karaoke, current?.id, applyHostState]);

  useEffect(() => {
    if (!ready || isHost) return undefined;
    const timer = setInterval(applyHostState, DRIFT_CHECK_MS);
    return () => clearInterval(timer);
  }, [ready, isHost, applyHostState]);

  useEffect(() => {
    playerRef.current?.setVolume?.(volume);
  }, [volume, ready]);

  const tapToListen = () => {
    setNeedsTap(false);
    playerRef.current?.playVideo();
    if (isHost) syncHost();
    else applyHostState();
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-(--radius-card) bg-[#1c1814] shadow-(--shadow-soft)">
        {/* ไม่มีใครคลิกหรือกดคีย์ที่วิดีโอได้ รวมถึง host (กันหยุด/เลื่อนเพลง) ปุ่มแตะเพื่อฟังอยู่คนละชั้นจึงยังกดได้ */}
        <div
          ref={wrapperRef}
          inert
          className="pointer-events-none absolute inset-0 [&>iframe]:h-full [&>iframe]:w-full"
        />
        {!current && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-beak-400 to-duck-400 text-center text-[#3B2F1E]">
            <MicVocal size={56} className="animate-float" />
            <p className="font-display text-xl">ยังไม่มีเพลงในคิว</p>
            <p className="text-sm opacity-80">ค้นหาเพลงแล้วกดเพิ่มเข้าคิวได้เลย</p>
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6 text-center text-white">
            โหลดตัวเล่น YouTube ไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วรีเฟรชหน้านี้
          </div>
        )}
        {needsTap && current && (
          <button
            type="button"
            onClick={tapToListen}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-duck-400 text-[#3B2F1E]">
              <Play size={36} fill="currentColor" />
            </span>
            <span className="font-display text-lg">แตะเพื่อเริ่มฟังเพลงพร้อมเพื่อน ๆ</span>
          </button>
        )}
      </div>

      {/* ชื่อเพลงกว้างอย่างน้อย 12rem: จอแคบแถบเสียงกับปุ่มข้ามเพลงจะขึ้นบรรทัดใหม่แทนการบีบชื่อเพลง */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-xs font-semibold text-muted">
            {current ? 'กำลังเล่น' : 'รอเพลงถัดไป'}
          </p>
          <p className="truncate font-display text-lg">{current?.title ?? '—'}</p>
          {current && <p className="text-sm text-muted">จองโดย {current.requestedBy?.nickname}</p>}
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          <Volume2 size={18} />
          <span className="sr-only">ระดับเสียงเพลง</span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-28 accent-[#f5b316]"
          />
        </label>
        {isHost && current && (
          <button
            type="button"
            onClick={() => advance('skipped')}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold hover:bg-surface-2"
          >
            <SkipForward size={16} /> ข้ามเพลง
          </button>
        )}
      </div>
      {current && (
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Radio size={14} className="shrink-0" /> เพลงเล่นเองจนจบ ไม่มีใครหยุดหรือเลื่อนได้
          ทุกคนจึงได้ยินตรงจังหวะเดียวกัน
        </p>
      )}
    </div>
  );
};

export default KaraokePlayer;
