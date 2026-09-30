# Socket.IO events

Socket.IO บน Express ทำหน้าที่เป็น Signaling Server ของ WebRTC และส่งข้อมูลแบบเรียลไทม์ทั้งหมด (แชท, สมาชิกในห้อง, คิวเพลง, รายการห้องใน lobby, ซิงก์เพลงคาราโอเกะ)

**การเชื่อมต่อ:**
- dev: ผ่าน Vite proxy (`/socket.io`) เสมอ ไม่อ่าน `VITE_SOCKET_URL`
- prod: ต่อตรงไปที่ Render (`VITE_SOCKET_URL`)
- ส่ง Access Token ผ่าน `auth.token` ตอน handshake · ถ้าหมดอายุ server จะตอบ `connect_error` ข้อความ `TOKEN_EXPIRED` แล้ว client จะ refresh token และต่อใหม่เอง

## ลำดับการเข้าห้องและต่อเสียง (ข้อ 3.5.5)

```
ผู้ใช้ B (เข้าใหม่)                    Server                         ผู้ใช้ A (อยู่ในห้องก่อน)
  getUserMedia() ขอไมค์
  POST /api/rooms/:id/join ─────────►  บันทึกสมาชิก ─── room:member-joined ──► อัปเดตรายชื่อ
  emit room:join ───────────────────►  ตรวจสมาชิก
  ◄──────── ack {room, messages, queue, karaoke, peers}
                                        ─── room:peer-joined {socketId: B} ───►
                                                                     สร้าง RTCPeerConnection
  ◄──── signal {type:'offer'} ─────────  relay  ◄──── signal {to: B, type:'offer'}
  setRemoteDescription + createAnswer
  signal {to: A, type:'answer'} ─────►  relay  ─────► setRemoteDescription
  ◄════ signal {type:'ice'} แลกกันทั้งสองทาง ════►
  ◄═══════════════ เสียงวิ่งตรงถึงกัน (RTCPeerConnection) ═══════════════►
```

- ห้องกลุ่มใช้แบบตาข่าย (Mesh): คนที่อยู่ในห้องก่อน**ทุกคน**สร้าง Offer ไปหาคนใหม่ คนใหม่จึงไม่ต้องสร้าง Offer เอง และไม่เกิดการชนกัน (glare)
- ถ้าต่อไม่ติด (`connectionState = failed`) ฝั่งที่สร้าง Offer จะ restart ICE เอง

## Client → Server

| Event | Payload | Ack | หมายเหตุ |
|---|---|---|---|
| `lobby:subscribe` / `lobby:unsubscribe` | – | – | รับการอัปเดตรายการห้อง |
| `room:join` | `{ roomId }` | `{ ok, room, messages, queue, karaoke, peers, online }` หรือ `{ ok:false, code }` | ต้องเป็นสมาชิก (เรียก REST join ก่อน) |
| `room:leave` | `{}` | `{ ok }` | ออกจากห้องทันที |
| `room:mute` | `{ muted }` | – | บันทึกสถานะไมค์ |
| `signal` | `{ to: socketId, type: 'offer'/'answer'/'ice', data }` | – | server ส่งต่อเฉพาะเมื่ออยู่ห้องเดียวกัน |
| `karaoke:state` | `{ songId, videoId, playing, position }` | – | รับจาก host เท่านั้น · host ส่งตอนเพลงเริ่มเล่นและทุก 4 วินาที · server เก็บ `playing: true` เสมอ (ไม่มีใครหยุดเพลงได้) |
| `karaoke:request-state` | `{}` | สถานะล่าสุด | |
| `time:sync` | `{}` | เวลา server (ms) | ใช้คำนวณความต่างของนาฬิกา |

## Server → Client

| Event | Payload | ส่งถึง |
|---|---|---|
| `lobby:room-upserted` | ข้อมูลห้อง | คนที่เปิด lobby |
| `lobby:room-removed` | `{ id }` | คนที่เปิด lobby |
| `room:peer-joined` / `room:peer-left` | `{ socketId, userId }` | คนในห้อง (ใช้จัดการ RTCPeerConnection) |
| `room:member-joined` | ข้อมูลสมาชิก | คนในห้อง |
| `room:member-left` | `{ userId }` | คนในห้อง |
| `room:member-updated` | `{ userId, isMuted }` | คนในห้อง |
| `room:host-changed` | `{ hostId }` | คนในห้อง |
| `room:closed` | `{ roomId, reason? }` | คนในห้อง (`reason: 'moderated'` = ผู้ดูแลปิด) |
| `room:replaced` | `{ roomId }` | แท็บเก่าเมื่อเปิดห้องเดียวกันในแท็บใหม่ |
| `signal` | `{ from, fromUserId, type, data }` | ปลายทางของ signal |
| `chat:message` | ข้อความ | คนในห้อง |
| `chat:message-hidden` | `{ id }` | คนในห้อง (ผู้ดูแลซ่อน) |
| `queue:updated` | `{ roomId, queue }` | คนในห้อง |
| `karaoke:state` | `{ songId, videoId, playing, position, serverTime }` | คนในห้อง ยกเว้น host |
| `admin:report-created` | `{ id, targetType, reason }` | ผู้ดูแลที่ออนไลน์ |
| `auth:banned` | – | ผู้ใช้ที่ถูกระงับ (แล้วถูกตัดการเชื่อมต่อ) |

## การเคลียร์คนที่หลุด

- **socket หลุด (ปิดแท็บ/เน็ตหลุด):** รอ 20 วินาทีเผื่อกลับมา ถ้าไม่กลับมานับว่าออกจากห้อง
- **เข้าห้องทาง REST แต่ไม่ได้ต่อ socket:** ถ้าเกิน 60 วินาที ตัวเก็บกวาดจะเคลียร์ออก (ตรวจทุก 30 วินาที)
- **server รีสตาร์ต:** มีช่วงผ่อนผันให้ client ต่อกลับมาก่อน แล้วค่อยเคลียร์คนที่ไม่กลับมา
