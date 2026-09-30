import { Router } from 'express';
import * as me from '../controllers/me.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateMeBody } from '../schemas.js';

const router = Router();

router.use(requireAuth);
router.get('/', me.getMe);
router.patch('/', validate({ body: updateMeBody }), me.updateMe);
router.post('/accept-guidelines', me.acceptGuidelines);

export default router;
