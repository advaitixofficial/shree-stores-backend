import { Request, Response, NextFunction } from 'express';
import { NotificationService, ADMIN_RECIPIENT_ID } from '../services/notification.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/helpers';

export class NotificationController {
  // ---- Customer Facing ----

  static async getCustomerNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await NotificationService.getCustomerNotifications(req.userId!, page, limit);
      sendPaginated(res, result.notifications, result.pagination, 'Notifications fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const notification = await NotificationService.markAsRead(req.params.id, req.userId!);
      sendSuccess(res, notification, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      await NotificationService.markAllAsRead(req.userId!);
      sendSuccess(res, null, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  // ---- Admin Facing ----

  static async getAdminNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await NotificationService.getAdminNotifications(page, limit);
      sendPaginated(res, result.notifications, result.pagination, 'Admin notifications fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async markAdminAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const notification = await NotificationService.markAsRead(req.params.id, ADMIN_RECIPIENT_ID);
      sendSuccess(res, notification, 'Admin notification marked as read');
    } catch (error) {
      next(error);
    }
  }
}
