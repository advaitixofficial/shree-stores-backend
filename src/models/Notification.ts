import mongoose, { Schema } from 'mongoose';
import type { INotification } from '../types';

const NotificationSchema = new Schema<INotification>(
  {
    recipientType: { type: String, enum: ['CUSTOMER', 'ADMIN'], required: true },
    recipientId: { type: Schema.Types.ObjectId, required: true }, // User or Admin ID (or arbitrary for global admin)
    title: { type: String, required: true },
    titleHindi: { type: String },
    message: { type: String, required: true },
    messageHindi: { type: String },
    type: { type: String, required: true }, // NotificationType enum
    data: { type: Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    deletedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

NotificationSchema.index({ recipientType: 1, recipientId: 1, isRead: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
