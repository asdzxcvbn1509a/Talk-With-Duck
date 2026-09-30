import { Router } from 'express';
import * as karaoke from '../controllers/karaoke.controller.js';
import { requireAuth, requireGuidelines } from '../middleware/auth.js';
import { postLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { resolveBody, searchQuery } from '../schemas.js';

const router = Router();

router.use(requireAuth, requireGuidelines);
router.get('/config', karaoke.config);
router.get('/search', postLimiter, validate({ query: searchQuery }), karaoke.search);
router.post('/resolve', postLimiter, validate({ body: resolveBody }), karaoke.resolve);

export default router;
