// ตัวช่วยตั้งค่าการต่อฐานข้อมูล: connection string และใบรับรอง SSL ของ Supabase
import crypto from 'node:crypto';

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

// DATABASE_SSL_CA ที่อ่านไม่ได้ (เช่น วางแล้วบรรทัดต่อกันเป็นบรรทัดเดียว) Node จะข้ามไปโดยไม่แจ้ง
// แล้วต่อฐานข้อมูลไม่ได้ทั้งระบบ จึงให้ env.js ตรวจตั้งแต่ตอนเริ่ม server
export const isPemCertificate = (value) => {
  try {
    new crypto.X509Certificate(value);
    return true;
  } catch {
    return false;
  }
};
