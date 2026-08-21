import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { TooManyRequestsError } from '../utils/errors';

const createLimiter = (windowMs: number, max: number, message: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new TooManyRequestsError(message));
    },
  });

// General API rate limiter (e.g., 100 requests per 15 minutes)
export const globalLimiter = createLimiter(
  env.RATE_LIMIT_WINDOW_MS,
  env.RATE_LIMIT_MAX_REQUESTS,
  'Too many requests from this IP, please try again later.'
);

// Strict limit for sending OTPs (e.g., 5 requests per 15 minutes)
export const otpLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  'Too many OTP requests from this IP. Please try again after 15 minutes.'
);

// Strict limit for login attempts
export const loginLimiter = createLimiter(
  15 * 60 * 1000,
  10,
  'Too many login attempts. Please try again later.'
);

// Very strict limit for Admin login
export const adminLoginLimiter = createLimiter(
  15 * 60 * 1000,
  5,
  'Too many admin login attempts. Please try again later.'
);
