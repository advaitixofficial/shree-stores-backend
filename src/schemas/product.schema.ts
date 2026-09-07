import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const variantSchema = z.object({
  unit: z.string().min(1),
  unitValue: z.coerce.number().positive(),
  price: z.coerce.number().min(0),
  mrp: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0),
  sku: z.string().optional(),
});

export const createProductBaseSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    nameHindi: z.string().optional(),
    description: z.string().optional(),
    descriptionHindi: z.string().optional(),
    category: z.string().regex(objectIdRegex, 'Invalid category ID'),
    brand: z.string().optional(),
    variants: z.array(variantSchema).min(1, 'At least one variant is required').optional(), // made optional to handle parsing later, but controller validates it
    discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    discountValue: z.coerce.number().min(0).optional(),
    lowStockThreshold: z.coerce.number().min(0).default(5),
    isAvailable: z.coerce.boolean().default(true),
    isFeatured: z.coerce.boolean().default(false),
    isActive: z.coerce.boolean().default(true),
    searchKeywords: z.union([z.string(), z.array(z.string())]).optional(),
  })
});

export const createProductSchema = createProductBaseSchema.superRefine((data, ctx) => {
  if (data.body.discountType === 'PERCENTAGE' && data.body.discountValue && data.body.discountValue > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Percentage discount cannot exceed 100',
      path: ['body', 'discountValue'],
    });
  }
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex),
  }),
  body: createProductBaseSchema.shape.body.partial(),
});

export const updateStockSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex),
  }),
  body: z.object({
    variantId: z.string().regex(objectIdRegex, 'Invalid variant ID'),
    stock: z.number().min(0),
  }),
});

export const searchProductSchema = z.object({
  query: z.object({
    q: z.string().min(1).optional(),
    category: z.string().regex(objectIdRegex).optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    sort: z.string().optional(),
  }),
});
