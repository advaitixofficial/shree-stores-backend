import mongoose, { Schema } from 'mongoose';
import type { IReview } from '../types';

const ReviewSchema = new Schema<IReview>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
    isApproved: { type: Boolean, default: false }, // Moderation
  },
  {
    timestamps: true,
  }
);

ReviewSchema.index({ product: 1, isApproved: 1 });
ReviewSchema.index({ user: 1, product: 1 }, { unique: true }); // One review per product per user

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
