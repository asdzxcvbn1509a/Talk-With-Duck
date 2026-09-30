-- ส่วนที่ Prisma schema เขียนไม่ได้: CHECK constraint และ Row Level Security
-- (สร้างด้วย `prisma migrate dev --create-only` แล้วเขียน SQL เอง)

-- ---------- CHECK constraints ----------
ALTER TABLE "users" ADD CONSTRAINT "users_year_check" CHECK ("year" BETWEEN 1 AND 4);
ALTER TABLE "users" ADD CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower("email"));
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_year_filter_check" CHECK ("year_filter" IS NULL OR "year_filter" BETWEEN 1 AND 4);
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_capacity_check" CHECK ("capacity" BETWEEN 2 AND 20);
ALTER TABLE "questions" ADD CONSTRAINT "questions_tag_year_check" CHECK ("tag_year" IS NULL OR "tag_year" BETWEEN 1 AND 4);
ALTER TABLE "questions" ADD CONSTRAINT "questions_love_count_check" CHECK ("love_count" >= 0);

-- ---------- Row Level Security (ข้อ 3.5.9 ข้อ 3) ----------
-- เปิด RLS โดยไม่มี policy = ปฏิเสธการเข้าถึงจาก role อื่นทั้งหมด
-- server ต่อฐานข้อมูลในฐานะเจ้าของตารางจึงไม่ถูกบล็อก
-- บน Supabase จะปิดการเข้าถึงผ่าน Data API สาธารณะ (anon key) ที่เปิดตาราง public ไว้โดยอัตโนมัติ
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "email_otps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "room_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "question_loves" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "song_queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
-- ตารางประวัติ migration ของ Prisma (ไม่มีใน shadow database ตอนรัน migrate dev จึงต้องเช็กก่อน)
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;
