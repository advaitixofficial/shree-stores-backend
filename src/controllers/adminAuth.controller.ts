import { Request, Response, NextFunction } from 'express';
import { AdminAuthService } from '../services/adminAuth.service';
import { sendSuccess } from '../utils/response';

export class AdminAuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const ip = req.ip || '';
      const userAgent = req.headers['user-agent'] || '';
      
      const result = await AdminAuthService.login(email, password, ip, userAgent);
      sendSuccess(res, result, 'Admin login successful');
    } catch (error) {
      next(error);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.adminId!;
      const admin = await AdminAuthService.getMe(adminId);
      sendSuccess(res, admin, 'Admin profile fetched');
    } catch (error) {
      next(error);
    }
  }
}
