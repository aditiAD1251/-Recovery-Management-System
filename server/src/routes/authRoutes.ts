import { Router } from 'express';
import { login, getCurrentUser } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateLoginInput } from '../middlewares/validate.js';

const authRouter = Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user and get JWT token
 * @access  Public
 */
authRouter.post('/login', validateLoginInput, login);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get currently authenticated user details
 * @access  Protected
 */
authRouter.get('/me', authenticate, getCurrentUser);

export default authRouter;
