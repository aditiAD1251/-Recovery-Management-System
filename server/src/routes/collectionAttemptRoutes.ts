import { Router } from 'express';
import {
  getCollectionAttempts,
  getCollectionAttemptById,
  createCollectionAttempt,
  updateCollectionAttempt,
} from '../controllers/collectionAttemptController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const collectionAttemptRouter = Router();

// Authentication required for all collection attempt endpoints
collectionAttemptRouter.use(authenticate);

/**
 * @route   GET /api/v1/collection-attempts
 * @desc    Get collection attempts with filtering & agent scoping
 * @access  Private (AGENT, SUPERVISOR, ADMIN, LEGAL_HEAD)
 */
collectionAttemptRouter.get(
  '/',
  authorizeRoles('AGENT', 'SUPERVISOR', 'ADMIN', 'LEGAL_HEAD'),
  getCollectionAttempts
);

/**
 * @route   GET /api/v1/collection-attempts/:id
 * @desc    Get single collection attempt by ID
 * @access  Private (AGENT, SUPERVISOR, ADMIN, LEGAL_HEAD)
 */
collectionAttemptRouter.get(
  '/:id',
  authorizeRoles('AGENT', 'SUPERVISOR', 'ADMIN', 'LEGAL_HEAD'),
  getCollectionAttemptById
);

/**
 * @route   POST /api/v1/collection-attempts
 * @desc    Record new collection attempt
 * @access  Private (AGENT, SUPERVISOR, ADMIN)
 */
collectionAttemptRouter.post(
  '/',
  authorizeRoles('AGENT', 'SUPERVISOR', 'ADMIN'),
  createCollectionAttempt
);

/**
 * @route   PATCH /api/v1/collection-attempts/:id
 * @desc    Update collection attempt details
 * @access  Private (AGENT, SUPERVISOR, ADMIN)
 */
collectionAttemptRouter.patch(
  '/:id',
  authorizeRoles('AGENT', 'SUPERVISOR', 'ADMIN'),
  updateCollectionAttempt
);

export default collectionAttemptRouter;
