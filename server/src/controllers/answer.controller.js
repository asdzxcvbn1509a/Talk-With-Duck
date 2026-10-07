// รับคำขอ /api/answers: แก้ไข/ลบคำตอบ (คำตอบเป็นส่วนหนึ่งของบอร์ดคำถาม จึงใช้ question.service)
import * as questionService from '../services/question.service.js';

export const update = async (req, res, next) => {
  try {
    const answer = await questionService.updateAnswer(
      req.user,
      req.valid.params.id,
      req.valid.body,
    );
    res.json({ answer });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    await questionService.deleteAnswer(req.user, req.valid.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
