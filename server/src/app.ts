import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { healthRouter } from './routes/health.routes.js';
import { apiRouter } from './routes/index.js';

const GLOBAL_RATE_LIMIT = {
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.', errorCode: 'RATE_LIMITED' },
};

/** Build the fully-wired Express application (no listen — that belongs to server.ts). */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId());
  app.use(helmet());
  app.use(
    cors({
      origin: [env.clientUrl],
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(rateLimit(GLOBAL_RATE_LIMIT));

  app.get('/api', (_req, res) => {
    res.json({
      success: true,
      data: { name: 'AVIORA API', version: '0.1.0', documentation: '/api/health' },
      message: 'Welcome to the AVIORA API',
    });
  });

  app.use('/api/health', healthRouter);
  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
