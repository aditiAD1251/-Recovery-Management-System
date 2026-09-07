import { Router } from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const userRouter = Router();

// Apply Authentication and Admin RBAC globally across all user management routes
userRouter.use(authenticate);
userRouter.use(authorizeRoles('ADMIN'));

/**
 * @route   GET /api/v1/users
 * @desc    Get paginated users with search and filters
 * @access  Private (ADMIN)
 */
userRouter.get('/', getUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Private (ADMIN)
 */
userRouter.get('/:id', getUserById);

/**
 * @route   POST /api/v1/users
 * @desc    Create a new user
 * @access  Private (ADMIN)
 */
userRouter.post('/', createUser);

/**
 * @route   PATCH /api/v1/users/:id
 * @desc    Update an existing user
 * @access  Private (ADMIN)
 */
userRouter.patch('/:id', updateUser);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Deactivate a user
 * @access  Private (ADMIN)
 */
userRouter.delete('/:id', deleteUser);

export default userRouter;
