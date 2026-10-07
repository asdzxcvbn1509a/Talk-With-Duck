// รับคำขอ /api/questions: บอร์ดคำถาม ตั้ง/แก้/ลบคำถาม ตอบ และส่งใจ (แก้/ลบคำตอบอยู่ใน answer.controller.js)
import * as questionService from '../services/question.service.js';

export const list = async (req, res, next) => {
  try {
    res.json(await questionService.listQuestions(req.user, req.valid.query));
  } catch (err) {
    next(err);
  }
};

export const get = async (req, res, next) => {
  try {
    res.json({ question: await questionService.getQuestion(req.user, req.valid.params.id) });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    res
      .status(201)
      .json({ question: await questionService.createQuestion(req.user, req.valid.body) });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const question = await questionService.updateQuestion(
      req.user,
      req.valid.params.id,
      req.valid.body,
    );
    res.json({ question });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await questionService.deleteQuestion(req.user, req.valid.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

export const createAnswer = async (req, res, next) => {
  try {
    const answer = await questionService.createAnswer(
      req.user,
      req.valid.params.id,
      req.valid.body,
    );
    res.status(201).json({ answer });
  } catch (err) {
    next(err);
  }
};

export const love = async (req, res, next) => {
  try {
    res.json(await questionService.toggleLove(req.user, req.valid.params.id));
  } catch (err) {
    next(err);
  }
};
