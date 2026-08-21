import mongoose, { Schema } from 'mongoose';
import type { ICategory } from '../types';

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    nameHindi: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    descriptionHindi: { type: String, trim: true },
    image: {
      url: { type: String },
      publicId: { type: String },
    },
    icon: { type: String },
    color: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    productCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// Indexes (slug index is auto-created by unique:true)
CategorySchema.index({ sortOrder: 1 });

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
