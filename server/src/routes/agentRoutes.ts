import { Router } from 'express';
import {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
} from '../controllers/agentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const agentRouter = Router();

// Authentication required for all agent endpoints
agentRouter.use(authenticate);

/**
 * @route   GET /api/v1/agents
 * @desc    Get paginated collection agents
 * @access  Private (ADMIN, SUPERVISOR)
 */
agentRouter.get('/', authorizeRoles('ADMIN', 'SUPERVISOR'), getAgents);

/**
 * @route   GET /api/v1/agents/:id
 * @desc    Get collection agent by ID
 * @access  Private (ADMIN, SUPERVISOR)
 */
agentRouter.get('/:id', authorizeRoles('ADMIN', 'SUPERVISOR'), getAgentById);

/**
 * @route   POST /api/v1/agents
 * @desc    Create new collection agent profile
 * @access  Private (ADMIN)
 */
agentRouter.post('/', authorizeRoles('ADMIN'), createAgent);

/**
 * @route   PATCH /api/v1/agents/:id
 * @desc    Update existing collection agent profile
 * @access  Private (ADMIN)
 */
agentRouter.patch('/:id', authorizeRoles('ADMIN'), updateAgent);

/**
 * @route   DELETE /api/v1/agents/:id
 * @desc    Deactivate collection agent profile
 * @access  Private (ADMIN)
 */
agentRouter.delete('/:id', authorizeRoles('ADMIN'), deleteAgent);

export default agentRouter;
