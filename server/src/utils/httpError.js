// Error ที่มี HTTP status + code ให้ฝั่งเว็บใช้ตัดสินใจ และข้อความภาษาไทยไว้แสดงผู้ใช้
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (code, message = 'ข้อมูลไม่ถูกต้อง', details) =>
  new HttpError(400, code, message, details);
export const unauthorized = (code = 'UNAUTHORIZED', message = 'เข้าสู่ระบบก่อนนะ') =>
  new HttpError(401, code, message);
export const forbidden = (code = 'FORBIDDEN', message = 'ไม่มีสิทธิ์ทำรายการนี้') =>
  new HttpError(403, code, message);
export const notFound = (code = 'NOT_FOUND', message = 'ไม่พบข้อมูล') =>
  new HttpError(404, code, message);
export const conflict = (code, message) => new HttpError(409, code, message);
export const tooMany = (
  code = 'TOO_MANY_REQUESTS',
  message = 'ทำรายการถี่เกินไป ลองใหม่อีกสักครู่',
) => new HttpError(429, code, message);
export const unavailable = (code, message) => new HttpError(503, code, message);
