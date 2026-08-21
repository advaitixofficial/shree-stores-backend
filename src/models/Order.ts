import mongoose, { Schema } from 'mongoose';
import type { IOrder } from '../types';

const OrderItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, required: true },
  productName: { type: String, required: true },
  productNameHindi: { type: String, required: true },
  image: {
    url: String,
    publicId: String,
  },
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String, required: true },
  price: { type: Number, required: true },
  mrp: { type: Number, required: true },
  total: { type: Number, required: true },
}, { _id: false });

const OrderAddressSchema = new Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: String,
  landmark: String,
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
}, { _id: false });

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemSchema],
    shippingAddress: OrderAddressSchema,
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, required: true },
    total: { type: Number, required: true },
    coupon: { type: Schema.Types.ObjectId, ref: 'Coupon' },
    paymentMethod: { type: String, enum: ['COD', 'ONLINE'], required: true },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING' },
    orderStatus: {
      type: String,
      enum: [
        'PLACED',
        'ACCEPTED',
        'REJECTED',
        'PREPARING',
        'READY',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
      ],
      default: 'PLACED',
    },
    assignedEmployee: { type: Schema.Types.ObjectId, ref: 'Employee' },
    notes: { type: String },
    cancelReason: { type: String },
    cancelledBy: { type: String }, // 'USER' | 'ADMIN'
    cancelledAt: Date,
    acceptedAt: Date,
    preparingAt: Date,
    readyAt: Date,
    outForDeliveryAt: Date,
    deliveredAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes (orderNumber index is auto-created by unique:true)
OrderSchema.index({ user: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ assignedEmployee: 1 });

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
