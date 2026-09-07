import { Router } from 'express';
import {
  getLoans,
  getLoanSummary,
  getMyAssignedLoans,
  getLoanById,
  createLoan,
  updateLoan,
  batchRecalculateDPD,
  deleteLoan,
} from '../controllers/loanController.js';
import { WorkloadController } from '../controllers/workloadController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const loanRouter = Router();

// Authentication required for all loan endpoints
loanRouter.use(authenticate);

/**
 * @route   GET /api/v1/loans/summary
 * @desc    Get aggregate loan portfolio metrics & bucket breakdown
 * @access  Private (ADMIN, SUPERVISOR, LEGAL_HEAD)
 */
loanRouter.get('/summary', authorizeRoles('ADMIN', 'SUPERVISOR', 'LEGAL_HEAD'), getLoanSummary);

/**
 * @route   GET /api/v1/loans/my-assigned
 * @desc    Get loans assigned to the authenticated collection agent
 * @access  Private (AGENT, SUPERVISOR, ADMIN)
 */
loanRouter.get('/my-assigned', authorizeRoles('AGENT', 'SUPERVISOR', 'ADMIN'), getMyAssignedLoans);

/**
 * @route   POST /api/v1/loans/recalculate-dpd
 * @desc    Batch recalculate DPD and bucket classification
 * @access  Private (ADMIN, SUPERVISOR)
 */
loanRouter.post('/recalculate-dpd', authorizeRoles('ADMIN', 'SUPERVISOR'), batchRecalculateDPD);

/**
 * @route   GET /api/v1/loans
 * @desc    Get paginated loans with multi-criteria filters
 * @access  Private (ADMIN, SUPERVISOR, LEGAL_HEAD, AGENT)
 */
loanRouter.get('/', authorizeRoles('ADMIN', 'SUPERVISOR', 'LEGAL_HEAD', 'AGENT'), getLoans);

/**
 * @route   GET /api/v1/loans/:id
 * @desc    Get single loan account details
 * @access  Private (ADMIN, SUPERVISOR, LEGAL_HEAD, AGENT)
 */
loanRouter.get('/:id', authorizeRoles('ADMIN', 'SUPERVISOR', 'LEGAL_HEAD', 'AGENT'), getLoanById);


/**
 * @route   POST /api/v1/loans
 * @desc    Create new loan account
 * @access  Private (ADMIN, SUPERVISOR)
 */
loanRouter.post('/', authorizeRoles('ADMIN', 'SUPERVISOR'), createLoan);

/**
 * @route   PATCH /api/v1/loans/:id
 * @desc    Update loan account details and recalculate DPD
 * @access  Private (ADMIN, SUPERVISOR)
 */
loanRouter.patch('/:id', authorizeRoles('ADMIN', 'SUPERVISOR'), updateLoan);

/**
 * @route   POST /api/v1/loans/:id/assign
 * @desc    Assign a loan account to an active collection agent
 * @access  Private (ADMIN, SUPERVISOR)
 */
loanRouter.post('/:id/assign', authorizeRoles('ADMIN', 'SUPERVISOR'), WorkloadController.assignLoan);

/**
 * @route   PATCH /api/v1/loans/:id/reassign
 * @desc    Reassign a loan account to a different collection agent
 * @access  Private (ADMIN, SUPERVISOR)
 */
loanRouter.patch('/:id/reassign', authorizeRoles('ADMIN', 'SUPERVISOR'), WorkloadController.reassignLoan);

/**
 * @route   PATCH /api/v1/loans/:id/unassign
 * @desc    Unassign a loan account from its collection agent
 * @access  Private (ADMIN, SUPERVISOR)
 */
loanRouter.patch('/:id/unassign', authorizeRoles('ADMIN', 'SUPERVISOR'), WorkloadController.unassignLoan);

/**
 * @route   DELETE /api/v1/loans/:id
 * @desc    Close / deactivate loan account
 * @access  Private (ADMIN)
 */
loanRouter.delete('/:id', authorizeRoles('ADMIN'), deleteLoan);

export default loanRouter;
