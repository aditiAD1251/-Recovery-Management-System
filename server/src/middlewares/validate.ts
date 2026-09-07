import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/apiResponse.js';

/**
 * Middleware to validate login request body.
 */
export const validateLoginInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.trim()) {
    sendError(res, 'Email is required', 400);
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    sendError(res, 'Please provide a valid email address', 400);
    return;
  }

  if (!password || typeof password !== 'string' || !password.trim()) {
    sendError(res, 'Password is required', 400);
    return;
  }

  next();
};
