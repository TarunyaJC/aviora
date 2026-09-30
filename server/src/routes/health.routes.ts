import { Router } from 'express';
import type { ApiSuccess } from '../types/api.js';

interface HealthData {
  status: 'ok';
  service: string;
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const body: ApiSuccess<HealthData> = {
    success: true,
    data: {
      status: 'ok',
      service: 'aviora-api',
      version: '0.1.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    message: 'AVIORA API is healthy',
  };
  res.json(body);
});
