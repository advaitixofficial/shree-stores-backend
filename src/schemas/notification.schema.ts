import { z } from 'zod';

export const createNotificationSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
    message: z.string().min(1, 'Message is required').max(500, 'Message is too long'),
  }),
});
