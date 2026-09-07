import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { CollectionAgent } from '../models/CollectionAgent.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { UserRole } from '../types/user.js';

/**
 * Get Paginated List of Users (Admin only)
 * GET /api/v1/users
 */
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, role, isActive } = req.query;

    const filter: Record<string, any> = {};

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    if (role && typeof role === 'string' && role.trim()) {
      filter.role = role.trim().toUpperCase() as UserRole;
    }

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-password'),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    sendSuccess(
      res,
      'Users retrieved successfully',
      {
        users,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get User by ID (Admin only)
 * GET /api/v1/users/:id
 */
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid user ID format', 400);
      return;
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    sendSuccess(res, 'User retrieved successfully', { user }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a New User (Admin only)
 * POST /api/v1/users
 */
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, role, isActive } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      sendError(res, 'Name is required', 400);
      return;
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      sendError(res, 'Email is required', 400);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      sendError(res, 'Please provide a valid email address', 400);
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      sendError(res, 'Password is required and must be at least 6 characters long', 400);
      return;
    }

    const validRoles: UserRole[] = ['ADMIN', 'SUPERVISOR', 'AGENT', 'LEGAL_HEAD'];
    if (role && !validRoles.includes(role)) {
      sendError(res, `Invalid role. Allowed roles are: ${validRoles.join(', ')}`, 400);
      return;
    }

    // Check email uniqueness
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      sendError(res, 'A user with this email address already exists', 409);
      return;
    }

    // Create user (triggers pre-save bcrypt hash)
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: role || 'AGENT',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    const userObj = newUser.toJSON();

    sendSuccess(res, 'User created successfully', { user: userObj }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update Existing User (Admin only)
 * PATCH /api/v1/users/:id
 */
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, role, isActive, password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid user ID format', 400);
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    if (name && typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }

    if (email && typeof email === 'string' && email.trim()) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existingEmail = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: id },
        });
        if (existingEmail) {
          sendError(res, 'Another user already uses this email address', 409);
          return;
        }
        user.email = normalizedEmail;
      }
    }

    if (role) {
      const validRoles: UserRole[] = ['ADMIN', 'SUPERVISOR', 'AGENT', 'LEGAL_HEAD'];
      if (!validRoles.includes(role)) {
        sendError(res, `Invalid role. Allowed roles are: ${validRoles.join(', ')}`, 400);
        return;
      }
      user.role = role;
    }

    if (isActive !== undefined) {
      user.isActive = Boolean(isActive);
    }

    if (password && typeof password === 'string' && password.trim()) {
      if (password.length < 6) {
        sendError(res, 'Password must be at least 6 characters long', 400);
        return;
      }
      user.password = password; // Will be hashed by pre-save hook
    }

    await user.save();

    const userObj = user.toJSON();

    sendSuccess(res, 'User updated successfully', { user: userObj }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle User Activation Status / Soft-Delete (Admin only)
 * DELETE /api/v1/users/:id
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid user ID format', 400);
      return;
    }

    const user = await User.findById(id);
    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Prevent admin from deactivating self
    if (req.user && req.user.id === id) {
      sendError(res, 'You cannot deactivate your own administrative account', 400);
      return;
    }

    // Safe deactivation
    user.isActive = false;
    await user.save();

    // Also deactivate associated collection agent profile if exists
    await CollectionAgent.updateMany({ user: id }, { isActive: false });

    sendSuccess(res, 'User deactivated successfully', { user: user.toJSON() }, 200);
  } catch (error) {
    next(error);
  }
};
