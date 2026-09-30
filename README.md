# มัลติเล่า มัลติฟัง · Talk With Duck 🦆

เว็บแอปพื้นที่ปลอดภัยและระบบเพื่อนช่วยเพื่อนสำหรับนักศึกษาในสาขา (ชั้นปี 1–4)
รายวิชา Project Management · สาขาวิทยาการคอมพิวเตอร์ประยุกต์-มัลติมีเดีย มจธ.

| ฟังก์ชัน | อยู่ที่ |
|---|---|
| ห้องคุย 1-1 (Private Duck Room) และห้องกลุ่ม 5+ คน (Group Hangout Room) คุยด้วยเสียง WebRTC + แชท | `/lobby`, `/room/:id` |
| ระบบเลือกห้องตามชั้นปี (ปี 1–4) และสุ่มจับคู่คุย 1-1 | `/lobby` |
| Duck Karaoke Lounge: เปิดเพลง YouTube ฟังพร้อมกัน จองคิวเพลง ร้องผ่านไมค์ ส่งสติกเกอร์เป็ด | `/karaoke`, `/karaoke/:id` |
| Open Q&A Board: ตั้งคำถาม ตอบได้ไม่จำกัด กดส่งใจ โหมดไม่เปิดเผยตัวตน | `/qa` |
| Community Guidelines, ปุ่มรายงาน, หน้าผู้ดูแล + สถิติตามตัวชี้วัดข้อ 4.6 | `/guidelines`, `/admin/reports` |

## สถาปัตยกรรม

```
เบราว์เซอร์ ──HTTPS──► Vercel (React + Vite)
    │  /api/* (rewrite, same-origin cookie)
    ├────────────────► Render (Express REST API + Socket.IO) ──► Supabase PostgreSQL (Prisma)
    │  WebSocket (Socket.IO: signaling, แชท, คิวเพลง, สถานะห้อง)
    └────────────────► Render
เบราว์เซอร์ ◄══════ WebRTC (เสียงวิ่งตรงระหว่างผู้ใช้ ไม่ผ่าน server) ══════► เบราว์เซอร์
```

- **Frontend** `client/`: React 19, Vite, React Router, Zustand (`authStore` / `roomStore` / `uiStore`), Tailwind CSS, lucide-react (ไอคอน), SweetAlert2 (หน้าต่างยืนยัน)
- **Backend** `server/`: Express 5 แบ่งชั้น Routes → Controllers → Services, Socket.IO, เข้าสู่ระบบด้วยบัญชี Google (จำกัดโดเมนได้ด้วย `ALLOWED_EMAIL_DOMAINS`) แล้วออก JWT ของเราเอง (Access Token 15 นาที + Refresh Token ใน httpOnly cookie)
- **Database**: PostgreSQL ผ่าน Prisma (ช่วงพัฒนาใช้ PostgreSQL ในเครื่อง, ใช้งานจริงบน Supabase)

## เริ่มพัฒนาบนเครื่องตัวเอง

ต้องมี: Node.js 22.22+ (แนะนำ 24), Git, PostgreSQL 15+ (ติดตั้งพร้อม pgAdmin)

```bash
# 1) ติดตั้งแพ็กเกจทั้งหมด
npm run install:all

# 2) ตั้งค่า server
cp server/.env.example server/.env
#    แก้ YOUR_PASSWORD ใน DATABASE_URL เป็นรหัสผ่าน postgres ของเครื่อง
#    (เทสต์จะใช้ฐาน talkwithduck_test ที่สร้างให้อัตโนมัติ)
#    แล้วสุ่ม JWT_ACCESS_SECRET ใหม่ (คำสั่งอยู่ในไฟล์)
#    DEV_LOGIN=true เปิดปุ่มบัญชีทดสอบ ส่วน GOOGLE_CLIENT_ID ใส่เมื่อจะลองปุ่ม Google (docs/deploy.md ข้อ 2)
#    ถ้าใส่ GOOGLE_CLIENT_ID ให้คัดลอก client/.env.example เป็น client/.env แล้วใส่ VITE_GOOGLE_CLIENT_ID ค่าเดียวกัน

# 3) สร้างตารางและข้อมูลตัวอย่าง (Prisma สร้างฐานข้อมูล talkwithduck ให้เอง)
cd server
npm run db:migrate
npm run db:seed
cd ..

# 4) รันทั้งสองฝั่งพร้อมกัน
npm run dev
```

เปิด http://localhost:5173 แล้วกดบัญชีทดสอบจาก seed ในหน้าเข้าสู่ระบบ (มีเฉพาะตอน `npm run dev` และ server ตั้ง `DEV_LOGIN=true`):

| อีเมล | บทบาท |
|---|---|
| `mod@mail.kmutt.ac.th` | ผู้ดูแล (เข้า `/admin/reports` ได้) |
| `year1@…` ถึง `year4@mail.kmutt.ac.th` | นักศึกษาปี 1–4 |

> ปุ่มบัญชีทดสอบเข้าได้โดยไม่ต้องใช้ Google จึงใช้ได้เฉพาะ `NODE_ENV=development` (บนเว็บจริงไม่มีปุ่มนี้ และ server จะไม่ยอมเริ่มทำงานถ้าตั้ง `DEV_LOGIN=true` ใน production)

**ทดสอบคุยเสียงหลายคนบนเครื่องเดียว:** เปิด Chrome หลายโปรไฟล์ (หรือหน้าต่าง Incognito) กดบัญชีทดสอบคนละบัญชี แล้วเข้าห้องเดียวกัน
**ทดสอบบนมือถือในวง LAN:** ไมโครโฟนใช้ได้เฉพาะ HTTPS ให้รัน `npm --prefix client run dev:https` แล้วเปิด `https://<IP เครื่อง>:5173` แล้วใช้บัญชีทดสอบ (ปุ่ม Google ใช้ผ่าน IP ไม่ได้ เพราะ Google รับเฉพาะ localhost หรือโดเมนจริง)

## คำสั่งที่ใช้บ่อย

| คำสั่ง (ที่ root) | ทำอะไร |
|---|---|
| `npm run dev` | รัน server (:4000) + client (:5173) |
| `npm test` | รันเทสต์ทั้งสองฝั่ง |
| `npm run lint` | ตรวจรูปแบบโค้ด (ESLint) |
| `npm run format` | จัดรูปแบบโค้ด (Prettier) |
| `npm run build` | build หน้าเว็บ |
| `npm --prefix server run db:studio` | เปิด Prisma Studio ดู/แก้ข้อมูล |
| `npm --prefix server run db:reset` | ล้างฐานข้อมูลแล้วสร้างใหม่ |

## แนวทางเขียนโค้ด

- **เขียนฟังก์ชันเป็น arrow function ทั้ง client และ server** เช่น `export const listRooms = async (req, res) => { ... };` ไม่ใช้คีย์เวิร์ด `function`
- **Component React ใช้รูปแบบ rafce** (snippet ของส่วนขยาย ES7+ React Snippets) ไม่ต้องมีบรรทัด `import React` เพราะ React 19 ไม่ต้องใช้แล้ว

  ```jsx
  const RoomCard = ({ room }) => {
    return <div>{room.name}</div>;
  };

  export default RoomCard;
  ```

- **ไฟล์ที่มีหลาย component** (เช่น `ui.jsx`): ใช้ `export const Button = () => { ... };`
- **method ใน class** (`PeerMesh`, `RoomSession`) เขียนแบบ method ปกติได้
- **ประกาศก่อนใช้เสมอ:** arrow function ไม่ถูก hoist จึงต้องประกาศไว้ก่อนบรรทัดที่เรียกใช้
- **เรียก server ผ่าน `client/src/api/` เท่านั้น:** แยก 1 ไฟล์ต่อ path เช่น `rooms.js` → `/api/rooms` แล้วตั้งชื่อฟังก์ชันแบบ `listRooms` / `readRoom` / `createRoom`

  ```js
  // client/src/api/rooms.js
  export const createRoom = async (data) => {
    return await api.post('/rooms', data);
  };

  // ในหน้าเว็บ
  const { data } = await createRoom(form);
  ```

  - ไม่ต้องส่ง token เอง: `api` (axios จาก `lib/api.js`) แนบ token ให้และขอ token ใหม่เมื่อหมดอายุ
  - ถ้าต้องโหลดข้อมูลตอนเปิดหน้า ใช้ `useApiQuery(readQuestion, id)`
- **ไอคอนใช้ [lucide-react](https://lucide.dev) เท่านั้น ห้ามใช้ emoji:**
  - ค้นชื่อไอคอนที่ lucide.dev แล้ว import มาใช้ เช่น `import { Mic } from 'lucide-react'` แล้ววาง `<Mic size={20} />`
  - ปุ่มส่งไอคอนเป็น component เช่น `<Button icon={Plus}>`
  - ข้อมูลใน config (หัวข้อ, ประเภทห้อง, สติกเกอร์) เก็บ component ไว้ในฟิลด์ `icon`
  - รูปเป็ดใช้ `/duck.svg` หรือ `DuckAvatar` เพราะ Lucide ไม่มีไอคอนเป็ด
- **หน้าต่างยืนยันใช้ `confirmDialog` จาก `lib/dialog.jsx` (SweetAlert2)** ห้ามใช้ `alert` / `confirm` / `prompt` ของเบราว์เซอร์ (ESLint `no-alert` กันไว้)

  ```js
  const confirmed = await confirmDialog({
    title: 'ลบคำตอบนี้ใช่ไหม?',
    confirmText: 'ลบคำตอบ',
    icon: Trash, // ไอคอน lucide
    danger: true, // ปุ่มยืนยันสีแดง และโฟกัสปุ่มยกเลิกไว้ก่อน
  });
  if (!confirmed) return;
  ```
- **ของที่กดได้ใช้ `<button>` หรือ `<Link>`** ไม่ใช้ `<div onClick>` เพื่อให้กดด้วยคีย์บอร์ดได้ ส่วนรูปมือ (cursor) ได้จาก `index.css` อัตโนมัติ ไม่ต้องใส่ `cursor-pointer` เอง
- **จัดการ error ด้วย `async/await` + `try/catch`** ไม่ใช้ `.then().catch()`
  - controller ฝั่ง server ครอบทุกตัว แล้วส่ง error ต่อด้วย `next(err)` ไปที่ `middleware/error.js` ซึ่งแปลงเป็นข้อความภาษาไทยให้เอง

    ```js
    export const create = async (req, res, next) => {
      try {
        res.status(201).json({ room: await roomService.createRoom(req.user, req.valid.body) });
      } catch (err) {
        next(err);
      }
    };
    ```

  - ถ้าตั้งใจไม่ทำอะไรใน `catch` ให้เขียนคอมเมนต์บอกเหตุผลไว้ (catch ว่างจะไม่ผ่าน lint)
- **ESLint คอยตรวจให้:** `npm run lint` จะแจ้ง error ถ้าเผลอ
  - เขียน `function`
  - เรียกใช้ก่อนประกาศ
  - ใช้ `.then/.catch/.finally`
  - เขียน controller ที่ไม่ครอบ `try/catch`
  - import `api` ไปเรียกตรง ๆ ในหน้าเว็บ
  - ใส่ emoji ในโค้ดฝั่ง client
  - ใช้ `alert` / `confirm` / `prompt` ของเบราว์เซอร์

## โครงสร้างโปรเจกต์

```
client/src/
  pages/        หน้าจอตามตาราง 3.4 (Lobby, Room, Karaoke, QA, Admin, …)
  components/   DuckAvatar, RoomCard, room/*, karaoke/*, qa/*, ReportModal, ui.jsx
  api/          ฟังก์ชันเรียก REST API แยกไฟล์ตาม path: auth, me, rooms, karaoke, questions, answers, reports, admin, rtc
  hooks/        useApiQuery, useLobbyRooms, useRoomLifecycle, …
  lib/          api (axios + refresh token), googleIdentity (โหลดปุ่ม Google), socket, roomSession (ไมค์ + WebRTC + Socket.IO), rtc/PeerMesh, dialog (หน้าต่างยืนยัน SweetAlert2)
  stores/       authStore, roomStore, uiStore (Zustand)
server/
  prisma/       schema.prisma, migrations/, seed.js
  src/routes → controllers → services   REST API
  src/realtime/ Socket.IO: signaling, presence, karaoke sync
  tests/        unit + integration (ใช้ฐานข้อมูล talkwithduck_test)
docs/           api.md · socket-events.md · deploy.md · test-plan.md · report-changes.md
```

## เอกสารเพิ่มเติม

- [docs/api.md](docs/api.md): REST API ทั้งหมด
- [docs/socket-events.md](docs/socket-events.md): event ของ Socket.IO และลำดับการต่อ WebRTC
- [docs/deploy.md](docs/deploy.md): ขั้นตอนนำขึ้น Supabase + Render + Vercel
- [docs/test-plan.md](docs/test-plan.md): แผนทดสอบตามตาราง 3.5
- [docs/report-changes.md](docs/report-changes.md): สิ่งที่ต่างจากรูปเล่ม (ใช้แก้บทที่ 3–4)
