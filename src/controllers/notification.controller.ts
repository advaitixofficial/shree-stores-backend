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

  static async sendAdminPushNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, message } = req.body;
      
      // In a real app with Expo push tokens, we'd fetch all users' push tokens and send a broadcast.
      // For now, we broadcast to the general "CUSTOMER" topic via Socket.IO by omitting recipientId,
      // or we can save a global notification if our schema supported it. 
      // Since recipientId is required in the DB, to broadcast we'd ideally loop or just send a socket event.
      // However, our Notification model requires recipientId. 
      // Workaround: Use a broadcast '000000000000000000000000' for global customer notifications.
      
      const BROADCAST_ID = '000000000000000000000000';
      
      const notification = await NotificationService.createNotification({
        recipientType: 'CUSTOMER',
        recipientId: BROADCAST_ID,
        title,
        message,
        type: 'MARKETING_BROADCAST'
      });
      
      sendSuccess(res, notification, 'Broadcast notification sent successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}
