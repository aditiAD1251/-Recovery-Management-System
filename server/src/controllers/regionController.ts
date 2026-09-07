import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Region } from '../models/Region.js';
import { CollectionAgent } from '../models/CollectionAgent.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Get List of Regions (Authenticated users)
 * GET /api/v1/regions
 */
export const getRegions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const isAll = req.query.all === 'true';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const { search, isActive } = req.query;

    const filter: Record<string, any> = {};

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { code: searchRegex }, { description: searchRegex }];
    }

    if (isActive !== undefined && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    if (isAll) {
      const regions = await Region.find(filter).sort({ name: 1 });
      sendSuccess(res, 'All regions retrieved successfully', { regions, total: regions.length }, 200);
      return;
    }

    const [regions, total] = await Promise.all([
      Region.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Region.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    sendSuccess(
      res,
      'Regions retrieved successfully',
      {
        regions,
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
 * Get Single Region by ID (Authenticated users)
 * GET /api/v1/regions/:id
 */
export const getRegionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid region ID format', 400);
      return;
    }

    const region = await Region.findById(id);
    if (!region) {
      sendError(res, 'Region not found', 404);
      return;
    }

    sendSuccess(res, 'Region retrieved successfully', { region }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Create New Region (Admin only)
 * POST /api/v1/regions
 */
export const createRegion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, code, description, isActive } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      sendError(res, 'Region name is required', 400);
      return;
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      sendError(res, 'Region code is required', 400);
      return;
    }

    const normalizedCode = code.toUpperCase().trim();

    // Check code uniqueness
    const existingRegion = await Region.findOne({ code: normalizedCode });
    if (existingRegion) {
      sendError(res, `Region with code '${normalizedCode}' already exists`, 409);
      return;
    }

    const region = await Region.create({
      name: name.trim(),
      code: normalizedCode,
      description: description ? description.trim() : '',
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    sendSuccess(res, 'Region created successfully', { region }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update Existing Region (Admin only)
 * PATCH /api/v1/regions/:id
 */
export const updateRegion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid region ID format', 400);
      return;
    }

    const region = await Region.findById(id);
    if (!region) {
      sendError(res, 'Region not found', 404);
      return;
    }

    if (name && typeof name === 'string' && name.trim()) {
      region.name = name.trim();
    }

    if (code && typeof code === 'string' && code.trim()) {
      const normalizedCode = code.toUpperCase().trim();
      if (normalizedCode !== region.code) {
        const existingCode = await Region.findOne({
          code: normalizedCode,
          _id: { $ne: id },
        });
        if (existingCode) {
          sendError(res, `Region code '${normalizedCode}' is already in use`, 409);
          return;
        }
        region.code = normalizedCode;
      }
    }

    if (description !== undefined) {
      region.description = typeof description === 'string' ? description.trim() : '';
    }

    if (isActive !== undefined) {
      region.isActive = Boolean(isActive);
    }

    await region.save();

    sendSuccess(res, 'Region updated successfully', { region }, 200);
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate / Soft Delete Region (Admin only)
 * DELETE /api/v1/regions/:id
 */
export const deleteRegion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      sendError(res, 'Invalid region ID format', 400);
      return;
    }

    const region = await Region.findById(id);
    if (!region) {
      sendError(res, 'Region not found', 404);
      return;
    }

    // Safe deactivation
    region.isActive = false;
    await region.save();

    // Check if agents are assigned
    const assignedAgentCount = await CollectionAgent.countDocuments({
      region: id,
      isActive: true,
    });

    sendSuccess(
      res,
      assignedAgentCount > 0
        ? `Region deactivated successfully. Note: ${assignedAgentCount} active agent(s) remain assigned to this region.`
        : 'Region deactivated successfully',
      { region },
      200
    );
  } catch (error) {
    next(error);
  }
};
