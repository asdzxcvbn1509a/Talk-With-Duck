// pg ให้ sslmode ใน connection string ชนะ option ssl ที่ส่งให้ แล้วตรวจใบรับรองแบบเต็ม
// ซึ่ง CA ของ Supabase ไม่ผ่าน จึงตัด sslmode ออกเมื่อ server กำหนด ssl เอง (DATABASE_SSL=true)
export const withoutSslMode = (connectionString) => {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    return url.toString();
  } catch {
    // URL ผิดรูปแบบ: คืนค่าเดิมให้ pg แจ้ง error เอง
    return connectionString;
  }
};
