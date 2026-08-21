import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createOrderSchema = z.object({
  body: z.object({
    addressId: z.string().regex(objectIdRegex, 'Invalid address ID'),
    couponCode: z.string().optional(),
    paymentMethod: z.enum(['COD', 'ONLINE']),
    notes: z.string().max(200).optional(),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex),
  }),
  body: z.object({
    status: z.enum([
      'PLACED',
      'ACCEPTED',
      'REJECTED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ]),
  }),
});

export const cancelOrderSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex),
  }),
  body: z.object({
    reason: z.string().min(5).max(200),
  }),
});

export const assignEmployeeSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex),
  }),
  body: z.object({
    employeeId: z.string().regex(objectIdRegex),
  }),
});
