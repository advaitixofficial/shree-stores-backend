import { Admin } from '../models/Admin';
import { UnauthorizedError } from '../utils/errors';
import { AuthService } from './auth.service';
import { ADMIN_MAX_LOGIN_ATTEMPTS, ADMIN_LOCK_TIME_MINUTES } from '../constants';

export class AdminAuthService {
  /**
   * Admin Login with brute force protection.
   */
  static async login(email: string, password: string, _ip: string, _userAgent: string) {
    const admin = await Admin.findOne({ email });

    if (!admin) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!admin.isActive) {
      throw new UnauthorizedError('Admin account is disabled');
    }

    // Check account lockout
    if (admin.lockUntil && admin.lockUntil > new Date()) {
      throw new UnauthorizedError('Account temporarily locked due to too many failed attempts');
    }

    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      admin.loginAttempts += 1;
      if (admin.loginAttempts >= ADMIN_MAX_LOGIN_ATTEMPTS) {
        admin.lockUntil = new Date(Date.now() + ADMIN_LOCK_TIME_MINUTES * 60 * 1000);
      }
      await admin.save();
      throw new UnauthorizedError('Invalid credentials');
    }

    // Successful login — reset lock
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLoginAt = new Date();
    await admin.save();

    const tokenPair = AuthService.generateTokens(admin._id.toString(), admin.role);

    // Optional: Log admin login via AuditLogService (if you want to track logins)

    return {
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
      tokenPair,
    };
  }

  /**
   * Get Admin Profile.
   */
  static async getMe(adminId: string) {
    const admin = await Admin.findById(adminId).select('-passwordHash').lean();
    if (!admin) {
      throw new UnauthorizedError('Admin not found');
    }
    return admin;
  }
}
