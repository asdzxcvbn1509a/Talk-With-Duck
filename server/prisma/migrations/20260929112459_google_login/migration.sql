-- เปลี่ยนเป็นเข้าสู่ระบบด้วย Google: ไม่ใช้รหัสผ่านและ OTP ทางอีเมลอีกต่อไป
-- บัญชีเดิมยังอยู่ครบ และจะผูก google_sub ให้เองตอนเข้าด้วย Google ครั้งแรก (จับคู่จากอีเมล)

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password_hash",
ADD COLUMN     "google_sub" TEXT;

-- DropTable
DROP TABLE "email_otps";

-- DropEnum
DROP TYPE "otp_purpose";

-- CreateIndex
CREATE UNIQUE INDEX "users_google_sub_key" ON "users"("google_sub");
