import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createEmployeeSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
    email: z.string().email().optional().or(z.literal('')),
    role: z.enum(['DELIVERY_EMPLOYEE', 'STORE_EMPLOYEE']),
    status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    availability: z.enum(['AVAILABLE', 'BUSY']).default('AVAILABLE'),
    notes: z.string().optional(),
  }),
});

export const updateEmployeeSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex),
  }),
  body: createEmployeeSchema.shape.body.partial(),
});
