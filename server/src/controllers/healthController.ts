import { Request, Response } from 'express';
import { getDatabaseStatus } from '../config/db.js';
import { config } from '../config/env.js';

export const getHealthStatus = (_req: Request, res: Response): void => {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    success: true,
    message: 'CLRMS API is running',
    timestamp: new Date().toISOString(),
    service: 'CLRMS Backend API',
    version: '1.0.0',
    environment: config.nodeEnv,
    database: {
      status: dbStatus.status,
      connected: dbStatus.status === 'connected',
      error: dbStatus.error,
    },
  });
};
