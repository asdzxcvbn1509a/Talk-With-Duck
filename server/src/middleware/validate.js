// ตรวจข้อมูลที่ส่งเข้ามาด้วย zod แล้วเก็บผลที่ผ่านการตรวจไว้ใน req.valid
// (Express 5 ไม่ให้เขียนทับ req.query จึงใช้ req.valid แทน)
import { badRequest } from '../utils/httpError.js';

export const validate = (schemas) => {
  return (req, _res, next) => {
    req.valid = req.valid ?? {};
    for (const key of ['params', 'query', 'body']) {
      if (!schemas[key]) continue;
      const result = schemas[key].safeParse(req[key] ?? {});
      if (!result.success) {
        const issues = result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        return next(
          badRequest('VALIDATION_ERROR', issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง', issues),
        );
      }
      req.valid[key] = result.data;
    }
    next();
  };
};
