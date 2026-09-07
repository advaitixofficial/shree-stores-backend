import mongoose, { Schema } from 'mongoose';
import type { IProduct } from '../types';

const ImageAssetSchema = new Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
}, { _id: false });

const VariantSchema = new Schema({
  unit: { type: String, required: true, trim: true },
  unitValue: { type: Number, required: true },
  price: { type: Number, required: true, min: 0 },
  mrp: { type: Number, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  sku: { type: String, trim: true },
  isAvailable: { type: Boolean, default: true },
  discountType: { type: String, enum: ['PERCENTAGE', 'FIXED'] },
  discountValue: { type: Number, min: 0 },
});

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
    
    // Legacy fields
    sku: { type: String, trim: true }, // Removed required & unique constraint because multiple variants will have skus
    unit: { type: String, trim: true }, 
    unitValue: { type: Number, default: 1 }, 
    price: { type: Number, min: 0 },
    mrp: { type: Number, min: 0 },
    discountType: { type: String, enum: ['PERCENTAGE', 'FIXED'] },
    discountValue: { type: Number, min: 0 },
    stock: { type: Number, min: 0, default: 0 },
    
    // New Variants array
    variants: [VariantSchema],

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
