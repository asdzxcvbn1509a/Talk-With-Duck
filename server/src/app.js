// สร้าง Express app (แยกจาก index.js เพื่อให้ทดสอบด้วย supertest ได้โดยไม่ต้องเปิดพอร์ต)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import api from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

export const createApp = () => {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/', (_req, res) => res.json({ name: 'Talk With Duck API', docs: '/api/health' }));
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};
