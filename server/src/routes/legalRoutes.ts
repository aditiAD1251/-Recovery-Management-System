import { Router } from 'express';
import {
  createLegalCase,
  getLegalCases,
  getLegalCaseById,
  updateLegalCase,
  issueLegalNotice,
  updateLegalNoticeStatus,
  recordHearing,
  executeWriteOff,
} from '../controllers/legalController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const legalRouter = Router();

// Authentication required for all legal routes
legalRouter.use(authenticate);

/**
 * @route   GET /api/v1/legal
 * @desc    Get legal cases with filtering & pagination
 * @access  Private (LEGAL_HEAD, SUPERVISOR, ADMIN, AGENT)
 */
legalRouter.get(
  '/',
  authorizeRoles('LEGAL_HEAD', 'SUPERVISOR', 'ADMIN', 'AGENT'),
  getLegalCases
);

/**
 * @route   GET /api/v1/legal/:id
 * @desc    Get single legal case file details
 * @access  Private (LEGAL_HEAD, SUPERVISOR, ADMIN, AGENT)
 */
legalRouter.get(
  '/:id',
  authorizeRoles('LEGAL_HEAD', 'SUPERVISOR', 'ADMIN', 'AGENT'),
  getLegalCaseById
);

/**
 * @route   POST /api/v1/legal
 * @desc    Create new legal case / escalation
 * @access  Private (AGENT, SUPERVISOR, LEGAL_HEAD, ADMIN)
 */
legalRouter.post(
  '/',
  authorizeRoles('AGENT', 'SUPERVISOR', 'LEGAL_HEAD', 'ADMIN'),
  createLegalCase
);

/**
 * @route   PATCH /api/v1/legal/:id
 * @desc    Update legal case details / status
 * @access  Private (LEGAL_HEAD, ADMIN)
 */
legalRouter.patch(
  '/:id',
  authorizeRoles('LEGAL_HEAD', 'ADMIN'),
  updateLegalCase
);

/**
 * @route   POST /api/v1/legal/:id/notices
 * @desc    Issue / record a statutory legal notice
 * @access  Private (LEGAL_HEAD, ADMIN)
 */
legalRouter.post(
  '/:id/notices',
  authorizeRoles('LEGAL_HEAD', 'ADMIN'),
  issueLegalNotice
);

/**
 * @route   PATCH /api/v1/legal/:id/notices/:noticeId
 * @desc    Update legal notice response status & notes
 * @access  Private (LEGAL_HEAD, ADMIN)
 */
legalRouter.patch(
  '/:id/notices/:noticeId',
  authorizeRoles('LEGAL_HEAD', 'ADMIN'),
  updateLegalNoticeStatus
);

/**
 * @route   POST /api/v1/legal/:id/hearings
 * @desc    Record court hearing details & next hearing date
 * @access  Private (LEGAL_HEAD, ADMIN)
 */
legalRouter.post(
  '/:id/hearings',
  authorizeRoles('LEGAL_HEAD', 'ADMIN'),
  recordHearing
);

/**
 * @route   POST /api/v1/legal/:id/write-off
 * @desc    Execute formal debt write-off on uncollectible case
 * @access  Private (LEGAL_HEAD, ADMIN)
 */
legalRouter.post(
  '/:id/write-off',
  authorizeRoles('LEGAL_HEAD', 'ADMIN'),
  executeWriteOff
);

export default legalRouter;
