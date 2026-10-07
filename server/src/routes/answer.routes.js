// เส้นทาง /api/answers: แก้ไข/ลบคำตอบในบอร์ดคำถาม (ข้อ 3.5.7) · การตอบคำถามอยู่ที่ /api/questions/:id/answers
import { Router } from 'express';
import * as answers from '../controllers/answer.controller.js';
import { requireAuth, requireGuidelines } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, updateAnswerBody } from '../schemas.js';

const router = Router();

router.use(requireAuth, requireGuidelines);
router.patch('/:id', validate({ params: idParam, body: updateAnswerBody }), answers.update);
router.delete('/:id', validate({ params: idParam }), answers.remove);

export default router;
