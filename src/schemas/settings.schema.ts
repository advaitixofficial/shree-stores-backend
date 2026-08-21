import { z } from 'zod';

export const updateStoreSettingsSchema = z.object({
  body: z.object({
    storeName: z.string().min(2).optional(),
    storeNameHindi: z.string().min(2).optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
    email: z.string().email().optional(),
    address: z.string().min(5).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    deliveryEnabled: z.boolean().optional(),
    deliveryRadiusKm: z.number().positive().optional(),
    deliveryFee: z.number().min(0).optional(),
    freeDeliveryMinimum: z.number().min(0).optional(),
    estimatedDeliveryMinutes: z.number().positive().optional(),
    currency: z.string().min(3).max(3).optional(),
    timezone: z.string().min(3).optional(),
    supportPhone: z.string().optional(),
    supportEmail: z.string().email().optional().or(z.literal('')),
    onlinePaymentEnabled: z.boolean().optional(),
    codEnabled: z.boolean().optional(),
    reviewsEnabled: z.boolean().optional(),
    couponsEnabled: z.boolean().optional(),
    notificationsEnabled: z.boolean().optional(),
    codMinimumOrder: z.number().min(0).optional(),
    codMaximumOrder: z.number().min(0).optional(),
  }),
});
