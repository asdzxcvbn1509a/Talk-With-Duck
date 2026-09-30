import * as userService from '../services/user.service.js';
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
