import { Router } from 'express';
import {
  getPromisesToPay,
  getPromiseToPayById,
  createPromiseToPay,
  updatePromiseToPay,
} from '../controllers/promiseToPayController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const promiseToPayRouter = Router();

// Authentication required for all Promise-to-Pay endpoints
promiseToPayRouter.use(authenticate);

/**
 * @route   GET /api/v1/promises-to-pay
 * @desc    Get Promise-to-Pay records with filtering & agent scoping
 * @access  Private (AGENT, SUPERVISOR, ADMIN, LEGAL_HEAD)
 */
promiseToPayRouter.get(
  '/',
  authorizeRoles('AGENT', 'SUPERVISOR', 'ADMIN', 'LEGAL_HEAD'),
  getPromisesToPay
);

/**
 * @route   GET /api/v1/promises-to-pay/:id
 * @desc    Get single Promise-to-Pay record by ID
 * @access  Private (AGENT, SUPERVISOR, ADMIN, LEGAL_HEAD)
 */
promiseToPayRouter.get(
  '/:id',
  authorizeRoles('AGENT', 'SUPERVISOR', 'ADMIN', 'LEGAL_HEAD'),
  getPromiseToPayById
);

/**
 * @route   POST /api/v1/promises-to-pay
 * @desc    Create new Promise-to-Pay record
 * @access  Private (AGENT, SUPERVISOR, ADMIN)
 */
promiseToPayRouter.post(
  '/',
  authorizeRoles('AGENT', 'SUPERVISOR', 'ADMIN'),
  createPromiseToPay
);

/**
 * @route   PATCH /api/v1/promises-to-pay/:id
 * @desc    Update Promise-to-Pay record status / remarks
 * @access  Private (AGENT, SUPERVISOR, ADMIN)
 */
promiseToPayRouter.patch(
  '/:id',
  authorizeRoles('AGENT', 'SUPERVISOR', 'ADMIN'),
  updatePromiseToPay
);

export default promiseToPayRouter;
