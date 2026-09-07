import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const addToCartSchema = z.object({
  body: z.object({
    productId: z.string().regex(objectIdRegex, 'Invalid product ID'),
    variantId: z.string().regex(objectIdRegex, 'Invalid variant ID'),
    quantity: z.number().int().positive('Quantity must be at least 1').max(50, 'Max 50 items allowed'),
  }),
});

export const updateCartItemSchema = z.object({
  params: z.object({
    productId: z.string().regex(objectIdRegex),
  }),
  body: z.object({
    variantId: z.string().regex(objectIdRegex, 'Invalid variant ID'),
    quantity: z.number().int().positive().max(50),
  }),
});
