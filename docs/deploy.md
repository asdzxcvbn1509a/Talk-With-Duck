# นำระบบขึ้นให้บริการ (ข้อ 3.5.9)

ใช้บริการฟรีทั้งหมดตามตารางที่ 4.5:

| ส่วน | บริการ | สิ่งที่ได้ |
|---|---|---|
| ฐานข้อมูล | Supabase (Free) | PostgreSQL |
| ส่วนหลังบ้าน | Render (Free Web Service) | Express + Socket.IO |
| ส่วนหน้าบ้าน | Vercel (Hobby) | หน้าเว็บ + HTTPS + ส่งต่อ `/api` ไป Render |
| เข้าสู่ระบบ | Google Identity Services | ปุ่ม "Sign in with Google" ใช้บัญชี Google ใดก็ได้ (จำกัดโดเมนได้ด้วย `ALLOWED_EMAIL_DOMAINS`) |
| ต่อเสียงผ่านเน็ตมือถือ | Metered (Free TURN) | ส่งต่อเสียงให้สายที่สองเครื่องต่อตรงกันไม่ได้ (ข้อ 6) |

## 0. เตรียมโค้ดบน GitHub

push โฟลเดอร์ `talk-with-duck/` ขึ้น repository ของทีม (ไฟล์ `.env` ถูก `.gitignore` กันไว้แล้ว ห้ามอัปโหลด)

## 1. Supabase: ฐานข้อมูล

1. สร้างโปรเจกต์ใหม่ที่ https://supabase.com เลือก Region **Southeast Asia (Singapore)** แล้วตั้ง Database Password (จดไว้)
2. กด **Connect** → เลือกแท็บ **Session pooler** แล้วคัดลอก connection string
   - หน้าตาประมาณ `postgresql://postgres.<project-ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
   - เติม `?sslmode=require` ต่อท้าย
   - **ต้องใช้ Session pooler** เพราะแบบ Direct connection เป็น IPv6 ซึ่ง Render ต่อไม่ได้
3. ยังไม่ต้องสร้างตารางเอง Render จะรัน `prisma migrate deploy` ให้ตอน build

> Supabase ฟรีจะ**พักโปรเจกต์ถ้าไม่มีการใช้งาน 7 วัน** (กดปลุกได้ในหน้า dashboard) ช่วงก่อนกิจกรรมให้เข้าไปเช็กว่าไม่ได้ถูกพัก

## 2. เข้าสู่ระบบด้วย Google (OAuth Client ID)

ระบบให้ Google ยืนยันตัวตนแทนการส่ง OTP ทางอีเมล ไม่ต้องใช้ SMTP (Render แบบฟรีบล็อกการส่งอีเมลผ่าน SMTP อยู่แล้ว) ใช้ได้ทั้งบัญชี Gmail และบัญชี Google ของมหาวิทยาลัย ถ้าจะให้เฉพาะนักศึกษา ตั้ง `ALLOWED_EMAIL_DOMAINS=mail.kmutt.ac.th` บน Render

1. https://console.cloud.google.com → สร้างโปรเจกต์ (ใช้โปรเจกต์เดียวกับ YouTube ในข้อ 5 ได้)
2. **Google Auth Platform** → Get started:
   - App name `Talk With Duck` และ User support email เป็นอีเมลของทีม
   - Audience: **External**
   - ไปที่เมนู **Audience** แล้วกด **Publish app** (ถ้ายังเป็น Testing จะเข้าได้เฉพาะอีเมลที่เพิ่มเป็น test user)
   - ระบบขอแค่ข้อมูลพื้นฐาน (อีเมล/โปรไฟล์) จึงไม่ต้องส่งแอปให้ Google ตรวจ
3. เมนู **Clients** → **Create client** → Application type **Web application**
   - **Authorized JavaScript origins:** URL ของ Vercel เช่น `https://talk-with-duck.vercel.app` และสำหรับพัฒนาในเครื่องใส่ทั้ง `http://localhost` และ `http://localhost:5173`
   - ไม่ต้องใส่ Authorized redirect URIs
4. คัดลอก **Client ID** (ลงท้ายด้วย `.apps.googleusercontent.com`) ไปใส่ทั้งสองฝั่ง
   - Render: `GOOGLE_CLIENT_ID` (ข้อ 3)
   - Vercel: `VITE_GOOGLE_CLIENT_ID` (ข้อ 4)
   - Client ID ไม่ใช่ความลับ เพราะอยู่ในหน้าเว็บอยู่แล้ว

ระบบเก็บแค่อีเมลกับรหัสบัญชี Google (`sub`) ไม่เก็บชื่อจริงหรือรูปโปรไฟล์จาก Google ผู้ใช้ตั้งชื่อเล่นและเลือกน้องเป็ดเองตอนเข้าครั้งแรก

> ลองเข้าด้วยบัญชี `@mail.kmutt.ac.th` ของทีมก่อนประชาสัมพันธ์ ถ้า Google ขึ้นว่าผู้ดูแลระบบของมหาวิทยาลัยบล็อกแอปนี้ ต้องติดต่อสำนักคอมพิวเตอร์ (ccsupport@kmutt.ac.th) ให้อนุญาต Client ID นี้

## 3. Render: ส่วนหลังบ้าน

1. https://render.com → **New → Blueprint** → เลือก repository (Render จะอ่าน `render.yaml`)
2. กรอกค่าที่ขึ้นว่า `sync: false`:

   | Key | ค่า |
   |---|---|
   | `DATABASE_URL` | Session pooler URL จากข้อ 1 |
   | `CLIENT_ORIGIN` | URL ของ Vercel เช่น `https://talk-with-duck.vercel.app` (ถ้ายังไม่รู้ ใส่ทีหลังแล้ว redeploy) |
   | `GOOGLE_CLIENT_ID` | Client ID จากข้อ 2 (ไม่ใส่แล้ว server จะไม่ยอมเริ่มทำงาน) |
   | `YOUTUBE_API_KEY` | ไม่บังคับ (ข้อ 5) |
   | `TURN_*` | แนะนำ (ข้อ 6) |

3. Deploy → build จะรัน `npm ci` → `prisma generate` → `prisma migrate deploy` (สร้างตารางบน Supabase)
4. เปิด `https://<service>.onrender.com/api/health?db` ต้องได้ `{"ok":true,…}`

`JWT_ACCESS_SECRET` ถูกสุ่มให้อัตโนมัติ (`generateValue`) ห้ามเปลี่ยนบ่อย เพราะทุกคนจะหลุดออกจากระบบ

> Render ฟรีจะ**หลับหลังไม่มีคนใช้ 15 นาที** คนแรกที่เข้าเว็บจะรอประมาณ 1 นาที (หน้าเว็บขึ้น “กำลังปลุกเป็ด…”) ช่วง Duck Community Week แนะนำตั้ง UptimeRobot (ฟรี) ให้เรียก `/api/health` ทุก 10 นาที

## 4. Vercel: ส่วนหน้าบ้าน

1. แก้ `client/vercel.json` ให้ `destination` ชี้ไปที่ URL ของ Render จริง (ถ้าชื่อ service ไม่ใช่ `talk-with-duck-api`) แล้ว push
2. https://vercel.com → **Add New → Project** → import repository
   - **Root Directory:** `client`
   - **Framework Preset:** Vite (build: `npm run build`, output: `dist`)
   - **Environment Variables:**
     - `VITE_SOCKET_URL=https://<service>.onrender.com` (URL อยู่ด้านบนของหน้า service บน Render)
     - `VITE_GOOGLE_CLIENT_ID=<Client ID จากข้อ 2>`
     - ไม่ต้องตั้ง `VITE_API_URL` เว้นว่างไว้ หน้าเว็บจะเรียก `/api` ผ่าน rewrite ใน `client/vercel.json`
3. Deploy แล้วนำ URL ของ Vercel ไปใส่ใน `CLIENT_ORIGIN` บน Render แล้ว redeploy Render

`/api/*` ถูกส่งต่อไป Render ผ่าน rewrite (same-origin) cookie ของ Refresh Token จึงใช้ได้แม้ใน Safari ส่วน Socket.IO ต่อตรงไป Render เพราะ rewrite ไม่รองรับ WebSocket

## 5. YouTube Data API (ค้นหาเพลง, ไม่บังคับ)

ถ้าไม่ตั้งค่า ผู้ใช้ยังวางลิงก์ YouTube เพื่อจองเพลงได้ตามปกติ

1. Google Cloud Console → สร้างโปรเจกต์ → เปิด **YouTube Data API v3**
2. Credentials → Create API key → จำกัดสิทธิ์ให้ใช้ได้เฉพาะ YouTube Data API v3
3. ใส่เป็น `YOUTUBE_API_KEY` บน Render

> โควตาฟรี 10,000 หน่วย/วัน การค้นหา 1 ครั้งใช้ 100 หน่วย (≈ 100 ครั้ง/วัน) server cache ผลค้นหาไว้ 1 ชั่วโมงแล้ว

## 6. TURN server (แนะนำก่อนใช้งานจริง)

ถ้ามีแค่ STUN อาจต่อเสียงกันไม่ติดเมื่อใช้เน็ตมือถือหรือเครือข่ายที่มี NAT เข้มงวด (เช่น Wi-Fi มหาวิทยาลัยบางจุด) TURN จะส่งต่อเสียงให้เฉพาะสายที่ต่อตรงกันไม่ได้ ตอนพัฒนาในเครื่องไม่ต้องตั้ง

1. สมัคร https://www.metered.ca (แผนฟรี ไม่ต้องใช้บัตร)
2. Dashboard → **TURN Server → Credentials → Create Credential** แล้วกด **Get credential → Show ICE Servers Array**
3. ใส่ค่าใน Render → **Environment** แล้ว redeploy
   - `TURN_URLS`: ค่า `urls` ทุกตัวใน array ต่อกันด้วย `,` ไม่เว้นวรรค เช่น

     ```
     stun:stun.relay.metered.ca:80,turn:global.relay.metered.ca:80,turn:global.relay.metered.ca:80?transport=tcp,turn:global.relay.metered.ca:443,turns:global.relay.metered.ca:443?transport=tcp
     ```

   - `TURN_USERNAME`: ค่า `username`
   - `TURN_CREDENTIAL`: ค่า `credential`
4. ทดสอบด้วยมือถือ 2 เครื่องที่ใช้เน็ตมือถือคนละค่าย

> `global.relay.metered.ca` เลือกเซิร์ฟเวอร์ที่ใกล้ที่สุดให้เอง วัดจากเครื่องของทีมได้ประมาณ 30 ms ส่วน `standard.relay.metered.ca` ประมาณ 200 ms เอกสารของ Metered เขียนว่าแผนฟรีใช้ได้แค่ standard แต่ทดสอบเมื่อ 30 ก.ย. 2026 แล้ว global ใช้ได้ ถ้าวันหลังต่อผ่าน TURN ไม่ได้ ให้ลองเปลี่ยน host เป็น `standard.relay.metered.ca`

> แผนฟรีได้ TURN 500 MB ต่อเดือน (นับทั้งขาเข้าและขาออก) และใช้เฉพาะสายที่ต่อตรงไม่ได้ ประมาณ 5 ชั่วโมงของการคุย 1-1 ที่ต้องผ่าน TURN ทั้งสองฝั่ง ช่วงกิจกรรมให้เช็กยอดใช้ใน dashboard ของ Metered

> Cloudflare Realtime ใช้กับระบบตอนนี้ไม่ได้ เพราะให้แค่รหัสชั่วคราวที่หมดอายุ ส่วน server อ่าน `TURN_*` เป็นค่าคงที่ ถ้าจะใช้ต้องแก้ server ให้ขอรหัสใหม่ผ่าน API ก่อน

## 7. ตั้งผู้ดูแลคนแรก

เข้าสู่ระบบด้วย Google บนเว็บจริงตามปกติ (ตั้งชื่อเล่นให้เรียบร้อย) แล้วเข้า Supabase → **Table Editor → users** → แก้ `role` เป็น `moderator` (seed.js ใช้ไม่ได้ใน production โดยตั้งใจ)

## 8. เช็กลิสต์หลัง deploy

- [ ] `/api/health?db` ตอบ `ok: true`
- [ ] `/api/health?ip` (เปิดผ่าน URL ของ Vercel) แสดง IP ของเครื่องเรา ไม่ใช่ IP ของ Vercel (ถ้าไม่ตรงปรับ `TRUST_PROXY`)
- [ ] เข้าสู่ระบบด้วยบัญชี Gmail และบัญชี `@mail.kmutt.ac.th` จริงได้ (ครั้งแรกขึ้นหน้าตั้งชื่อเล่นและเลือกน้องเป็ด)
- [ ] เข้าด้วยบัญชี Gmail ทั่วไปแล้วถูกปฏิเสธ
- [ ] หน้าเข้าสู่ระบบไม่มีส่วน "บัญชีทดสอบ" (มีเฉพาะตอนพัฒนาในเครื่อง)
- [ ] รีเฟรชหน้าแล้วยังล็อกอินอยู่ (cookie ทำงาน) ทั้งบน Chrome และ Safari/iPhone
- [ ] มือถือ 2 เครื่องคุยห้อง 1-1 กันได้ (ลองทั้ง Wi-Fi และเน็ตมือถือ)
- [ ] ห้องคาราโอเกะ: เพลงเล่นตรงกันทุกเครื่อง
- [ ] ไล่ `docs/test-plan.md` ให้ครบก่อนประชาสัมพันธ์

## อัปเดตระบบ

push ขึ้น branch หลักแล้ว Vercel และ Render จะ deploy ใหม่ให้อัตโนมัติ ถ้าแก้ `schema.prisma` ให้สร้าง migration ในเครื่องก่อน (`npx prisma migrate dev --name <ชื่อ>`) แล้ว commit โฟลเดอร์ `prisma/migrations` ไปด้วย
