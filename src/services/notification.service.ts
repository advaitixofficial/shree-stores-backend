// ============================================================
// Shree Stores Backend — Notification Service
// Handles notification creation, querying, and realtime dispatch.
// ============================================================

import { Notification } from '../models/Notification';
import { getIO } from '../config/socket';
import { logger } from '../utils/logger';
import { buildPaginationMeta } from '../utils/helpers';
import mongoose from 'mongoose';

// Static ID for general Admin notifications
export const ADMIN_RECIPIENT_ID = new mongoose.Types.ObjectId('000000000000000000000000');

export class NotificationService {
  /**
   * Create a notification and dispatch it in real-time via sockets.
   */
  static async createNotification(data: {
    recipientType: 'CUSTOMER' | 'ADMIN';
    recipientId?: string | mongoose.Types.ObjectId;
    title: string;
    titleHindi?: string;
    message: string;
    messageHindi?: string;
    type: string;
    payload?: any;
  }) {
    try {
      const recipientId = data.recipientType === 'ADMIN'
        ? ADMIN_RECIPIENT_ID
        : new mongoose.Types.ObjectId(data.recipientId as string);

      const notification = await Notification.create({
        recipientType: data.recipientType,
        recipientId,
        title: data.title,
        titleHindi: data.titleHindi,
        message: data.message,
        messageHindi: data.messageHindi,
        type: data.type,
        data: data.payload,
      });

      // Dispatch via Socket.IO
      try {
        const io = getIO();
        if (data.recipientType === 'CUSTOMER') {
          io.to(`user:${recipientId.toString()}`).emit('notification', notification);
        } else {
          io.to('admin:orders').emit('notification', notification);
        }
      } catch (socketErr) {
        logger.warn({ err: socketErr }, 'Socket dispatch failed for notification (socket server might not be running in tests)');
      }

      return notification;
    } catch (err) {
      logger.error({ err }, 'Failed to create notification');
      return null;
    }
  }

  /**
   * Get paginated customer notifications.
   */
  static async getCustomerNotifications(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const BROADCAST_ID = new mongoose.Types.ObjectId('000000000000000000000000');
    const query = {
      recipientType: 'CUSTOMER',
      $or: [{ recipientId: userId }, { recipientId: BROADCAST_ID }]
    };

    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    return { notifications, pagination: buildPaginationMeta(total, page, limit) };
  }

  /**
   * Get paginated admin notifications.
   */
  static async getAdminNotifications(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      Notification.find({ recipientType: 'ADMIN' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ recipientType: 'ADMIN' }),
    ]);

    return { notifications, pagination: buildPaginationMeta(total, page, limit) };
  }

  /**
   * Mark a notification as read.
   */
  static async markAsRead(id: string, recipientId?: string | mongoose.Types.ObjectId) {
    const query: any = { _id: id };
    if (recipientId) {
      query.recipientId = recipientId;
    }

    const notification = await Notification.findOneAndUpdate(query, { $set: { isRead: true } }, { new: true }).lean();
    return notification;
  }

  /**
   * Mark all notifications as read.
   */
  static async markAllAsRead(recipientId: string | mongoose.Types.ObjectId) {
    await Notification.updateMany({ recipientId, isRead: false }, { $set: { isRead: true } });
  }

  /**
   * Delete all notifications for a recipient.
   * Note: This only deletes personal notifications. Broadcasts are not deleted for the global recipientId,
   * but we can just mark them as deleted for the specific user in a more advanced schema.
   * For this simple schema, we just delete personal ones.
   */
  static async deleteAll(recipientId: string | mongoose.Types.ObjectId) {
    await Notification.deleteMany({ recipientId });
  }
}
