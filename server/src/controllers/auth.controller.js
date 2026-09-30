import * as authService from '../services/auth.service.js';
import { revokeByRawToken, rotateSession } from '../services/token.service.js';
import { clearRefreshCookie, readRefreshCookie, setRefreshCookie } from '../utils/cookies.js';
import { selfUser } from '../utils/present.js';

const sendSession = (res, { user, accessToken, refreshToken }, status = 200) => {
  setRefreshCookie(res, refreshToken);
  res.status(status).json({ user: selfUser(user), accessToken });
};

export const google = async (req, res, next) => {
  try {
    const result = await authService.signInWithGoogle(req.valid.body);
    if (result.needsProfile) {
      res.json({ needsProfile: true, email: result.email });
      return;
    }
    sendSession(res, result, result.created ? 201 : 200);
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const token = readRefreshCookie(req);
    // ไม่มี cookie = ยังไม่ได้เข้าสู่ระบบ ซึ่งปกติตอนเปิดเว็บ จึงตอบ 204 ไม่ใช่ error
    // (cookie ที่มีแต่ใช้ไม่ได้ยังได้ 401 และถูกลบทิ้งด้านล่าง)
    if (!token) {
      res.status(204).end();
      return;
    }
    sendSession(res, await rotateSession(token));
  } catch (err) {
    clearRefreshCookie(res);
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    await revokeByRawToken(readRefreshCookie(req));
    clearRefreshCookie(res);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const devAccounts = async (_req, res, next) => {
  try {
    res.json({ accounts: await authService.listDevAccounts() });
  } catch (err) {
    next(err);
  }
};

export const devLogin = async (req, res, next) => {
  try {
    sendSession(res, await authService.devLogin(req.valid.body));
  } catch (err) {
    next(err);
  }
};
