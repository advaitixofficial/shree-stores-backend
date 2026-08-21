import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import { BadRequestError } from '../utils/errors';

export class UserController {
  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const user = await UserService.getProfile(userId);
      sendSuccess(res, user, 'Profile fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const user = await UserService.updateProfile(userId, req.body);
      sendSuccess(res, user, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      if (!req.file) throw new BadRequestError('No image file provided');
      
      const user = await UserService.uploadProfileImage(userId, req.file.buffer);
      sendSuccess(res, user, 'Profile image updated');
    } catch (error) {
      next(error);
    }
  }
}
