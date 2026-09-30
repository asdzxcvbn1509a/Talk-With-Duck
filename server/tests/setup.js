// รันก่อนทุกไฟล์เทสต์: ชี้ DATABASE_URL ไปที่ฐานข้อมูลทดสอบเท่านั้น (กันไม่ให้ล้างข้อมูล dev)
import dotenv from 'dotenv';
import { resolveTestDatabaseUrl } from './testDb.js';

dotenv.config({ quiet: true });

const testUrl = resolveTestDatabaseUrl();

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testUrl ?? 'postgresql://invalid:invalid@127.0.0.1:1/none';
process.env.TWD_HAS_TEST_DB = testUrl ? '1' : '';
process.env.JWT_ACCESS_SECRET ??= 'test-secret-that-is-long-enough-for-hs256-signing';
process.env.ALLOWED_EMAIL_DOMAINS = 'mail.kmutt.ac.th';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
