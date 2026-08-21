import mongoose, { Schema } from 'mongoose';
import type { IEmployee } from '../types';

const EmployeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, unique: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    photo: {
      url: { type: String },
      publicId: { type: String },
    },
    role: { type: String, enum: ['DELIVERY_EMPLOYEE', 'STORE_EMPLOYEE'], required: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    availability: { type: String, enum: ['AVAILABLE', 'BUSY'], default: 'AVAILABLE' },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes (phone index is auto-created by unique:true)
EmployeeSchema.index({ status: 1, availability: 1, role: 1 });

export const Employee = mongoose.model<IEmployee>('Employee', EmployeeSchema);
