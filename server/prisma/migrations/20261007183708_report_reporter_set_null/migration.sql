-- ผู้ใช้ลบบัญชีตัวเองได้: รายงานที่เคยส่งไว้ยังอยู่ (reporter_id เป็น null) ไม่หายไปพร้อมบัญชี
-- เช่น คนที่ถูกคุกคามรายงานแล้วลบบัญชี ผู้ดูแลยังเห็นรายงานและจัดการต่อได้

-- DropForeignKey
ALTER TABLE "reports" DROP CONSTRAINT "reports_reporter_id_fkey";

-- AlterTable
ALTER TABLE "reports" ALTER COLUMN "reporter_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
