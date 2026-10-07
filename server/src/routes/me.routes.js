// เส้นทาง /api/me: ข้อมูลของผู้ใช้ที่ล็อกอินอยู่ (ไม่ต้องยอมรับข้อตกลงก่อน หน้าข้อตกลงต้องใช้เส้นทางนี้)
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
// ลบบัญชีถาวร: ไม่ต้องยอมรับข้อตกลงก่อน ใครที่ล็อกอินได้ก็ลบบัญชีตัวเองได้
router.delete('/', me.deleteMe);

export default router;
