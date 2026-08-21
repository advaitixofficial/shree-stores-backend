// ============================================================
// Shree Stores Backend — Structured Logger (Pino)
// ============================================================

import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  // Never log sensitive data
  redact: {
    paths: [
      'password',
      'passwordHash',
      ...(isProduction ? ['otp'] : []),
      'token',
      'accessToken',
      'refreshToken',
      'authorization',
      'req.headers.authorization',
    ],
    censor: '[REDACTED]',
  },
});
