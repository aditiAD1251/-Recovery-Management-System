import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('[Error Middleware]:', err.stack || err.message);

  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
};
