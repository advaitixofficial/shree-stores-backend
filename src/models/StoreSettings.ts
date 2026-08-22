import mongoose, { Schema } from 'mongoose';
import type { IStoreSettings } from '../types';

const StoreSettingsSchema = new Schema<IStoreSettings>(
  {
    storeName: { type: String, required: true, default: 'Shree Stores' },
    storeNameHindi: { type: String, required: true, default: 'श्री स्टोर्स' },
    logo: {
      url: String,
      publicId: String,
    },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    
    // Delivery Configuration
    deliveryEnabled: { type: Boolean, default: true },
    deliveryRadiusKm: { type: Number, required: true, default: 40 },
    deliveryFee: { type: Number, required: true, default: 0 }, // Base fallback fee
    deliveryTiers: {
      type: [
        {
          maxDistance: { type: Number, required: true },
          fee: { type: Number, required: true }
        }
      ],
      default: [
        { maxDistance: 20, fee: 30 },
        { maxDistance: 30, fee: 40 },
        { maxDistance: 40, fee: 50 },
      ]
    },
    freeDeliveryMinimum: { type: Number, required: true, default: 300 },
    estimatedDeliveryMinutes: { type: Number, required: true, default: 45 },
    
    // Formatting
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    
    // Support
    supportPhone: String,
    supportEmail: String,
    
    // Feature Flags
    onlinePaymentEnabled: { type: Boolean, default: false },
    codEnabled: { type: Boolean, default: true },
    reviewsEnabled: { type: Boolean, default: true },
    couponsEnabled: { type: Boolean, default: true },
    notificationsEnabled: { type: Boolean, default: true },
    
    // COD Limits
    codMinimumOrder: { type: Number, default: 0 },
    codMaximumOrder: { type: Number, default: 5000 },
  },
  {
    timestamps: true,
  }
);

export const StoreSettings = mongoose.model<IStoreSettings>('StoreSettings', StoreSettingsSchema);
