# REST API

Base URL: `/api` · รูปแบบ JSON · ★ = เพิ่มจากตารางที่ 3.3 ในรูปเล่ม

**การยืนยันตัวตน:** ส่ง `Authorization: Bearer <accessToken>` ทุก request ที่ต้องล็อกอิน · Refresh Token อยู่ใน httpOnly cookie `twd_rt` (path `/api/auth`) ซึ่งเบราว์เซอร์แนบให้เอง

**ระดับสิทธิ์:**
- 🔓 ไม่ต้องล็อกอิน
- 🔑 ต้องล็อกอิน
- 🦆 ต้องล็อกอินและยอมรับข้อตกลงแล้ว
- 🛡️ เฉพาะผู้ดูแล

**รูปแบบ error:** `{ "error": { "code": "ROOM_FULL", "message": "ห้องเต็มแล้ว…" } }` โดย `message` เป็นภาษาไทยพร้อมแสดงผู้ใช้ · body ใหญ่เกิน 100 KB ได้ 413 `PAYLOAD_TOO_LARGE`

**ฝั่งหน้าเว็บ:** ทุก endpoint ด้านล่างมีฟังก์ชันเรียกใช้ใน `client/src/api/<กลุ่ม>.js` ตามหัวข้อ
- Auth → `auth.js`
- Me → `me.js`
- Rooms (รวมข้อความและคิวเพลง) → `rooms.js`
- Karaoke → `karaoke.js`
- Questions → `questions.js`
- Answers → `answers.js`
- Reports → `reports.js`
- Admin → `admin.js`
- RTC → `rtc.js`

ยกเว้น `/auth/refresh` ที่อยู่ใน `lib/api.js` เพราะ interceptor ของ axios ต้องใช้

**ฝั่ง server:** แต่ละ path มีไฟล์ของตัวเอง 1 คู่ คือ `server/src/routes/<ชื่อ>.routes.js` (กำหนด middleware) → `server/src/controllers/<ชื่อ>.controller.js`
- เช่น `/rooms` → `room.routes.js` → `room.controller.js` · `/admin` → `admin.routes.js` → `admin.controller.js`
- ตารางเต็มว่าแต่ละ path เรียก service ไหน อยู่ใน [architecture.md](architecture.md)

## Auth

| Method | Path | สิทธิ์ | Body | ผลลัพธ์ |
|---|---|---|---|---|
| POST | `/auth/google` ★ | 🔓 | `credential` (ID token จากปุ่ม Google), `profile?: { nickname, year(1–4), avatar }` | บัญชีเดิม: `{ user, accessToken }` + cookie · บัญชีใหม่ที่ยังไม่ส่ง `profile`: `{ needsProfile: true, email }` · ส่ง `profile` แล้ว: 201 + session |
| POST | `/auth/refresh` | cookie | – | `{ user, accessToken }` + cookie ใหม่ (หมุน token) · ไม่มี cookie (ยังไม่ได้เข้าสู่ระบบ): 204 · cookie ใช้ไม่ได้: 401 `SESSION_EXPIRED` และลบ cookie |
| POST | `/auth/logout` ★ | cookie | – | 204 · เพิกถอน refresh token |
| GET | `/auth/dev-accounts` ★ | 🔓 dev | – | `{ accounts }` บัญชีทดสอบ (เฉพาะบัญชีจาก seed) |
| POST | `/auth/dev-login` ★ | 🔓 dev | `userId` | `{ user, accessToken }` + cookie · บัญชีที่ผูก Google แล้วได้ 404 |

**เข้าสู่ระบบด้วย Google:** server ตรวจลายเซ็นของ ID token และ audience ต้องเป็น `GOOGLE_CLIENT_ID` จากนั้นต้องผ่านเงื่อนไขทั้งหมด
- `email_verified` เป็นจริง
- ถ้าตั้ง `ALLOWED_EMAIL_DOMAINS` เป็นรายการโดเมน อีเมลต้องอยู่ในโดเมนเหล่านั้น (ไม่ผ่าน = 400 `EMAIL_DOMAIN_NOT_ALLOWED`) · ค่าเริ่มต้น `*` รับทุกโดเมน
- Google เป็นเจ้าของอีเมลนั้นจริง คือเป็น `@gmail.com` หรือ `hd` ตรงกับโดเมนของอีเมล (บัญชี Google Workspace ของมหาวิทยาลัยหรือองค์กร) (ไม่ผ่าน = 403 `GOOGLE_ACCOUNT_NOT_ALLOWED`)

error อื่น:
- 401 `GOOGLE_TOKEN_INVALID`: token ปลอมหรือหมดอายุ
- 403 `BANNED`: บัญชีถูกระงับ
- 403 `ACCOUNT_MISMATCH`: อีเมลผูกกับบัญชี Google อื่นอยู่แล้ว
- 503 `GOOGLE_NOT_CONFIGURED`: ยังไม่ได้ตั้ง `GOOGLE_CLIENT_ID`

**ผูกกับบัญชีเดิม:**
- บัญชีเดิมที่ยืนยันอีเมลแล้วและอีเมลตรงกัน (เช่น บัญชีจาก seed) จะถูกผูกกับบัญชี Google ให้อัตโนมัติ
- แถวที่สมัครค้างไว้แต่ไม่เคยยืนยันอีเมล (จากระบบ OTP เดิม) ไม่นับเป็นบัญชี
  - เจ้าของอีเมลต้องตั้งโปรไฟล์ใหม่
  - ระบบใช้แถวเดิมแต่แทนข้อมูลทั้งหมด และเพิกถอน session เก่า
- ปุ่มบัญชีทดสอบแสดงเฉพาะบัญชีจาก seed คือยืนยันอีเมลแล้วแต่ยังไม่ผูกกับ Google (`google_sub` ว่าง) บัญชีจริงที่เคยเข้าด้วย Google จึงถูกสวมรอยผ่านปุ่มนี้ไม่ได้ แม้เปิด server ตอน dev ให้คนในวง Wi-Fi เดียวกันเรียกได้ (`npm run dev:https`)

**🔓 dev:** มี route นี้เฉพาะเมื่อตั้ง `DEV_LOGIN=true` และ `NODE_ENV=development` ตอนเทสต์และบนเว็บจริงจะได้ 404 เสมอ

## Me ★

| Method | Path | สิทธิ์ | Body |
|---|---|---|---|
| GET | `/me` | 🔑 | – |
| PATCH | `/me` | 🔑 | `nickname?, avatar?, year?` |
| POST | `/me/accept-guidelines` | 🔑 | – |
| DELETE | `/me` | 🔑 | – → 204 และล้าง refresh cookie |

**ลบบัญชี (`DELETE /me`):** ลบถาวร กู้คืนไม่ได้
- ออกจากห้องที่อยู่ก่อน (ย้ายเจ้าของห้องหรือปิดห้องตามปกติ) และเอาเพลงที่จองค้างออกจากคิว (เพลงที่กำลังเล่นข้ามไปเพลงถัดไป)
- ลบ session, การเข้าห้อง, ข้อความแชท, คำถาม (พร้อมคำตอบและใจในคำถามนั้น), คำตอบ, ใจ และเพลงที่จอง · ยอดใจของคำถามคนอื่นที่เคยส่งใจลดลงตาม
- รายงานที่เคยส่งยังอยู่โดย `reporter` เป็น `null` ผู้ดูแลจัดการต่อได้
- บัญชีผู้ดูแลลบเองไม่ได้: 400 `MODERATOR_CANNOT_DELETE`
- เข้าด้วย Google อีกครั้งได้ แต่จะเป็นบัญชีใหม่ (ตั้งโปรไฟล์ใหม่)

## Rooms

| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| GET | `/rooms?type=&year=` | 🦆 | ห้องที่เปิดอยู่ กรองตามประเภท (`private`/`group`/`karaoke`) และชั้นปี · แต่ละห้องมี `nowPlaying` (ชื่อเพลงที่กำลังเล่นในห้องคาราโอเกะ ไม่มีเพลง = `null`) |
| POST | `/rooms` | 🦆 | `name, type, yearFilter?` → สร้างห้องแล้วใส่ผู้สร้างเป็น host |
| POST | `/rooms/quick-match` ★ | 🦆 | `year?` → เข้าห้อง 1-1 ที่มีคนรอ ถ้าไม่มีสร้างใหม่ · นับรวมกับ join ไม่เกินนาทีละ 30 ครั้งต่อคน (429) |
| GET | `/rooms/:id` ★ | 🦆 | ข้อมูลห้อง + สมาชิก |
| POST | `/rooms/:id/join` | 🦆 | ตรวจจำนวนคนในห้อง (ล็อกแถว) · 409 `ROOM_FULL` · 404 `ROOM_CLOSED` · 403 `ROOM_KICKED` (เจ้าของห้องเคยเชิญออก) · นับรวมกับ quick-match ไม่เกินนาทีละ 30 ครั้งต่อคน (429) |
| POST | `/rooms/:id/leave` ★ | 🦆 | 204 |
| GET | `/rooms/:id/messages?before=` ★ | 🦆 สมาชิก | 50 ข้อความล่าสุด เฉพาะที่ส่งหลังจากผู้ขอเข้าห้อง (คนที่เข้าทีหลังไม่เห็นข้อความก่อนหน้า ออกแล้วเข้าใหม่นับใหม่) |
| POST | `/rooms/:id/messages` ★ | 🦆 สมาชิก | `{ type: 'text', content }` หรือ `{ type: 'sticker', content: 'heart' }` |
| GET | `/rooms/:id/queue` ★ | 🦆 สมาชิก | คิวเพลง (กำลังเล่นอยู่บนสุด) |
| POST | `/rooms/:id/queue` ★ | 🦆 สมาชิก | `videoId, title` · จองได้ไม่เกิน 5 เพลงต่อคน · server สร้าง `thumbnail` จาก `videoId` เอง (ไม่รับ URL รูปจาก client) |
| POST | `/rooms/:id/queue/next` ★ | 🦆 host | `reason: done/skipped` |
| DELETE | `/rooms/:id/queue/:songId` ★ | 🦆 เจ้าของเพลง/host | |

- **ความจุห้อง:** private = 2, group/karaoke = `GROUP_ROOM_MAX` (ค่าเริ่มต้น 10)
- **อยู่ได้ทีละห้อง:** เข้าห้องใหม่แล้วจะออกจากห้องเดิมอัตโนมัติ
- **ปิดห้องอัตโนมัติ:** เมื่อไม่เหลือใครในห้อง ห้องจะปิดเอง
- **เชิญออกจากห้อง:** เจ้าของห้องกลุ่ม/คาราโอเกะเชิญคนออกผ่าน socket event `room:kick` (ดู [socket-events.md](socket-events.md))

## Karaoke ★

| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| GET | `/karaoke/config` | 🦆 | `{ searchEnabled }` (มี YouTube API key หรือไม่) |
| GET | `/karaoke/search?q=` | 🦆 | ค้นหาผ่าน YouTube Data API (cache 1 ชม.) |
| POST | `/karaoke/resolve` | 🦆 | `url` → `{ videoId, title, thumbnail }` ผ่าน oEmbed (ไม่ต้องใช้ key) |

## Q&A

| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| GET | `/questions?year=&topic=&sort=&q=&cursor=&limit=` | 🦆 | `sort`: `latest`/`popular`/`unanswered` · `q` ★ ค้นจากหัวข้อและรายละเอียด (ไม่เกิน 100 ตัวอักษร ไม่สนตัวพิมพ์เล็ก/ใหญ่ `%` และ `_` ค้นแบบตรงตัวอักษร) · คืน `{ items, nextCursor }` |
| POST | `/questions` | 🦆 | `title, content, tagYear?, topic, isAnonymous` |
| GET | `/questions/:id` ★ | 🦆 | คำถาม + คำตอบทั้งหมด |
| PATCH / DELETE | `/questions/:id` ★ | 🦆 เจ้าของ (ลบ: ผู้ดูแลด้วย) | |
| POST | `/questions/:id/answers` | 🦆 | `content, isAnonymous` |
| PATCH / DELETE | `/answers/:id` ★ | 🦆 เจ้าของ (ลบ: ผู้ดูแลด้วย) | |
| POST | `/questions/:id/love` | 🦆 | กดสลับใจ/เลิกใจ → `{ loved, loveCount }` |

**การซ่อนตัวตน:** โพสต์ที่ `isAnonymous` จะแสดงผู้เขียนเป็น `{ id: null, nickname: 'เป็ดนิรนาม' }` และไม่มี user id ใน response · API ไม่ส่งอีเมลของผู้อื่นในทุกกรณี

## Reports & Admin

| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| POST | `/reports` | 🦆 | `targetType (question/answer/message/user/room), targetId, reason, details?` · 409 ถ้ารายงานซ้ำ |
| GET | `/admin/reports?status=` ★ | 🛡️ | แสดงเจ้าของตัวจริง (แม้เป็นโพสต์ไม่ระบุตัวตน) · `reporter` เป็น `null` ถ้าผู้รายงานลบบัญชีไปแล้ว |
| GET | `/admin/reports/summary` ★ | 🛡️ | `{ pending, urgent }` จำนวนรายงานที่รอตรวจ (`urgent` = หัวข้อเสี่ยงทำร้ายตัวเอง) ใช้ทำป้ายตัวเลขบนเมนู |
| PATCH | `/admin/reports/:id` ★ | 🛡️ | `action: hide / ban / dismiss` (ปิดทุกรายงานของเป้าหมายเดียวกัน) |
| GET | `/admin/bans` ★ | 🛡️ | บัญชีที่ถูกระงับ `{ users }` (ไม่มีอีเมล) |
| DELETE | `/admin/bans/:id` ★ | 🛡️ | ปลดระงับบัญชี (`id` ของผู้ใช้) → 204 · ผู้ใช้ต้องเข้าสู่ระบบใหม่ ส่วนเนื้อหาที่ถูกซ่อนยังซ่อนอยู่ |
| GET | `/admin/stats?from=&to=` ★ | 🛡️ | สถิติตามตัวชี้วัดข้อ 4.6 · `from`/`to` เป็น ISO datetime (`from` รวม, `to` ไม่รวม) ไม่ส่ง = ทั้งหมด |

**สถิติ (`/admin/stats`):** `users` (`total`/`byYear` = สมาชิกที่สมัครในช่วงนั้น, `active` = คนที่เข้าห้อง ตั้ง/ตอบคำถาม หรือส่งใจในช่วงนั้น), `rooms` (`byType`, `byYear` แยกห้องตามชั้นปี โดย `all` = ห้องทุกชั้นปี), `qa`, `messages`, `karaoke` · `rooms.activeNow` และ `reports.pending` เป็นค่าปัจจุบันเสมอ ไม่ขึ้นกับช่วงเวลา

**การตั้งผู้ดูแล:** แก้คอลัมน์ `role` ของผู้ใช้เป็น `moderator` ผ่าน pgAdmin, Prisma Studio หรือ Supabase Table Editor

## อื่น ๆ

| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| GET | `/rtc/ice-servers` ★ | 🔑 | STUN + TURN (จาก env) สำหรับ RTCPeerConnection |
| GET | `/health` ★ | 🔓 | `?db` ตรวจฐานข้อมูล · `?ip` ดู IP ที่ server เห็น |
