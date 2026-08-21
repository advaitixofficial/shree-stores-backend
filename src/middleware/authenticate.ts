import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../utils/errors';
import { User } from '../models/User';
import { Admin } from '../models/Admin';
import type { JwtAccessPayload } from '../types';

/**
 * Extract token from Authorization header or query.
 */
function extractToken(req: Request): string | null {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.query.token && typeof req.query.token === 'string') {
    return req.query.token;
  }
  return null;
}

/**
 * Authenticate customer requests.
 */
export async function authenticateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
    if (decoded.role !== 'CUSTOMER') {
      throw new UnauthorizedError('Invalid token role');
    }

    // Verify user still exists and is active
    const user = await User.findById(decoded.sub).select('isActive').lean();
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    req.userId = decoded.sub;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
}

/**
 * Authenticate admin requests.
 */
export async function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new UnauthorizedError('Authentication token missing');
    }

    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtAccessPayload;
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(decoded.role)) {
      throw new UnauthorizedError('Invalid admin token');
    }

    // Verify admin still exists and is active
    const admin = await Admin.findById(decoded.sub).select('isActive role permissions').lean();
    if (!admin) {
      throw new UnauthorizedError('Admin not found');
    }
    if (!admin.isActive) {
      throw new UnauthorizedError('Admin account is inactive');
    }
    if (admin.role !== decoded.role) {
      throw new UnauthorizedError('Role mismatch');
    }

    req.adminId = decoded.sub;
    req.adminRole = decoded.role;
    req.adminPermissions = admin.permissions;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
}
