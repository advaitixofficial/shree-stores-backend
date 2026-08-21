import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    nameHindi: z.string().min(2),
    description: z.string().optional(),
    descriptionHindi: z.string().optional(),
    sortOrder: z.coerce.number().default(0),
    isActive: z.coerce.boolean().default(true),
    icon: z.string().optional(),
    color: z.string().optional(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex),
  }),
  body: createCategorySchema.shape.body.partial(),
});
