// ============================================================
// Shree Stores Backend — Environment Configuration
// Validates and exports all environment variables using Zod.
// ============================================================

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),

  // MongoDB
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),

  // Store Info
  STORE_NAME: z.string().default('Shree Stores'),
  STORE_PHONE: z.string().default(''),
  STORE_EMAIL: z.string().default(''),
  STORE_ADDRESS: z.string().default(''),

  // Store Location
  STORE_LATITUDE: z.coerce.number().default(25.2677),
  STORE_LONGITUDE: z.coerce.number().default(82.9913),

  // Delivery
  DEFAULT_DELIVERY_RADIUS_KM: z.coerce.number().default(5),
  DEFAULT_DELIVERY_FEE: z.coerce.number().default(0),
  DEFAULT_FREE_DELIVERY_MINIMUM: z.coerce.number().default(0),

  // OTP
  OTP_EXPIRY_MINUTES: z.coerce.number().default(5),
  OTP_LENGTH: z.coerce.number().default(6),

  // SMS (Fast2SMS)
  FAST2SMS_API_KEY: z.string().default(''),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),

  // CORS
  CORS_ORIGIN: z.string().default('*'),

  // Admin Seed
  ADMIN_SEED_EMAIL: z.string().default('admin@shreestores.com'),
  ADMIN_SEED_PASSWORD: z.string().default('Admin@123456'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isDev = env.NODE_ENV === 'development';
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
