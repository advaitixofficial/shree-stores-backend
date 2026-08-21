import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../utils/errors';
import type { AdminRole } from '../types';
import type { Permission } from '../constants';

/**
 * Middleware to require specific admin roles.
 * Must be used AFTER authenticateAdmin.
 */
export function requireRole(allowedRoles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.adminRole) {
      return next(new ForbiddenError('Admin authentication required'));
    }

    if (!allowedRoles.includes(req.adminRole as AdminRole)) {
      return next(new ForbiddenError('Insufficient role privileges'));
    }

    next();
  };
}

/**
 * Middleware to require a specific permission.
 * Must be used AFTER authenticateAdmin.
 * SUPER_ADMIN bypasses all permission checks.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.adminRole || !req.adminPermissions) {
      return next(new ForbiddenError('Admin authentication required'));
    }

    // SUPER_ADMIN has implicit full access
    if (req.adminRole === 'SUPER_ADMIN') {
      return next();
    }

    // Check if admin has the specific permission
    if (!req.adminPermissions.includes(permission)) {
      return next(new ForbiddenError(`Missing required permission: ${permission}`));
    }

    next();
  };
}
