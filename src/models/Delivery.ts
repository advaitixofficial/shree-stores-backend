import mongoose, { Schema } from 'mongoose';
import type { IDelivery } from '../types';

const DeliverySchema = new Schema<IDelivery>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    assignedAt: { type: Date, required: true },
    pickedUpAt: { type: Date },
    outForDeliveryAt: { type: Date },
    deliveredAt: { type: Date },
    status: {
      type: String,
      enum: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
      default: 'ASSIGNED',
    },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes (order index is auto-created by unique:true)
DeliverySchema.index({ employee: 1, status: 1 });

export const Delivery = mongoose.model<IDelivery>('Delivery', DeliverySchema);
