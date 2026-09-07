import { Router } from 'express';
import { WorkloadController } from '../controllers/workloadController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const workloadRouter = Router();

// Authentication required for all workload endpoints
workloadRouter.use(authenticate);

/**
 * @route   GET /api/v1/workload
 * @desc    Get high-level portfolio workload summary metrics
 * @access  Private (ADMIN, SUPERVISOR)
 */
workloadRouter.get(
  '/',
  authorizeRoles('ADMIN', 'SUPERVISOR'),
  WorkloadController.getWorkloadSummary
);

/**
 * @route   GET /api/v1/workload/agents
 * @desc    Get collection agents with current assigned workload statistics
 * @access  Private (ADMIN, SUPERVISOR)
 */
workloadRouter.get(
  '/agents',
  authorizeRoles('ADMIN', 'SUPERVISOR'),
  WorkloadController.getAgentWorkloads
);

/**
 * @route   GET /api/v1/workload/unassigned
 * @desc    Get queue of unassigned loan accounts requiring allocation
 * @access  Private (ADMIN, SUPERVISOR)
 */
workloadRouter.get(
  '/unassigned',
  authorizeRoles('ADMIN', 'SUPERVISOR'),
  WorkloadController.getUnassignedLoans
);

export default workloadRouter;
