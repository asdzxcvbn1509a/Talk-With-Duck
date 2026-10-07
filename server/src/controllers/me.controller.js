// รับคำขอ /api/me: ข้อมูลของผู้ใช้ที่ล็อกอินอยู่ แก้โปรไฟล์ ยอมรับข้อตกลง และลบบัญชี
import * as userService from '../services/user.service.js';
import { clearRefreshCookie } from '../utils/cookies.js';
import { selfUser } from '../utils/present.js';

export const getMe = (req, res, next) => {
  try {
    res.json({ user: selfUser(req.user) });
  } catch (err) {
    next(err);
  }
};

export const updateMe = async (req, res, next) => {
  try {
    const user = await userService.updateProfile(req.user.id, req.valid.body);
    res.json({ user: selfUser(user) });
  } catch (err) {
    next(err);
  }
};

export const acceptGuidelines = async (req, res, next) => {
  try {
    const user = await userService.acceptGuidelines(req.user.id);
    res.json({ user: selfUser(user) });
  } catch (err) {
    next(err);
  }
};

export const deleteMe = async (req, res, next) => {
  try {
    await userService.deleteAccount(req.user);
    clearRefreshCookie(res);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
