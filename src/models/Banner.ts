import mongoose, { Schema } from 'mongoose';
import type { IBanner } from '../types';

const BannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: true, trim: true },
    titleHindi: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    descriptionHindi: { type: String, trim: true },
    image: {
      url: { type: String },
      publicId: { type: String },
    },
    backgroundColor: { type: String },
    textColor: { type: String },
    linkType: { type: String }, // e.g., 'PRODUCT', 'CATEGORY', 'URL'
    linkValue: { type: String },
    sortOrder: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

BannerSchema.index({ isActive: 1, sortOrder: 1 });

export const Banner = mongoose.model<IBanner>('Banner', BannerSchema);
