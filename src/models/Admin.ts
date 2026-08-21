import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { IAdmin } from '../types';

const AdminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
    },
    permissions: [{ type: String }],
    profileImage: {
      url: { type: String },
      publicId: { type: String },
    },
    isActive: { type: Boolean, default: true },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes (email index is auto-created by unique:true)

// Methods
AdminSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Middleware
AdminSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

export const Admin = mongoose.model<IAdmin>('Admin', AdminSchema);
