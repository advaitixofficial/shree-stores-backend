import mongoose, { Schema } from 'mongoose';
import type { IPayment } from '../types';

const PaymentSchema = new Schema<IPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    provider: { type: String, required: true, default: 'COD' }, // 'COD', 'RAZORPAY', etc.
    providerPaymentId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING' },
    method: { type: String, enum: ['COD', 'ONLINE'], required: true },
    metadata: { type: Schema.Types.Mixed },
    paidAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

PaymentSchema.index({ order: 1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
