// ตัวควบคุมการอยู่ในห้องสนทนา (ใช้ร่วมกันทั้งห้อง 1-1 ห้องกลุ่ม และห้องคาราโอเกะ)
// รวม: ไมโครโฟน → เข้าห้องผ่าน REST → Socket.IO → WebRTC Mesh → Speaking Indicator
import { joinRoom, leaveRoom, sendMessage as postMessage } from '../api/rooms';
import { readIceServers } from '../api/rtc';
import { connectedSocket, getSocket, measureClockOffset } from './socket';
import { PeerMesh } from './rtc/PeerMesh';
import { createLevelMonitor, getAudioContext } from './rtc/levels';
import { useRoomStore } from '../stores/roomStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../stores/uiStore';

const store = () => useRoomStore.getState();
const myId = () => useAuthStore.getState().user?.id;

// ขอรายชื่อ STUN/TURN ครั้งเดียวต่อการเปิดเว็บ เก็บเป็น promise จึงเรียกซ้อนกันได้ (เช่น ตอนเปิดหน้าห้องกับตอนกดเข้าห้อง)
// โดยยิงคำขอเดียว · ขอไม่สำเร็จให้ล้างทิ้ง ครั้งหน้าจะขอใหม่
let iceServersRequest = null;
const getIceServers = async () => {
  const request = (iceServersRequest ??= readIceServers());
  try {
    const { data } = await request;
    return data.iceServers;
  } catch (err) {
    if (iceServersRequest === request) iceServersRequest = null;
    throw err;
  }
};

/** วัดเวลาที่ต่างจาก server ไว้ซิงก์เพลงคาราโอเกะ (ไม่ต้องรอผลก่อนเข้าห้อง) */
const syncClock = async (socket) => {
  try {
    store().patch({ clockOffset: await measureClockOffset(socket) });
  } catch {
    // วัดไม่ได้: ใช้ค่าเดิม (0) ไปก่อน เพลงอาจคลาดกันเล็กน้อย
  }
};

const requestMic = async () => {
  if (!navigator.mediaDevices?.getUserMedia) return null;
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false,
  });
};

class RoomSession {
  roomId = null;
  socket = null;
  mesh = null;
  localStream = null;
  monitor = null;
  handlers = [];

  /** เปิดหน้าห้อง (ก่อนกดเข้า): ต่อ socket และโหลด ICE servers รอไว้ ตอนกดเข้าห้องจะได้ไม่ต้องรอสองอย่างนี้ */
  async prepare() {
    getSocket();
    try {
      await getIceServers();
    } catch {
      // โหลดล่วงหน้าไม่สำเร็จไม่เป็นไร ตอนกดเข้าห้องจะขอใหม่อีกครั้ง
    }
  }

  /** เรียกจากการกดปุ่ม "เข้าห้อง" เท่านั้น (เบราว์เซอร์ต้องการ user gesture สำหรับไมค์/เสียง) */
  async join(roomId, { withMic = true, startMuted = false } = {}) {
    if (this.roomId === roomId && store().status === 'joined') return;
    if (this.roomId) await this.leave();

    this.roomId = roomId;
    store().reset(roomId);
    store().patch({ status: 'joining' });
    getAudioContext();

    try {
      if (withMic) {
        try {
          this.localStream = await requestMic();
        } catch {
          toast('ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน เข้าห้องแบบฟังอย่างเดียวนะ', 'info');
        }
      }
      const track = this.localStream?.getAudioTracks()[0];
      if (track && startMuted) track.enabled = false;

      // ขอเข้าห้อง (REST) ต่อ socket และโหลด ICE servers พร้อมกัน ไม่ต้องรอทีละขั้น
      // (room:join ด้านล่างยังส่งหลังเข้าห้องทาง REST สำเร็จเหมือนเดิม)
      const [, iceServers, socket] = await Promise.all([
        joinRoom(roomId),
        getIceServers(),
        connectedSocket(),
      ]);
      this.socket = socket;

      this.monitor = createLevelMonitor((levels) => store().setLevels(levels));
      if (this.localStream) this.monitor.add(myId(), this.localStream);

      this.mesh = new PeerMesh({
        socket,
        localStream: this.localStream,
        iceServers,
        onStream: ({ userId, stream }) => {
          store().setStream(userId, stream);
          this.monitor.add(userId, stream);
        },
        onClose: ({ userId }) => {
          store().removeStream(userId);
          this.monitor?.remove(userId);
        },
        onState: ({ userId, state }) => store().setPeerState(userId, state),
      });

      this.#bind(socket);
      const ack = await this.#socketJoin();
      this.#applySnapshot(ack);
      store().patch({
        status: 'joined',
        micAvailable: Boolean(track),
        muted: !track || !track.enabled,
      });
      if (track && !track.enabled) socket.emit('room:mute', { muted: true });

      if (ack.room.type === 'karaoke') syncClock(socket);
    } catch (err) {
      this.#teardown();
      this.roomId = null;
      store().patch({ status: 'error', error: err });
      throw err;
    }
  }

  async #socketJoin(retry = true) {
    const ack = await this.socket.timeout(10000).emitWithAck('room:join', { roomId: this.roomId });
    if (!ack.ok && ack.code === 'NOT_A_MEMBER' && retry) {
      await joinRoom(this.roomId);
      return this.#socketJoin(false);
    }
    if (!ack.ok)
      throw Object.assign(new Error(ack.message ?? 'เข้าห้องไม่สำเร็จ'), { code: ack.code });
    return ack;
  }

  #applySnapshot(ack) {
    store().setMessages(ack.messages);
    store().patch({
      room: ack.room,
      hostId: ack.room.hostId,
      members: ack.room.members,
      online: ack.online,
      queue: ack.queue,
      karaoke: ack.karaoke,
    });
  }

  #bind(socket) {
    const on = (event, fn) => {
      socket.on(event, fn);
      this.handlers.push([event, fn]);
    };
    const s = store;

    on('room:peer-joined', async ({ socketId, userId }) => {
      s().setOnline(userId, true);
      try {
        await this.mesh?.connectTo({ socketId, userId });
      } catch (err) {
        console.warn('connectTo failed', err);
      }
    });
    on('room:peer-left', ({ socketId, userId }) => {
      this.mesh?.closePeer(socketId);
      s().setOnline(userId, false);
    });
    on('signal', (message) => this.mesh?.handleSignal(message));

    on('room:member-joined', (member) => s().upsertMember(member));
    on('room:member-left', ({ userId }) => {
      s().removeMember(userId);
      if (userId === myId()) {
        this.#teardown();
        s().patch({ status: 'left' });
      }
    });
    on('room:member-updated', ({ userId, isMuted }) => s().updateMember(userId, { isMuted }));
    on('room:host-changed', ({ hostId }) => s().patch({ hostId }));
    on('room:closed', ({ reason }) => {
      this.#teardown();
      s().patch({ status: 'closed', error: reason === 'moderated' ? 'moderated' : null });
    });
    on('room:replaced', () => {
      this.#teardown();
      s().patch({ status: 'replaced' });
    });
    // เจ้าของห้องเชิญเราออก (server เอาเราออกจากห้องแล้ว): ปิดห้องฝั่งเรา แล้วบอกเหตุผล
    on('room:kicked', ({ roomId }) => {
      if (roomId !== this.roomId) return;
      this.#teardown();
      s().patch({ status: 'kicked' });
    });

    on('chat:message', (message) => s().addMessage(message));
    on('chat:message-hidden', ({ id }) => s().hideMessage(id));
    on('queue:updated', ({ queue }) => s().patch({ queue }));
    on('karaoke:state', (karaoke) => s().patch({ karaoke }));

    // เน็ตหลุด: บอกผู้ใช้ (ConnectionBanner) ระหว่างที่ socket.io พยายามต่อใหม่ให้เอง
    on('disconnect', () => s().patch({ connected: false }));
    // เน็ตหลุดแล้วต่อกลับมาได้: socket id ใหม่ → ต่อเสียงใหม่ทั้งหมด
    on('connect', async () => {
      s().patch({ connected: true });
      if (s().status !== 'joined') return;
      this.mesh?.closeAll();
      try {
        this.#applySnapshot(await this.#socketJoin());
      } catch (err) {
        this.#teardown();
        s().patch({ status: 'error', error: err });
      }
    });
  }

  toggleMute() {
    const track = this.localStream?.getAudioTracks()[0];
    if (!track) return this.enableMic();
    track.enabled = !track.enabled;
    store().patch({ muted: !track.enabled });
    this.socket?.emit('room:mute', { muted: !track.enabled });
  }

  /** เข้าห้องแบบฟังอย่างเดียวแล้วอยากเปิดไมค์ภายหลัง: ใส่เสียงเข้า transceiver เดิม ไม่ต้องต่อใหม่ */
  async enableMic() {
    try {
      const stream = await requestMic();
      if (!stream) throw new Error('no mic');
      const track = stream.getAudioTracks()[0];
      this.localStream = stream;
      if (this.mesh) {
        this.mesh.localStream = stream;
        for (const { pc } of this.mesh.peers.values()) {
          const transceiver = pc.getTransceivers().find((t) => t.receiver.track?.kind === 'audio');
          await transceiver?.sender.replaceTrack(track);
          transceiver?.sender.setStreams?.(stream);
        }
      }
      this.monitor?.add(myId(), stream);
      store().patch({ micAvailable: true, muted: false });
      this.socket?.emit('room:mute', { muted: false });
    } catch {
      toast('เปิดไมโครโฟนไม่ได้ ตรวจสอบการอนุญาตในเบราว์เซอร์นะ', 'error');
    }
  }

  sendMessage(type, content) {
    return postMessage(this.roomId, { type, content });
  }

  /** เจ้าของห้องเชิญคนออก (ห้องกลุ่ม/คาราโอเกะ) · ไม่สำเร็จจะ throw พร้อมข้อความภาษาไทยจาก server */
  async kick(userId) {
    let ack;
    try {
      ack = await this.socket.timeout(5000).emitWithAck('room:kick', { userId });
    } catch {
      throw new Error('เชิญออกไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่นะ');
    }
    if (!ack.ok) {
      throw Object.assign(new Error(ack.message ?? 'เชิญออกไม่สำเร็จ ลองใหม่อีกครั้งนะ'), {
        code: ack.code,
      });
    }
  }

  async leave() {
    const roomId = this.roomId;
    if (!roomId) return;
    const socket = this.socket;
    this.#teardown();
    this.roomId = null;
    try {
      if (socket?.connected) await socket.timeout(5000).emitWithAck('room:leave', {});
      else await leaveRoom(roomId);
    } catch {
      try {
        await leaveRoom(roomId);
      } catch {
        // แจ้ง server ไม่สำเร็จ: server จะเคลียร์สมาชิกที่หลุดไปให้เองภายหลัง (presence sweep)
      }
    }
    store().reset();
  }

  #teardown() {
    for (const [event, fn] of this.handlers) this.socket?.off(event, fn);
    this.handlers = [];
    this.mesh?.closeAll();
    this.mesh = null;
    this.monitor?.stop();
    this.monitor = null;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
  }
}

export const roomSession = new RoomSession();
