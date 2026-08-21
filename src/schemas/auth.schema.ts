import { z } from 'zod';

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2, 'First name is too short').max(50),
    lastName: z.string().min(2, 'Last name is too short').max(50),
    registrationToken: z.string().min(1, 'Registration token is required'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    preferredLanguage: z.enum(['en', 'hi']).default('en'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(50).optional(),
    lastName: z.string().min(2).max(50).optional(),
    email: z.string().email().optional().or(z.literal('')),
    preferredLanguage: z.enum(['en', 'hi']).optional(),
  }),
});
