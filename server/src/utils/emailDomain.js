// ตรวจโดเมนอีเมลที่เข้าสู่ระบบได้ (ตั้งใน ALLOWED_EMAIL_DOMAINS · * หรือเว้นว่าง = ทุกโดเมน)

export const normalizeEmail = (email) => {
  return String(email ?? '')
    .trim()
    .toLowerCase();
};

/** แยกค่า ALLOWED_EMAIL_DOMAINS เป็นรายการโดเมน · รายการว่าง = รับทุกโดเมน */
export const parseEmailDomains = (value) => {
  const domains = String(value ?? '')
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return domains.includes('*') ? [] : domains;
};

export const isAllowedEmail = (email, allowedDomains) => {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf('@');
  if (at < 1 || at === normalized.length - 1) return false;
  if (allowedDomains.length === 0) return true;
  const domain = normalized.slice(at + 1);
  return allowedDomains.includes(domain);
};
