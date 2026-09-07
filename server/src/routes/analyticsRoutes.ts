import { Router } from 'express';
import {
  getAdminAnalyticsController,
  getSupervisorAnalyticsController,
  getAgentAnalyticsController,
  getLegalAnalyticsController,
  getReportController,
} from '../controllers/analyticsController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const router = Router();

// Apply global authentication to all analytics routes
router.use(authenticate);

/**
 * @route   GET /api/v1/analytics/admin
 * @desc    Global executive loan portfolio analytics & aggregations
 * @access  Private (ADMIN)
 */
router.get('/admin', authorizeRoles('ADMIN'), getAdminAnalyticsController);

/**
 * @route   GET /api/v1/analytics/supervisor
 * @desc    Supervisor territory & team workload analytics
 * @access  Private (SUPERVISOR, ADMIN)
 */
router.get(
  '/supervisor',
  authorizeRoles('SUPERVISOR', 'ADMIN'),
  getSupervisorAnalyticsController
);

/**
 * @route   GET /api/v1/analytics/agent
 * @desc    Agent personal portfolio, attempts & PTP performance analytics
 * @access  Private (AGENT)
 */
router.get('/agent', authorizeRoles('AGENT'), getAgentAnalyticsController);

/**
 * @route   GET /api/v1/analytics/legal
 * @desc    Legal recovery & litigation operations analytics
 * @access  Private (LEGAL_HEAD, ADMIN)
 */
router.get('/legal', authorizeRoles('LEGAL_HEAD', 'ADMIN'), getLegalAnalyticsController);

/**
 * @route   GET /api/v1/analytics/reports/:reportType
 * @desc    Generate executive reports with on-screen data or downloadable CSV
 * @access  Private (ADMIN, SUPERVISOR, LEGAL_HEAD)
 */
router.get(
  '/reports/:reportType',
  authorizeRoles('ADMIN', 'SUPERVISOR', 'LEGAL_HEAD'),
  getReportController
);

export default router;
