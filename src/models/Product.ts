import mongoose, { Schema } from 'mongoose';
import type { IProduct } from '../types';

const ImageAssetSchema = new Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
}, { _id: false });

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    nameHindi: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    descriptionHindi: { type: String, trim: true },
    images: [ImageAssetSchema],
    thumbnail: ImageAssetSchema,
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    unit: { type: String, required: true, trim: true }, // e.g., 'kg', 'g', 'L', 'piece'
    unitValue: { type: Number, required: true, default: 1 }, // e.g., 1, 500, 1.5
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, min: 0 },
    discountType: { type: String, enum: ['PERCENTAGE', 'FIXED'] },
    discountValue: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, required: true, default: 5 },
    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    searchKeywords: [{ type: String, trim: true, lowercase: true }],
  },
  {
    timestamps: true,
  }
);

// Indexes (slug & sku indexes are auto-created by unique:true)
ProductSchema.index({ category: 1 });
ProductSchema.index({ isActive: 1, isAvailable: 1 });
ProductSchema.index({ isFeatured: 1 });
ProductSchema.index(
  { name: 'text', nameHindi: 'text', brand: 'text', searchKeywords: 'text' },
  { weights: { name: 10, nameHindi: 10, searchKeywords: 5, brand: 3 } }
);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
