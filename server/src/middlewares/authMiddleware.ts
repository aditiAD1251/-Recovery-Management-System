import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { User } from '../models/User.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Authentication Middleware
 * Validates JWT token in Authorization header, checks user existence & active status,
 * and attaches sanitized user payload to req.user.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authentication required. Missing or malformed token.', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      sendError(res, 'Authentication token is empty.', 401);
      return;
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtErr: any) {
      if (jwtErr.name === 'TokenExpiredError') {
        sendError(res, 'Authentication token has expired. Please log in again.', 401);
        return;
      }
      sendError(res, 'Invalid authentication token.', 401);
      return;
    }

    // Check user in database
    const user = await User.findById(decoded.id);

    if (!user) {
      sendError(res, 'Authenticated user no longer exists.', 401);
      return;
    }

    if (!user.isActive) {
      sendError(res, 'User account is deactivated. Please contact an administrator.', 403);
      return;
    }

    // Attach safe user info to request
    req.user = {
      id: user._id ? user._id.toString() : user.id || '',
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    next(error);
  }
};
