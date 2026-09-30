// การเชื่อมต่อเสียงแบบตาข่าย (Mesh) ตามข้อ 3.5.5:
// ทุกคนในห้องต่อ RTCPeerConnection ถึงกันโดยตรง เสียงไม่ผ่าน server
// server (Socket.IO) ทำหน้าที่แค่ส่งต่อ SDP Offer/Answer และ ICE Candidate ในช่วงเริ่มต้น
//
// ลำดับการต่อ: คนที่อยู่ในห้องก่อนได้ event "room:peer-joined" → สร้าง Offer ส่งไปหาคนใหม่
// → คนใหม่ตอบ Answer → แลก ICE Candidate → ได้ยินเสียงกัน

export class PeerMesh {
  /**
   * @param {object} opts
   * @param {import('socket.io-client').Socket} opts.socket
   * @param {MediaStream|null} opts.localStream  null = เข้าห้องแบบฟังอย่างเดียว
   * @param {RTCIceServer[]} opts.iceServers
   * @param {(peer: {socketId, userId, stream}) => void} opts.onStream
   * @param {(peer: {socketId, userId, state}) => void} opts.onState
   * @param {(peer: {socketId, userId}) => void} opts.onClose
   */
  constructor({ socket, localStream, iceServers, onStream, onState, onClose }) {
    this.socket = socket;
    this.localStream = localStream;
    this.iceServers = iceServers;
    this.onStream = onStream;
    this.onState = onState;
    this.onClose = onClose;
    this.peers = new Map(); // socketId -> { pc, userId, initiator, pendingIce: [] }
  }

  get localTrack() {
    return this.localStream?.getAudioTracks()[0] ?? null;
  }

  #send(to, type, data) {
    this.socket.emit('signal', { to, type, data });
  }

  #createPeer(socketId, userId, initiator) {
    this.closePeer(socketId);
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    const peer = { pc, userId, initiator, pendingIce: [] };
    this.peers.set(socketId, peer);

    pc.onicecandidate = (event) => {
      if (event.candidate) this.#send(socketId, 'ice', event.candidate.toJSON());
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? new MediaStream([event.track]);
      this.onStream?.({ socketId, userId, stream });
    };
    pc.onconnectionstatechange = () => {
      this.onState?.({ socketId, userId, state: pc.connectionState });
      if (pc.connectionState === 'failed' && peer.initiator) this.#restartIce(socketId);
    };
    return peer;
  }

  /** เราอยู่ในห้องก่อน: สร้าง Offer ให้คนที่เพิ่งเข้ามา */
  async connectTo({ socketId, userId }) {
    const { pc } = this.#createPeer(socketId, userId, true);
    // ใส่ transceiver แบบ sendrecv เสมอ แม้ไม่มีไมค์ เพื่อให้อีกฝ่ายส่งเสียงกลับมาได้
    pc.addTransceiver(this.localTrack ?? 'audio', {
      direction: 'sendrecv',
      streams: this.localStream ? [this.localStream] : [],
    });
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.#send(socketId, 'offer', pc.localDescription.toJSON());
  }

  async handleSignal({ from, fromUserId, type, data }) {
    try {
      if (type === 'offer') await this.#onOffer(from, fromUserId, data);
      else if (type === 'answer') await this.#onAnswer(from, data);
      else if (type === 'ice') await this.#onIce(from, data);
    } catch (err) {
      console.warn(`[PeerMesh] ${type} จาก ${from} ผิดพลาด`, err);
    }
  }

  async #onOffer(from, fromUserId, offer) {
    const existing = this.peers.get(from);
    const peer =
      existing && !existing.initiator ? existing : this.#createPeer(from, fromUserId, false);
    const { pc } = peer;
    await pc.setRemoteDescription(offer);

    // ผูกไมค์ของเรากับ transceiver ที่มากับ Offer
    const transceiver = pc.getTransceivers().find((t) => t.receiver.track?.kind === 'audio');
    if (transceiver) {
      if (this.localTrack) {
        await transceiver.sender.replaceTrack(this.localTrack);
        transceiver.sender.setStreams?.(this.localStream);
      }
      transceiver.direction = 'sendrecv';
    }

    await this.#flushIce(peer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.#send(from, 'answer', pc.localDescription.toJSON());
  }

  async #onAnswer(from, answer) {
    const peer = this.peers.get(from);
    if (!peer || peer.pc.signalingState !== 'have-local-offer') return;
    await peer.pc.setRemoteDescription(answer);
    await this.#flushIce(peer);
  }

  async #onIce(from, candidate) {
    const peer = this.peers.get(from);
    if (!peer) return;
    if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(candidate);
    else peer.pendingIce.push(candidate);
  }

  async #flushIce(peer) {
    const queued = peer.pendingIce.splice(0);
    for (const candidate of queued) await peer.pc.addIceCandidate(candidate);
  }

  async #restartIce(socketId) {
    const peer = this.peers.get(socketId);
    if (!peer) return;
    try {
      const offer = await peer.pc.createOffer({ iceRestart: true });
      await peer.pc.setLocalDescription(offer);
      this.#send(socketId, 'offer', peer.pc.localDescription.toJSON());
    } catch (err) {
      console.warn('[PeerMesh] restart ICE ไม่สำเร็จ', err);
    }
  }

  closePeer(socketId) {
    const peer = this.peers.get(socketId);
    if (!peer) return;
    peer.pc.onicecandidate = null;
    peer.pc.ontrack = null;
    peer.pc.onconnectionstatechange = null;
    peer.pc.close();
    this.peers.delete(socketId);
    this.onClose?.({ socketId, userId: peer.userId });
  }

  closeAll() {
    for (const socketId of [...this.peers.keys()]) this.closePeer(socketId);
  }
}
