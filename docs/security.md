# ความปลอดภัยของระบบ

ผลการตรวจความปลอดภัยของ Talk With Duck ก่อนเปิดใช้จริง (ตรวจเมื่อ 8 ต.ค. 2569) ใช้อ้างอิงตอนเขียนรูปเล่มข้อ 3.5.4 และ 3.5.9 และเป็นกติกาเวลาเพิ่มโค้ดใหม่

## 1. ขอบเขตและวิธีตรวจ

**ตรวจอะไร:**
- โค้ดฝั่ง server ทุกไฟล์: routes → controllers → services, ระบบเรียลไทม์ (`realtime/`), middleware, การตั้งค่า (`config/env.js`) และ migration ที่เปิด RLS
- โค้ดฝั่งหน้าเว็บส่วนที่เก็บ token และส่วนที่แสดงข้อมูลของผู้ใช้คนอื่น (แชท คำถาม ชื่อเล่น คิวเพลง ลิงก์)
- การตั้งค่าตอน deploy: `render.yaml`, `client/vercel.json`, ตัวแปรใน `.env.example` ทั้งสองฝั่ง
- dependency ด้วย `npm audit` ทั้ง 3 โฟลเดอร์ (root, `server/`, `client/`)

**ทดสอบอย่างไร:**
- ลองโจมตีจริงกับ server ในเครื่อง (ใช้ฐานข้อมูลทดสอบ) เช่น ส่ง event ของ Socket.IO ผิดรูปแบบ
- ทุกข้อที่แก้มีเทสต์อัตโนมัติ (รายการอยู่ใน [test-plan.md](test-plan.md))

**ไม่ได้ตรวจ:** ระบบของผู้ให้บริการ (Google, Render, Vercel, Supabase, Metered) และค่าบนเว็บจริง เพราะตอนตรวจยังไม่ได้ยืนยันว่า deploy แล้ว (ให้ไล่ checklist ในข้อ 5 หลัง deploy)

## 2. สิ่งที่ระบบป้องกันไว้แล้ว

| หัวข้อ | สิ่งที่ระบบทำ | ไฟล์หลัก |
|---|---|---|
| เข้าสู่ระบบ | ตรวจลายเซ็นของ ID token จาก Google, audience ต้องเป็นแอปนี้, `email_verified` และ Google ต้องเป็นเจ้าของอีเมลจริง (`@gmail.com` หรือ `hd` ตรงกับโดเมน) · ไม่มีรหัสผ่านให้รั่ว | `lib/google.js`, `services/auth.service.js` |
| Access Token | JWT อายุ 15 นาที ล็อกอัลกอริทึม HS256 และ issuer (token แบบ `alg: none` ใช้ไม่ได้) · หน้าเว็บเก็บไว้ในหน่วยความจำ ไม่อยู่ใน localStorage | `lib/jwt.js`, `client/src/stores/authStore.js` |
| Refresh Token | สุ่ม 256 บิต ฐานข้อมูลเก็บแค่ HMAC · หมุนใหม่ทุกครั้งที่ใช้ · ใช้ token เก่าซ้ำหลังพ้น 10 วินาที = เพิกถอนทั้งชุด · cookie `httpOnly` + `Secure` + `SameSite=Strict` ส่งเฉพาะ path `/api/auth` | `services/token.service.js`, `utils/cookies.js` |
| สิทธิ์ | ทุกคำขอโหลดผู้ใช้จากฐานข้อมูลใหม่ (ระงับบัญชีมีผลทันที และไม่เชื่อ role ใน token) · ตั้งผู้ดูแลได้จากฐานข้อมูลเท่านั้น · แก้/ลบได้เฉพาะเจ้าของ (ผู้ดูแลลบได้) · แชทและคิวเพลงเฉพาะคนในห้อง · signal ของ WebRTC ส่งต่อเฉพาะคนในห้องเดียวกัน | `middleware/auth.js`, `services/*` |
| CSRF | endpoint ที่แก้ข้อมูลทุกตัวต้องแนบ `Authorization: Bearer` ซึ่งเบราว์เซอร์ไม่แนบให้เอง · cookie ใช้แค่ `/auth/refresh` กับ `/auth/logout` และเป็น `SameSite=Strict` | `lib/api.js` (หน้าเว็บ) |
| ข้อมูลที่รับเข้า | zod ตรวจทุก endpoint และตัด field ที่ไม่รู้จักทิ้ง (ส่ง `role` มาเองไม่ได้) · body ไม่เกิน 100 KB · event ของ socket ผ่าน `listen()` · SQL ผ่าน Prisma หรือ `$queryRaw` แบบมีพารามิเตอร์ · คำค้น escape `%` และ `_` | `schemas.js`, `middleware/validate.js`, `realtime/index.js` |
| XSS | React แสดงข้อความของผู้ใช้เป็นตัวอักษรเสมอ ไม่มี `dangerouslySetInnerHTML` · หน้าต่างยืนยันแสดงชื่อเล่นเป็นข้อความ · ลิงก์ภายนอกมาจากค่าที่ทีมตั้งเท่านั้นและเปิดด้วย `rel="noopener noreferrer"` · รูปปกเพลงสร้างจากรหัสวิดีโอที่ server | `client/src/components/ui.jsx`, `lib/dialog.jsx`, `utils/youtube.js` |
| ความเป็นส่วนตัว | ไม่ส่งอีเมลของคนอื่น (`publicUserSelect`) · โพสต์นิรนามไม่มี user id · ไม่เก็บชื่อจริงหรือรูปจาก Google · แชทเห็นเฉพาะข้อความหลังเข้าห้อง · ชื่อแท็บไม่ใส่ชื่อห้องหรือหัวข้อคำถาม | `utils/present.js`, `services/message.service.js` |
| ฐานข้อมูล | เปิด Row Level Security ทุกตาราง (Data API ของ Supabase อ่านไม่ได้) · CHECK constraint · ต่อผ่าน TLS | migration `enable_rls`, `lib/prisma.js` |
| การตั้งค่า | ค่าใน `.env` ผิด server ไม่ยอมเริ่ม · production ห้ามเปิด `DEV_LOGIN` และต้องมี `GOOGLE_CLIENT_ID` · seed รันใน production ไม่ได้ · ไม่มีความลับใน git · helmet บน API · CORS รับเฉพาะ `CLIENT_ORIGIN` · หน้าเว็บส่ง security header (ห้ามฝังใน iframe ฯลฯ) | `config/env.js`, `prisma/seed.js`, `app.js`, `client/vercel.json` |
| จำกัดความถี่ | เข้าสู่ระบบ 30 ครั้ง/15 นาที/IP · แชท 15 ข้อความ/10 วินาที/คน · ตั้งคำถาม ตอบ รายงาน ค้นเพลง 20 ครั้ง/นาที/คน · เข้าห้องและสุ่มคุย 30 ครั้ง/นาที/คน | `middleware/rateLimit.js` |
| ความพร้อมใช้งาน | ข้อมูลผิดรูปแบบทาง socket ไม่ทำให้ server ล่ม · Promise ที่ไม่มีใครจับ error ถูกบันทึก log แทนการปิด server | `realtime/index.js`, `index.js` |

## 3. ผลการตรวจ (8 ต.ค. 2569)

ทุกข้อแก้แล้ว และบันทึกในตาราง "บันทึกข้อผิดพลาด" ของ [test-plan.md](test-plan.md)

| # | ระดับ | ปัญหาที่พบ | การแก้ |
|---|---|---|---|
| S1 | สูง | ผู้ใช้ที่ล็อกอินคนไหนก็ส่ง event ของ Socket.IO ผิดรูปแบบครั้งเดียว (เช่น payload เป็น `null` หรือ ack ที่ไม่ใช่ฟังก์ชัน) แล้ว **server ล่มทั้งตัว** ทุกห้องหลุดพร้อมกัน ส่งซ้ำได้เรื่อย ๆ (socket.io เรียก listener โดยไม่มี try/catch และ Node จบ process เมื่อมี error ที่ไม่มีใครจับ) | ทุก event รับผ่าน `listen()` ที่ทำ payload ให้เป็น object, ใช้ ack เฉพาะเมื่อเป็นฟังก์ชัน และจับ error · ESLint ห้ามใช้ `socket.on` ตรง ๆ ในโฟลเดอร์ realtime · บันทึก `unhandledRejection` แทนการปิด server |
| S2 | กลาง | รูปปกเพลงรับ URL อะไรก็ได้ ทุกคนในห้องจึงโหลดรูปจาก URL นั้น เจ้าของ URL เห็น IP ของทุกคนในห้อง และแสดงรูปอะไรก็ได้ | server สร้างรูปปกจากรหัสวิดีโอเอง (`i.ytimg.com`) ไม่รับ URL จากหน้าเว็บ |
| S3 | กลาง | host สั่งให้ทุกเครื่องเล่นวิดีโอ YouTube อื่นได้ ขณะที่คิวยังโชว์ชื่อเพลงและ "จองโดย" ของคนอื่น | server รับสถานะเฉพาะเพลงที่กำลังเล่นในคิว และใช้รหัสวิดีโอจากคิวเสมอ |
| S4 | กลาง | คนที่เข้าห้องทีหลังอ่านแชทที่คุยกันก่อนเขาเข้าได้ทั้งหมด เช่น คนที่สุ่มคุยเข้ามาในห้อง 1-1 แทนคนที่ออกไป | เห็นเฉพาะข้อความตั้งแต่ตอนที่เข้าห้อง (ทุกประเภทห้อง) |
| S5 | ต่ำ | socket ส่งข้อความ error ภายใน (เช่น ข้อความของ Prisma ที่มีชื่อ host ฐานข้อมูล) ให้หน้าเว็บ · body ใหญ่เกินได้ 500 พร้อม stack ใน log | ตอบรายละเอียดเฉพาะ error ที่ตั้งใจ · body เกินได้ 413 |
| S6 | ต่ำ | เข้าห้องหรือสุ่มคุยได้ไม่จำกัด ทุกครั้งแจ้งทุกคนในหน้า lobby (สุ่มคุยสร้างห้องโดยเลี่ยงการจำกัดได้) · socket รับข้อมูลได้ถึง 1 MB ต่อครั้ง | จำกัด 30 ครั้ง/นาที/คน · socket รับไม่เกิน 100 KB |
| S7 | ต่ำ | ปุ่มบัญชีทดสอบสวมรอยบัญชีจริงที่ผูก Google ได้ (ฐาน dev มีบัญชีจริงของทีม) และ `npm run dev:https` เปิดให้คนในวง Wi-Fi เดียวกันเรียกได้ | ใช้ได้เฉพาะบัญชีจาก seed (ไม่ผูก Google) |
| S8 | ต่ำ | `GET /rooms/:id/queue` ไม่ตรวจว่าเป็นคนในห้อง | เฉพาะคนในห้อง |
| S9 | ต่ำ | ชื่อเล่นและชื่อห้องใส่อักขระที่มองไม่เห็นหรือสลับทิศทางข้อความได้ จึงตั้งชื่อเลียนแบบ "เป็ดนิรนาม" ได้ | ตัดอักขระเหล่านี้ออก และเทียบชื่อสงวนโดยไม่สนช่องว่างและตัวพิมพ์ |
| S10 | ต่ำ | หน้าเว็บบน Vercel ไม่ส่ง security header เว็บอื่นเอาไปฝังใน iframe ได้ | `X-Frame-Options`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |
| S11 | ต่ำ | advisory ของเครื่องมือตอนพัฒนา: source-map-js และ shell-quote (ผ่าน concurrently) | อัปเดต lockfile และใส่ `overrides` ใน `package.json` ที่ root |
| S12 | ต่ำ | หน้า /privacy ไม่ได้บอกว่าคนในห้องเสียงเห็น IP ของกัน | เพิ่มข้อความในหัวข้อ "ใครเห็นอะไร" |

## 4. ความเสี่ยงที่ยอมรับ (ยังไม่แก้)

| ความเสี่ยง | ผลกระทบ | เหตุผล / สิ่งที่ทำแทน |
|---|---|---|
| รับบัญชี Google ใดก็ได้ (`ALLOWED_EMAIL_DOMAINS='*'`) | คนนอกมหาวิทยาลัยเข้าพื้นที่ได้ และคนที่ถูกระงับบัญชีสมัคร Gmail ใหม่กลับมาได้ | ทีมเลือกคงไว้ (8 ต.ค. 2569) ต่างจากรูปเล่มข้อ 3.5.4 (บันทึกใน report-changes ข้อ 5.3 แล้ว) · ถ้าจะให้เฉพาะนักศึกษา แก้ `ALLOWED_EMAIL_DOMAINS` ใน `render.yaml` เป็น `mail.kmutt.ac.th` แล้ว push |
| TURN credential แบบคงที่ | ผู้ใช้ที่ล็อกอินเอา credential ไปใช้เองจนโควตา Metered (500 MB/เดือน) หมด แล้วคนที่ต่อตรงไม่ได้จะคุยกันไม่ได้ | ต้องแก้ server ให้ขอรหัสชั่วคราวจาก API ของ Metered · ตอนนี้ให้เช็กยอดใน dashboard ช่วงกิจกรรม |
| ฐานข้อมูลไม่ตรวจใบรับรองถ้าไม่ตั้ง `DATABASE_SSL_CA` | ยังเข้ารหัสอยู่ แต่คนที่ดักเครือข่ายระหว่าง Render กับ Supabase ได้อาจปลอมเป็นฐานข้อมูลได้ (ทำได้ยากมาก) | ตั้ง `DATABASE_SSL_CA` ตาม [deploy.md](deploy.md) ข้อ 3 |
| `TRUST_PROXY=4` ยังไม่ได้ยืนยันบนเว็บจริง | มากเกินจริง: คนปลอม `X-Forwarded-For` เลี่ยงการจำกัดความถี่ตอนเข้าสู่ระบบได้ · น้อยเกินไป: ทุกคนถูกนับเป็น IP เดียวกัน | ตรวจตาม checklist ข้อ 5 |
| ชื่อเพลงมาจากคนจอง | ปลอมชื่อเพลงผ่าน API ได้ เช่น วิดีโอที่ไม่เหมาะสมแต่ตั้งชื่อเป็นเพลงช้า | คิวแสดง "จองโดย" ชัดเจน รายงานผู้ใช้หรือห้องได้ และ host ข้ามเพลงได้ทันที · ถ้าจะแก้ต้องดึงชื่อจาก YouTube ใหม่ทุกครั้งที่จอง (ช้าลง) |
| ไม่จำกัดความถี่ราย event ของ socket | ส่ง event ถี่ ๆ เพิ่มภาระ server และฐานข้อมูลได้ (แต่ไม่ทำให้ล่มแล้ว) | ตอนต่อเสียงห้อง 10 คน ICE candidate พุ่งเป็นร้อย event ถ้าตั้งค่าผิด เสียงจะต่อไม่ติด |
| โควตาค้นหา YouTube (ประมาณ 100 ครั้ง/วัน) | คนเดียวค้นจนโควตาของวันหมดได้ | ยังวางลิงก์ YouTube จองเพลงได้ตามปกติ · server cache ผลค้นหา 1 ชั่วโมง |
| ช่วงผ่อนผัน refresh token 10 วินาที | ถ้า cookie ถูกขโมยแล้วใช้ภายใน 10 วินาทีหลังเจ้าของ ระบบจับไม่ได้ | จำเป็นสำหรับการเปิดหลายแท็บพร้อมกัน · cookie เป็น `httpOnly` และ `SameSite=Strict` ขโมยได้ยาก |
| ห้องเสียงต่อตรงระหว่างเครื่อง (mesh) | คนในห้องเห็น IP ของกัน รู้ตำแหน่งได้คร่าว ๆ | เป็นธรรมชาติของ WebRTC แบบต่อตรง ถ้าบังคับผ่าน TURN ทั้งหมดโควตาฟรีไม่พอ · เขียนบอกในหน้า /privacy แล้ว |
| หน้า lobby เห็นว่าใครอยู่ห้อง 1-1 ห้องไหน | รู้ว่าใครกำลังคุยกับใคร (เห็นแค่ชื่อเล่น) | เป็นไปตามการออกแบบ ต้องเห็นห้องที่มีคนรอคุย |
| ชื่อเล่นที่คล้ายผู้ดูแล เช่น "พี่เป็ดผู้ดูแลระบบ" | หลอกคนอื่นในห้อง 1-1 ว่าเป็นผู้ดูแลได้ | ห้ามคำนี้ทั้งคำไม่ได้ เพราะผู้ดูแลจริงจะบันทึกโปรไฟล์ไม่ได้ (หน้า "ฉัน" ส่งชื่อเล่นทุกครั้ง) · **ข้อเสนอสำหรับทีมออกแบบ:** ป้าย "ผู้ดูแล" ข้างชื่อ โดย server ส่ง role เฉพาะของผู้ดูแล |
| dependency ของ prisma CLI (deepmerge-ts, mysql2) | `npm audit` ฝั่ง server ขึ้น high 4 รายการ | ใช้แค่ตอน build ไม่ถูกโหลดตอนรัน และระบบไม่ได้ใช้ MySQL · **ห้าม `npm audit fix --force`** (จะลด Prisma เป็นรุ่น 6) · รอ Prisma รุ่นถัดไปแล้วค่อยอัปเดต |
| ไม่มี Content-Security-Policy เต็ม (มีแค่ `frame-ancestors`) | ถ้าวันหน้าเกิดช่องโหว่ XSS จะไม่มีอีกชั้นคอยกัน | ทีมเลือก header พื้นฐาน เพราะ CSP เต็มต้องทดสอบบน Vercel จริง และต้องแก้ทุกครั้งที่เพิ่มบริการภายนอก |

## 5. checklist ความปลอดภัยหลัง deploy

- [ ] `render.yaml` มี `NODE_ENV=production` และไม่มี `DEV_LOGIN` (ถ้ามี server จะไม่ยอมเริ่ม)
- [ ] `/api/auth/dev-accounts` บนเว็บจริงได้ 404 และหน้าเข้าสู่ระบบไม่มีส่วน "บัญชีทดสอบ"
- [ ] `JWT_ACCESS_SECRET` ให้ Render สุ่มเอง (`generateValue`) ห้ามใช้ค่าจากไฟล์ตัวอย่าง
- [ ] `CLIENT_ORIGIN` มีแค่ URL ของ Vercel
- [ ] **TRUST_PROXY:** เปิด `/api/health?ip` ผ่าน URL ของ Vercel ต้องได้ IP จริงของเครื่องเรา ([deploy.md](deploy.md) ข้อ 8) และคำสั่งนี้ต้องไม่ได้ `1.2.3.4`
  ```bash
  curl -s -H "X-Forwarded-For: 1.2.3.4" "https://<vercel-domain>/api/health?ip"
  ```
  ถ้าได้ `1.2.3.4` แปลว่า `TRUST_PROXY` มากเกินไป ให้ลดใน `render.yaml` ทีละ 1
- [ ] security header: `curl -sI https://<vercel-domain>/` เห็น `x-frame-options`, `content-security-policy`, `x-content-type-options`, `referrer-policy`, `permissions-policy` และปุ่ม Google กับตัวเล่น YouTube ยังใช้ได้
- [ ] (แนะนำ) ตั้ง `DATABASE_SSL_CA` แล้ว `/api/health?db` ยังตอบ `ok: true`
- [ ] Supabase → Table Editor: ทุกตารางขึ้นว่าเปิด RLS · ไม่เอา `service_role` key ไปใส่ที่ไหนเลย (server ต่อฐานข้อมูลด้วย `DATABASE_URL`)
- [ ] Google Cloud Console: OAuth client มี Authorized JavaScript origins แค่ URL ของ Vercel (และ `http://localhost:5173` ตอนพัฒนา)
- [ ] YouTube API key จำกัดให้ใช้ได้เฉพาะ YouTube Data API v3 ([deploy.md](deploy.md) ข้อ 5)
- [ ] ตั้งผู้ดูแลผ่าน Supabase เท่านั้น ([deploy.md](deploy.md) ข้อ 7) ด้วยบัญชีของคนในทีม
- [ ] ช่วง Duck Community Week เช็กยอด TURN ใน dashboard ของ Metered

## 6. กติกาเวลาเพิ่มโค้ด

- **REST:** ตรวจข้อมูลด้วย zod ใน `schemas.js` · ตรวจสิทธิ์ใน service (เจ้าของ / คนในห้อง / host / ผู้ดูแล) · ข้อมูลผู้ใช้คนอื่น select ด้วย `publicUserSelect` · endpoint ที่สร้างข้อมูลหรือแจ้งคนอื่นทาง socket ให้ใส่ rate limit
- **Socket:** รับ event ด้วย `listen()` เท่านั้น (ESLint บังคับ) · ตรวจค่าใน payload เองเสมอ (UUID, เป็นคนในห้อง, เป็น host, เป็นเพลงในคิว) · ห้ามเอาค่าที่ client ส่งมาไปส่งต่อให้คนอื่นตรง ๆ ให้ใช้ค่าจากฐานข้อมูลแทน
- **URL จากผู้ใช้:** ห้ามรับ URL ของรูปหรือลิงก์จาก client แล้วแสดงให้คนอื่น ให้ server สร้าง URL เองจากรหัส (เช่น `youtubeThumbnail(videoId)`)
- **หน้าเว็บ:** ห้าม `dangerouslySetInnerHTML` · ข้อความจากผู้ใช้แสดงเป็นตัวอักษรเสมอ · ลิงก์ภายนอกใช้ `NewTabLink`
- **ความลับ:** อยู่ใน `.env` หรือ Environment ของ Render เท่านั้น ห้าม commit · ค่า `VITE_*` ทุกตัวถูกฝังในไฟล์ JS ที่ทุกคนโหลดได้ จึงห้ามใส่ความลับ
- **ตารางใหม่:** เปิด RLS ใน migration ด้วย (`ALTER TABLE "<ชื่อ>" ENABLE ROW LEVEL SECURITY;`) ไม่งั้น Data API ของ Supabase จะอ่านตารางนั้นได้
- **บริการภายนอกใหม่ที่หน้าเว็บโหลด:** เพิ่มในหน้า /privacy ด้วย
