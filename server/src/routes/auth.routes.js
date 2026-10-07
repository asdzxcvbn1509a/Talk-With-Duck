// เส้นทาง /api/auth: เข้าสู่ระบบด้วย Google ต่ออายุ session และออกจากระบบ (ข้อ 3.5.4)
import { Router } from 'express';
import { env } from '../config/env.js';
import * as auth from '../controllers/auth.controller.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { devLoginBody, googleBody } from '../schemas.js';

const router = Router();

router.post('/google', authLimiter, validate({ body: googleBody }), auth.google);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);

// บัญชีทดสอบ: มี route นี้เฉพาะ DEV_LOGIN=true + NODE_ENV=development (ตอนเทสต์และบนเว็บจริงได้ 404)
if (env.devLogin) {
  router.get('/dev-accounts', auth.devAccounts);
  router.post('/dev-login', validate({ body: devLoginBody }), auth.devLogin);
}

export default router;
