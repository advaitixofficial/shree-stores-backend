import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const addressBaseSchema = z.object({
  label: z.enum(['HOME', 'WORK', 'OTHER']).default('HOME'),
  fullName: z.string().min(1).max(100),
  phone: z.string().min(10).max(15),
  addressLine1: z.string().max(100).optional().or(z.literal('')),
  addressLine2: z.string().max(100).optional().or(z.literal('')),
  landmark: z.string().max(100).optional().or(z.literal('')),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
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
