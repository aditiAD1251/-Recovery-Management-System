import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/authMiddleware.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';
import { sendSuccess } from '../utils/apiResponse.js';

const testRouter = Router();

/**
 * Minimal test routes to verify RBAC enforcement
 */
testRouter.get(
  '/admin',
  authenticate,
  authorizeRoles('ADMIN'),
  (req: Request, res: Response) => {
    sendSuccess(res, 'Admin access granted', { user: req.user });
  }
);

testRouter.get(
  '/supervisor',
  authenticate,
  authorizeRoles('SUPERVISOR', 'ADMIN'),
  (req: Request, res: Response) => {
    sendSuccess(res, 'Supervisor access granted', { user: req.user });
  }
);

testRouter.get(
  '/agent',
  authenticate,
  authorizeRoles('AGENT'),
  (req: Request, res: Response) => {
    sendSuccess(res, 'Agent access granted', { user: req.user });
  }
);

testRouter.get(
  '/legal',
  authenticate,
  authorizeRoles('LEGAL_HEAD'),
  (req: Request, res: Response) => {
    sendSuccess(res, 'Legal Head access granted', { user: req.user });
  }
);

export default testRouter;
