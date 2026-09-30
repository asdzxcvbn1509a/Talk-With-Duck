import { Prisma } from '@prisma/client';
import { HttpError } from '../utils/httpError.js';

export const notFoundHandler = (req, res) => {
  res
    .status(404)
    .json({ error: { code: 'NOT_FOUND', message: `ไม่พบเส้นทาง ${req.method} ${req.path}` } });
};

export const errorHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: { code: 'DUPLICATE', message: 'มีข้อมูลนี้อยู่แล้ว' } });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'ไม่พบข้อมูล' } });
    }
  }

  // JSON ที่ส่งมาไม่ถูกรูปแบบ
  if (err.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ error: { code: 'INVALID_JSON', message: 'รูปแบบข้อมูลไม่ถูกต้อง' } });
  }

  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'ระบบขัดข้อง ลองใหม่อีกครั้งนะ' } });
};
