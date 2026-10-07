// เส้นทาง /api/questions: Open Q&A Board ตั้งคำถาม ตอบ และส่งใจ (ข้อ 3.5.7)
import { Router } from 'express';
import * as questions from '../controllers/question.controller.js';
import { requireAuth, requireGuidelines } from '../middleware/auth.js';
import { postLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import {
  createAnswerBody,
  createQuestionBody,
  idParam,
  listQuestionsQuery,
  updateQuestionBody,
} from '../schemas.js';

const router = Router();

router.use(requireAuth, requireGuidelines);
router.get('/', validate({ query: listQuestionsQuery }), questions.list);
router.post('/', postLimiter, validate({ body: createQuestionBody }), questions.create);
router.get('/:id', validate({ params: idParam }), questions.get);
router.patch('/:id', validate({ params: idParam, body: updateQuestionBody }), questions.update);
router.delete('/:id', validate({ params: idParam }), questions.remove);
router.post(
  '/:id/answers',
  postLimiter,
  validate({ params: idParam, body: createAnswerBody }),
  questions.createAnswer,
);
router.post('/:id/love', validate({ params: idParam }), questions.love);

export default router;
