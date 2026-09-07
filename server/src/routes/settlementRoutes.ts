import { Router } from 'express';
import {
  createSettlementRequest,
  getSettlementRequests,
  getSettlementRequestById,
  reviewSettlementRequest,
  completeSettlement,
  cancelSettlementRequest,
} from '../controllers/settlementController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const settlementRouter = Router();

// Authentication required for all settlement routes
settlementRouter.use(authenticate);

/**
 * @route   GET /api/v1/settlements
 * @desc    Get settlement requests with filtering & role-scoping
 * @access  Private (AGENT, SUPERVISOR, LEGAL_HEAD, ADMIN)
 */
settlementRouter.get(
  '/',
  authorizeRoles('AGENT', 'SUPERVISOR', 'LEGAL_HEAD', 'ADMIN'),
  getSettlementRequests
);

/**
 * @route   GET /api/v1/settlements/:id
 * @desc    Get single settlement request by ID
 * @access  Private (AGENT, SUPERVISOR, LEGAL_HEAD, ADMIN)
 */
settlementRouter.get(
  '/:id',
  authorizeRoles('AGENT', 'SUPERVISOR', 'LEGAL_HEAD', 'ADMIN'),
  getSettlementRequestById
);

/**
 * @route   POST /api/v1/settlements
 * @desc    Create new settlement proposal
 * @access  Private (AGENT, SUPERVISOR, LEGAL_HEAD, ADMIN)
 */
settlementRouter.post(
  '/',
  authorizeRoles('AGENT', 'SUPERVISOR', 'LEGAL_HEAD', 'ADMIN'),
  createSettlementRequest
);

/**
 * @route   PATCH /api/v1/settlements/:id/review
 * @desc    Review settlement proposal (Approve, Reject, or Escalate to Legal)
 * @access  Private (SUPERVISOR, LEGAL_HEAD, ADMIN)
 */
settlementRouter.patch(
  '/:id/review',
  authorizeRoles('SUPERVISOR', 'LEGAL_HEAD', 'ADMIN'),
  reviewSettlementRequest
);

/**
 * @route   POST /api/v1/settlements/:id/complete
 * @desc    Confirm payment & complete settlement (Updates Loan to SETTLED)
 * @access  Private (SUPERVISOR, LEGAL_HEAD, ADMIN)
 */
settlementRouter.post(
  '/:id/complete',
  authorizeRoles('SUPERVISOR', 'LEGAL_HEAD', 'ADMIN'),
  completeSettlement
);

/**
 * @route   PATCH /api/v1/settlements/:id/cancel
 * @desc    Cancel pending settlement proposal
 * @access  Private (AGENT, SUPERVISOR, ADMIN)
 */
settlementRouter.patch(
  '/:id/cancel',
  authorizeRoles('AGENT', 'SUPERVISOR', 'ADMIN'),
  cancelSettlementRequest
);

export default settlementRouter;
