import { z } from 'zod';

export const createCouponSchema = z.object({
  body: z.object({
    code: z.string().min(3).max(20).toUpperCase(),
    description: z.string().optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.number().positive(),
    minimumOrderAmount: z.number().min(0).default(0),
    maximumDiscount: z.number().positive().optional(),
    usageLimit: z.number().min(0).default(0),
    perUserLimit: z.number().min(1).default(1),
    startDate: z.string().datetime().or(z.date()),
    endDate: z.string().datetime().or(z.date()),
    isActive: z.boolean().default(true),
  }).superRefine((data, ctx) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be after start date',
        path: ['endDate'],
      });
    }
    if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percentage discount cannot exceed 100',
        path: ['discountValue'],
      });
    }
  }),
});

export const validateCouponSchema = z.object({
  body: z.object({
    code: z.string().min(1),
  }),
});

export const updateCouponSchema = z.object({
  body: z.object({
    code: z.string().min(3).max(20).toUpperCase().optional(),
    description: z.string().optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    discountValue: z.number().positive().optional(),
    minimumOrderAmount: z.number().min(0).optional(),
    maximumDiscount: z.number().positive().optional(),
    usageLimit: z.number().min(0).optional(),
    perUserLimit: z.number().min(1).optional(),
    startDate: z.string().datetime().or(z.date()).optional(),
    endDate: z.string().datetime().or(z.date()).optional(),
    isActive: z.boolean().optional(),
  }).superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end <= start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'End date must be after start date',
          path: ['endDate'],
        });
      }
    }
    if (data.discountType === 'PERCENTAGE' && data.discountValue && data.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Percentage discount cannot exceed 100',
        path: ['discountValue'],
      });
    }
  }),
});
