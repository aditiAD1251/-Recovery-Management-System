import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/user.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to endpoints based on allowed user roles.
 *
 * @param allowedRoles One or more UserRoles permitted to access the route
 */
export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required before checking authorization.', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Access denied. Role '${req.user.role}' is not authorized to access this resource. Required role(s): ${allowedRoles.join(', ')}`,
        403
      );
      return;
    }

    next();
  };
};
