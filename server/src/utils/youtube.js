// แยกรหัสวิดีโอ (11 ตัวอักษร) ออกจากลิงก์ YouTube รูปแบบต่าง ๆ

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export const parseYouTubeId = (input) => {
  const text = String(input ?? '').trim();
  if (ID_RE.test(text)) return text;

  let url;
  try {
    url = new URL(text.startsWith('http') ? text : `https://${text}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\.|^m\.|^music\./, '');
  let id = null;
  if (host === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0];
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const match = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      id = match?.[1] ?? null;
    }
  }
  return id && ID_RE.test(id) ? id : null;
};

/**
 * รูปปกของวิดีโอจากเซิร์ฟเวอร์รูปของ YouTube (ขนาดเดียวกับผลค้นหา)
 * server สร้างเองจากรหัสวิดีโอเสมอ ไม่รับ URL รูปจาก client: ไม่งั้นคนจองเพลงใส่ URL ของตัวเองได้
 * แล้วทุกคนในห้องจะโหลดรูปจากที่นั้น (เจ้าของ URL เห็น IP ของทุกคน และแสดงรูปอะไรก็ได้)
 */
export const youtubeThumbnail = (videoId) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

/** แปลง &amp; &#39; ฯลฯ ที่ YouTube Data API ส่งมาในชื่อเพลง */
export const decodeHtmlEntities = (text) => {
  return String(text ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
};
