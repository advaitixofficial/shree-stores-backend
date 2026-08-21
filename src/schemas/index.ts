export * from './auth.schema';
export * from './admin.schema';
export * from './product.schema';
export * from './category.schema';
export * from './cart.schema';
export * from './address.schema';
export * from './order.schema';
export * from './coupon.schema';
export * from './employee.schema';
export * from './banner.schema';
export * from './settings.schema';

import { z } from 'zod';

export const paginationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    sort: z.string().optional(),
  }),
});
