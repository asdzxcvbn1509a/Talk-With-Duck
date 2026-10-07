// รับคำขอ /api/karaoke: ค้นหาเพลง YouTube และแปลงลิงก์เป็นข้อมูลเพลง (คิวเพลงอยู่ที่ /api/rooms/:id/queue)
import * as karaokeService from '../services/karaoke.service.js';

export const config = (_req, res, next) => {
  try {
    res.json({ searchEnabled: karaokeService.isSearchEnabled() });
  } catch (err) {
    next(err);
  }
};

export const search = async (req, res, next) => {
  try {
    res.json({ results: await karaokeService.searchSongs(req.valid.query.q) });
  } catch (err) {
    next(err);
  }
};

export const resolve = async (req, res, next) => {
  try {
    res.json({ song: await karaokeService.resolveLink(req.valid.body.url) });
  } catch (err) {
    next(err);
  }
};
