import { Response } from 'express';
import { ApiResponse } from '../types/index.js';

export const sendResponse = <T>(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data?: T
): Response => {
  const responsePayload: ApiResponse<T> = {
    success,
    message,
    ...(data !== undefined && { data }),
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(responsePayload);
};

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
): Response => {
  return sendResponse(res, statusCode, true, message, data);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 400
): Response => {
  return sendResponse(res, statusCode, false, message);
};
