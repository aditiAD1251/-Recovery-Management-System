import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Handle User Login
 * POST /api/v1/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      sendError(res, 'Email and password are required', 400);
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Query user including password field for verification
    const user = await User.findOne({ email: normalizedEmail }).select('+password');


    // Return generic error message to prevent account enumeration
    if (!user) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    // Verify account active status
    if (!user.isActive) {
      sendError(
        res,
        'Account is deactivated. Please contact your system administrator.',
        403
      );
      return;
    }

    // Verify password match
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      sendError(res, 'Invalid email or password', 401);
      return;
    }

    const userId = user._id ? user._id.toString() : user.id || '';

    // Generate JWT token
    const token = generateToken({
      id: userId,
      email: user.email,
      role: user.role,
    });

    sendSuccess(
      res,
      'Login successful',
      {
        token,
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current Authenticated User Profile
 * GET /api/v1/auth/me
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthenticated user', 401);
      return;
    }

    sendSuccess(
      res,
      'Authenticated user retrieved successfully',
      {
        user: req.user,
      },
      200
    );
  } catch (error) {
    next(error);
  }
};
