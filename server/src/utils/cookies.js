// Refresh Token เก็บใน httpOnly cookie (JavaScript บนหน้าเว็บอ่านไม่ได้) ส่งเฉพาะเส้นทาง /api/auth
import { env } from '../config/env.js';
import { REFRESH_COOKIE } from '../config/constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const baseOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'strict',
  path: '/api/auth',
});

export const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(), maxAge: env.REFRESH_TOKEN_DAYS * DAY_MS });
};

export const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, baseOptions());
};

export const readRefreshCookie = (req) => {
  return req.cookies?.[REFRESH_COOKIE];
};
