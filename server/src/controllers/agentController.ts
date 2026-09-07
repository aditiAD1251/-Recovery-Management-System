import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { CollectionAgent } from '../models/CollectionAgent.js';
import { User } from '../models/User.js';
import { Region } from '../models/Region.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Get Paginated List of Collection Agents
 * (Admin views all, Supervisor views assigned or all)
 * GET /api/v1/agents
 */
export const getAgents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, region, supervisor, isActive } = req.query;

    const filter: Record<string, any> = {};

    if (region && typeof region === 'string' && mongoose.Types.ObjectId.isValid(region)) {
      filter.region = region;
    }

    if (supervisor && typeof supervisor === 'string' && mongoose.Types.ObjectId.isValid(supervisor)) {
      filter.supervisor = supervisor;
    }

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    // Search by employee code or user name/email
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');

      // Find matching user IDs
      const matchingUsers = await User.find({
        $or: [{ name: searchRegex }, { email: searchRegex }],
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      filter.$or = [
        { employeeCode: searchRegex },
        { user: { $in: userIds } },
        { phone: searchRegex },
      ];
    }

    const [agents, total] = await Promise.all([
      CollectionAgent.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email role isActive')
        .populate('region', 'name code isActive')
        .populate('supervisor', 'name email role isActive'),
      CollectionAgent.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    sendSuccess(
      res,
      'Collection agents retrieved successfully',
      {
        agents,
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
 * Get Collection Agent by ID
 * GET /api/v1/agents/:id
 */
export const getAgentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid agent ID format', 400);
      return;
    }

    const agent = await CollectionAgent.findById(id)
      .populate('user', 'name email role isActive')
      .populate('region', 'name code isActive')
      .populate('supervisor', 'name email role isActive');

    if (!agent) {
      sendError(res, 'Collection agent not found', 404);
      return;
    }

    sendSuccess(res, 'Collection agent retrieved successfully', { agent }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Create New Collection Agent (Admin only)
 * POST /api/v1/agents
 */
export const createAgent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user: userId, employeeCode, region: regionId, supervisor: supervisorId, phone, isActive } = req.body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      sendError(res, 'A valid User ID is required for the agent', 400);
      return;
    }

    if (!employeeCode || typeof employeeCode !== 'string' || !employeeCode.trim()) {
      sendError(res, 'Employee code is required', 400);
      return;
    }

    if (!regionId || !mongoose.Types.ObjectId.isValid(regionId)) {
      sendError(res, 'A valid Region ID is required', 400);
      return;
    }

    if (!supervisorId || !mongoose.Types.ObjectId.isValid(supervisorId)) {
      sendError(res, 'A valid Supervisor User ID is required', 400);
      return;
    }

    const normalizedEmpCode = employeeCode.toUpperCase().trim();

    // 1. Validate User Account (must exist and have role === 'AGENT')
    const agentUser = await User.findById(userId);
    if (!agentUser) {
      sendError(res, 'User account not found', 404);
      return;
    }
    if (agentUser.role !== 'AGENT') {
      sendError(
        res,
        `Cannot assign collection agent profile: User '${agentUser.name}' has role '${agentUser.role}', expected 'AGENT'`,
        400
      );
      return;
    }

    // 2. Validate User is not already linked to another CollectionAgent
    const existingAgentProfile = await CollectionAgent.findOne({ user: userId });
    if (existingAgentProfile) {
      sendError(res, 'A Collection Agent profile already exists for this user account', 409);
      return;
    }

    // 3. Validate Employee Code Uniqueness
    const existingEmpCode = await CollectionAgent.findOne({ employeeCode: normalizedEmpCode });
    if (existingEmpCode) {
      sendError(res, `Employee code '${normalizedEmpCode}' is already in use`, 409);
      return;
    }

    // 4. Validate Region
    const region = await Region.findById(regionId);
    if (!region) {
      sendError(res, 'Specified region does not exist', 404);
      return;
    }

    // 5. Validate Supervisor (must exist and have role === 'SUPERVISOR')
    const supervisor = await User.findById(supervisorId);
    if (!supervisor) {
      sendError(res, 'Supervisor user not found', 404);
      return;
    }
    if (supervisor.role !== 'SUPERVISOR') {
      sendError(
        res,
        `Invalid supervisor: User '${supervisor.name}' has role '${supervisor.role}', expected 'SUPERVISOR'`,
        400
      );
      return;
    }

    // Create Agent Profile
    const newAgent = await CollectionAgent.create({
      user: userId,
      employeeCode: normalizedEmpCode,
      region: regionId,
      supervisor: supervisorId,
      phone: phone ? phone.trim() : '',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    const populatedAgent = await CollectionAgent.findById(newAgent._id)
      .populate('user', 'name email role isActive')
      .populate('region', 'name code isActive')
      .populate('supervisor', 'name email role isActive');

    sendSuccess(res, 'Collection agent profile created successfully', { agent: populatedAgent }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update Existing Collection Agent (Admin only)
 * PATCH /api/v1/agents/:id
 */
export const updateAgent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { employeeCode, region: regionId, supervisor: supervisorId, phone, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid agent ID format', 400);
      return;
    }

    const agent = await CollectionAgent.findById(id);
    if (!agent) {
      sendError(res, 'Collection agent not found', 404);
      return;
    }

    if (employeeCode && typeof employeeCode === 'string' && employeeCode.trim()) {
      const normalizedCode = employeeCode.toUpperCase().trim();
      if (normalizedCode !== agent.employeeCode) {
        const existingCode = await CollectionAgent.findOne({
          employeeCode: normalizedCode,
          _id: { $ne: id },
        });
        if (existingCode) {
          sendError(res, `Employee code '${normalizedCode}' is already in use`, 409);
          return;
        }
        agent.employeeCode = normalizedCode;
      }
    }

    if (regionId) {
      if (!mongoose.Types.ObjectId.isValid(regionId)) {
        sendError(res, 'Invalid region ID format', 400);
        return;
      }
      const region = await Region.findById(regionId);
      if (!region) {
        sendError(res, 'Specified region not found', 404);
        return;
      }
      agent.region = region._id as any;
    }

    if (supervisorId) {
      if (!mongoose.Types.ObjectId.isValid(supervisorId)) {
        sendError(res, 'Invalid supervisor ID format', 400);
        return;
      }
      const supervisor = await User.findById(supervisorId);
      if (!supervisor) {
        sendError(res, 'Supervisor user not found', 404);
        return;
      }
      if (supervisor.role !== 'SUPERVISOR') {
        sendError(
          res,
          `Invalid supervisor: User '${supervisor.name}' has role '${supervisor.role}', expected 'SUPERVISOR'`,
          400
        );
        return;
      }
      agent.supervisor = supervisor._id as any;
    }

    if (phone !== undefined) {
      agent.phone = typeof phone === 'string' ? phone.trim() : '';
    }

    if (isActive !== undefined) {
      agent.isActive = Boolean(isActive);
    }

    await agent.save();

    const populatedAgent = await CollectionAgent.findById(agent._id)
      .populate('user', 'name email role isActive')
      .populate('region', 'name code isActive')
      .populate('supervisor', 'name email role isActive');

    sendSuccess(res, 'Collection agent updated successfully', { agent: populatedAgent }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate Collection Agent Profile (Admin only)
 * DELETE /api/v1/agents/:id
 */
export const deleteAgent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid agent ID format', 400);
      return;
    }

    const agent = await CollectionAgent.findById(id);
    if (!agent) {
      sendError(res, 'Collection agent not found', 404);
      return;
    }

    agent.isActive = false;
    await agent.save();

    const populatedAgent = await CollectionAgent.findById(agent._id)
      .populate('user', 'name email role isActive')
      .populate('region', 'name code isActive')
      .populate('supervisor', 'name email role isActive');

    sendSuccess(res, 'Collection agent profile deactivated successfully', { agent: populatedAgent }, 200);
  } catch (error) {
    next(error);
  }
};
