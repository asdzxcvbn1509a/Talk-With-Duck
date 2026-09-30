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
  updateAnswerBody,
  updateQuestionBody,
} from '../schemas.js';

export const questionRouter = Router();
questionRouter.use(requireAuth, requireGuidelines);
questionRouter.get('/', validate({ query: listQuestionsQuery }), questions.list);
questionRouter.post('/', postLimiter, validate({ body: createQuestionBody }), questions.create);
questionRouter.get('/:id', validate({ params: idParam }), questions.get);
questionRouter.patch(
  '/:id',
  validate({ params: idParam, body: updateQuestionBody }),
  questions.update,
);
questionRouter.delete('/:id', validate({ params: idParam }), questions.remove);
questionRouter.post(
  '/:id/answers',
  postLimiter,
  validate({ params: idParam, body: createAnswerBody }),
  questions.createAnswer,
);
questionRouter.post('/:id/love', validate({ params: idParam }), questions.love);

export const answerRouter = Router();
answerRouter.use(requireAuth, requireGuidelines);
answerRouter.patch(
  '/:id',
  validate({ params: idParam, body: updateAnswerBody }),
  questions.updateAnswer,
);
answerRouter.delete('/:id', validate({ params: idParam }), questions.removeAnswer);
