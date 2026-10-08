import fs from 'node:fs';
import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { isPemCertificate, withoutSslMode } from '../../src/utils/databaseUrl.js';
import { isAllowedEmail, normalizeEmail, parseEmailDomains } from '../../src/utils/emailDomain.js';
import { parseYouTubeId, decodeHtmlEntities } from '../../src/utils/youtube.js';
import { hmac } from '../../src/lib/crypto.js';

describe('emailDomain', () => {
  const allowed = ['mail.kmutt.ac.th'];

  it('ตั้งโดเมนไว้: รับเฉพาะอีเมลโดเมนนั้น', () => {
    expect(isAllowedEmail('somchai.duck@mail.kmutt.ac.th', allowed)).toBe(true);
    expect(isAllowedEmail('SOMCHAI@MAIL.KMUTT.AC.TH', allowed)).toBe(true);
    expect(isAllowedEmail('somchai@gmail.com', allowed)).toBe(false);
    expect(isAllowedEmail('somchai@kmutt.ac.th', allowed)).toBe(false);
    expect(isAllowedEmail('evil@mail.kmutt.ac.th.attacker.com', allowed)).toBe(false);
    expect(isAllowedEmail('@mail.kmutt.ac.th', allowed)).toBe(false);
    expect(isAllowedEmail('', allowed)).toBe(false);
  });

  it('ไม่จำกัดโดเมน (รายการว่าง): รับทุกอีเมลที่รูปแบบถูก', () => {
    expect(isAllowedEmail('somchai@gmail.com', [])).toBe(true);
    expect(isAllowedEmail('somchai.duck@mail.kmutt.ac.th', [])).toBe(true);
    expect(isAllowedEmail('@gmail.com', [])).toBe(false);
    expect(isAllowedEmail('somchai@', [])).toBe(false);
    expect(isAllowedEmail('', [])).toBe(false);
  });

  it('แยกค่า ALLOWED_EMAIL_DOMAINS · * หรือเว้นว่าง = ทุกโดเมน', () => {
    expect(parseEmailDomains('*')).toEqual([]);
    expect(parseEmailDomains('')).toEqual([]);
    expect(parseEmailDomains(undefined)).toEqual([]);
    expect(parseEmailDomains('mail.kmutt.ac.th, *')).toEqual([]);
    expect(parseEmailDomains(' Mail.KMUTT.ac.th , kmutt.ac.th ,')).toEqual([
      'mail.kmutt.ac.th',
      'kmutt.ac.th',
    ]);
  });

  it('แปลงอีเมลเป็นตัวพิมพ์เล็กและตัดช่องว่าง', () => {
    expect(normalizeEmail('  Duck@Mail.KMUTT.ac.th ')).toBe('duck@mail.kmutt.ac.th');
  });
});

describe('databaseUrl', () => {
  const url =
    'postgresql://postgres.abcdefgh:pa%24s%40w0rd@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

  it('ตัด sslmode ออกโดยไม่แตะส่วนอื่นของ URL', () => {
    expect(withoutSslMode(`${url}?sslmode=require`)).toBe(url);
    expect(withoutSslMode(`${url}?sslmode=require&application_name=twd`)).toBe(
      `${url}?application_name=twd`,
    );
    expect(withoutSslMode(url)).toBe(url);
  });

  it('URL ผิดรูปแบบ: คืนค่าเดิม', () => {
    expect(withoutSslMode('not a url')).toBe('not a url');
  });

  it('pg ใช้ค่า ssl ที่ server กำหนด แม้ URL เดิมมี sslmode=require', () => {
    const ssl = { rejectUnauthorized: false };
    const client = new pg.Client({
      connectionString: withoutSslMode(`${url}?sslmode=require`),
      ssl,
    });
    expect(client.ssl).toEqual(ssl);
    expect(client.password).toBe('pa$s@w0rd');
  });

  it('DATABASE_SSL_CA: รับใบรับรอง PEM ทั้งก้อน ปฏิเสธค่าที่วางผิดรูปแบบ', () => {
    // ใบรับรอง CA สาธารณะของ Supabase (ไฟล์ที่ดาวน์โหลดจากหน้า Database Settings)
    const fixture = new URL('../fixtures/supabase-prod-ca-2021.crt', import.meta.url);
    const lines = fs.readFileSync(fixture, 'utf8').trim().split(/\r?\n/);

    expect(isPemCertificate(lines.join('\n'))).toBe(true);
    expect(isPemCertificate(lines.join('\r\n'))).toBe(true);
    // บรรทัดถูกต่อกันเป็นบรรทัดเดียว · \n เป็นตัวอักษร · ไม่มีบรรทัด BEGIN/END
    expect(isPemCertificate(lines.join(' '))).toBe(false);
    expect(isPemCertificate(lines.join('\\n'))).toBe(false);
    expect(isPemCertificate(lines.slice(1, -1).join('\n'))).toBe(false);
    expect(isPemCertificate('not a certificate')).toBe(false);
  });
});

describe('youtube', () => {
  it('แยกรหัสวิดีโอจากลิงก์หลายรูปแบบ', () => {
    const id = 'dQw4w9WgXcQ';
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${id}&t=10s`)).toBe(id);
    expect(parseYouTubeId(`https://youtu.be/${id}?si=abc`)).toBe(id);
    expect(parseYouTubeId(`https://m.youtube.com/watch?v=${id}`)).toBe(id);
    expect(parseYouTubeId(`https://music.youtube.com/watch?v=${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube.com/shorts/${id}`)).toBe(id);
    expect(parseYouTubeId(`https://www.youtube.com/embed/${id}`)).toBe(id);
    expect(parseYouTubeId(`youtube.com/watch?v=${id}`)).toBe(id);
    expect(parseYouTubeId(id)).toBe(id);
  });

  it('ปฏิเสธลิงก์ที่ไม่ใช่วิดีโอ YouTube', () => {
    expect(parseYouTubeId('https://vimeo.com/123')).toBeNull();
    expect(parseYouTubeId('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(parseYouTubeId('not a url at all')).toBeNull();
  });

  it('ถอดรหัส HTML entities ในชื่อเพลง', () => {
    expect(decodeHtmlEntities('Tom &amp; Jerry &#39;Karaoke&#39; &quot;Live&quot;')).toBe(
      `Tom & Jerry 'Karaoke' "Live"`,
    );
  });
});

describe('crypto', () => {
  it('hmac ให้ค่าเดิมเมื่อ input เดิม', () => {
    expect(hmac('abc')).toBe(hmac('abc'));
    expect(hmac('abc')).not.toBe(hmac('abd'));
  });
});
