import mongoose, { Schema } from 'mongoose';
import type { IUser } from '../types';

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    profileImage: {
      url: { type: String },
      publicId: { type: String },
    },
    role: { type: String, default: 'CUSTOMER', enum: ['CUSTOMER'] },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    preferredLanguage: { type: String, enum: ['en', 'hi'], default: 'en' },
    pushToken: { type: String, trim: true },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes (phone is unique, email is sparse — both auto-indexed)

export const User = mongoose.model<IUser>('User', UserSchema);
