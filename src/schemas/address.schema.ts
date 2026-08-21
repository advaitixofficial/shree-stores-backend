import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const addressBaseSchema = z.object({
  label: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
  fullName: z.string().min(2).max(50),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  addressLine1: z.string().min(5).max(100),
  addressLine2: z.string().max(100).optional(),
  landmark: z.string().max(50).optional(),
  city: z.string().min(2).max(50),
  state: z.string().min(2).max(50),
  postalCode: z.string().min(4).max(10),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isDefault: z.boolean().default(false),
});

export const createAddressSchema = z.object({
  body: addressBaseSchema,
});

export const updateAddressSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex),
  }),
  body: addressBaseSchema.partial(),
});
