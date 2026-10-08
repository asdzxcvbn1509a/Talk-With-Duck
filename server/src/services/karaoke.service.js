// ค้นหาเพลงบน YouTube (ผ่าน server เพื่อซ่อน API key) และแปลงลิงก์ที่ผู้ใช้วางเป็นข้อมูลเพลง
import { env } from '../config/env.js';
import { badRequest, unavailable } from '../utils/httpError.js';
import { decodeHtmlEntities, parseYouTubeId, youtubeThumbnail } from '../utils/youtube.js';

const CACHE_TTL_MS = 60 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map();

const cacheGet = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
};

const cacheSet = (key, value) => {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), value });
};

/** อ่านข้อความ error จาก YouTube ไว้ใน log (อ่านไม่ได้ก็ไม่เป็นไร) */
const readBody = async (res) => {
  try {
    return await res.text();
  } catch {
    return '';
  }
};

export const isSearchEnabled = () => {
  return Boolean(env.YOUTUBE_API_KEY);
};

export const searchSongs = async (q) => {
  if (!isSearchEnabled()) {
    throw unavailable('SEARCH_DISABLED', 'ยังไม่ได้เปิดระบบค้นหาเพลง วางลิงก์ YouTube แทนได้เลย');
  }
  const query = /karaoke|คาราโอเกะ/i.test(q) ? q : `${q} karaoke`;
  const key = query.toLowerCase();
  const cached = cacheGet(key);
  if (cached) return cached;

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.search = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    videoEmbeddable: 'true',
    maxResults: '12',
    q: query,
    key: env.YOUTUBE_API_KEY,
  }).toString();

  const res = await fetch(url);
  if (!res.ok) {
    console.error('YouTube search failed', res.status, await readBody(res));
    throw unavailable(
      'SEARCH_FAILED',
      'ค้นหาเพลงไม่สำเร็จ (อาจเกินโควตาวันนี้) วางลิงก์ YouTube แทนได้เลย',
    );
  }
  const data = await res.json();
  const results = (data.items ?? [])
    .filter((item) => item.id?.videoId)
    .map((item) => ({
      videoId: item.id.videoId,
      title: decodeHtmlEntities(item.snippet.title),
      channel: decodeHtmlEntities(item.snippet.channelTitle),
      thumbnail:
        item.snippet.thumbnails?.medium?.url ?? item.snippet.thumbnails?.default?.url ?? null,
    }));
  cacheSet(key, results);
  return results;
};

/** รับลิงก์ YouTube → คืน { videoId, title, thumbnail } โดยใช้ oEmbed (ไม่ต้องมี API key) */
export const resolveLink = async (link) => {
  const videoId = parseYouTubeId(link);
  if (!videoId) throw badRequest('INVALID_YOUTUBE_URL', 'ลิงก์นี้ไม่ใช่วิดีโอ YouTube');

  const oembed = new URL('https://www.youtube.com/oembed');
  oembed.search = new URLSearchParams({
    url: `https://www.youtube.com/watch?v=${videoId}`,
    format: 'json',
  }).toString();

  const res = await fetch(oembed);
  if (!res.ok) {
    throw badRequest(
      'VIDEO_UNAVAILABLE',
      'เปิดวิดีโอนี้ในเว็บไม่ได้ (อาจถูกปิดการฝัง) ลองเพลงอื่นนะ',
    );
  }
  const data = await res.json();
  return {
    videoId,
    title: String(data.title ?? 'ไม่ทราบชื่อเพลง').slice(0, 200),
    channel: data.author_name ?? null,
    thumbnail: youtubeThumbnail(videoId),
  };
};
