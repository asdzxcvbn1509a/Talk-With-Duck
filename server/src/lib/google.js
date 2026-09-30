// ตรวจ ID token ที่หน้าเว็บได้จากปุ่ม "Sign in with Google" (Google Identity Services)
// ตรวจลายเซ็นกับกุญแจของ Google และต้องออกให้ Client ID ของเราเท่านั้น (audience)
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { unauthorized, unavailable } from '../utils/httpError.js';

const client = new OAuth2Client();

export const verifyGoogleCredential = async (credential) => {
  if (!env.GOOGLE_CLIENT_ID) {
    throw unavailable('GOOGLE_NOT_CONFIGURED', 'ยังไม่ได้ตั้งค่าการเข้าสู่ระบบด้วย Google');
  }
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch {
    throw unauthorized(
      'GOOGLE_TOKEN_INVALID',
      'เข้าสู่ระบบด้วย Google ไม่สำเร็จ ลองกดใหม่อีกครั้ง',
    );
  }
};
