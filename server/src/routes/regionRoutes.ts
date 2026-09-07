import { Router } from 'express';
import {
  getRegions,
  getRegionById,
  createRegion,
  updateRegion,
  deleteRegion,
} from '../controllers/regionController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const regionRouter = Router();

// Authentication required for all region endpoints
regionRouter.use(authenticate);

/**
 * @route   GET /api/v1/regions
 * @desc    Get regions list with pagination/search
 * @access  Private (Authenticated users)
 */
regionRouter.get('/', getRegions);

/**
 * @route   GET /api/v1/regions/:id
 * @desc    Get region by ID
 * @access  Private (Authenticated users)
 */
regionRouter.get('/:id', getRegionById);

/**
 * @route   POST /api/v1/regions
 * @desc    Create new region
 * @access  Private (ADMIN)
 */
regionRouter.post('/', authorizeRoles('ADMIN'), createRegion);

/**
 * @route   PATCH /api/v1/regions/:id
 * @desc    Update existing region
 * @access  Private (ADMIN)
 */
regionRouter.patch('/:id', authorizeRoles('ADMIN'), updateRegion);

/**
 * @route   DELETE /api/v1/regions/:id
 * @desc    Deactivate a region
 * @access  Private (ADMIN)
 */
regionRouter.delete('/:id', authorizeRoles('ADMIN'), deleteRegion);

export default regionRouter;
