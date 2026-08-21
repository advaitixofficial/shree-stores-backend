import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createBannerSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(100),
    titleHindi: z.string().min(2).max(100),
    description: z.string().optional(),
    descriptionHindi: z.string().optional(),
    backgroundColor: z.string().optional(),
    textColor: z.string().optional(),
    linkType: z.string().optional(),
    linkValue: z.string().optional(),
    sortOrder: z.coerce.number().default(0),
    startDate: z.string().datetime().or(z.date()).optional(),
    endDate: z.string().datetime().or(z.date()).optional(),
    isActive: z.coerce.boolean().default(true),
  }),
});

export const updateBannerSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex),
  }),
  body: createBannerSchema.shape.body.partial(),
});
