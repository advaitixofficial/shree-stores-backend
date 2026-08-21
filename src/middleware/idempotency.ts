import { Request, Response, NextFunction } from 'express';
import { IdempotencyKey } from '../models/IdempotencyKey';
import { logger } from '../utils/logger';

/**
 * Middleware to ensure a request is processed only once.
 * Requires client to send 'Idempotency-Key' header.
 * Useful for order creation to prevent duplicate charges/orders on network retry.
 */
export async function idempotency(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['idempotency-key'] as string;

  if (!key) {
    // If no key is provided, we can either reject or proceed normally.
    // For strictness on critical endpoints (like /orders), we could throw.
    // Here we allow proceed, but it won't be idempotent.
    return next();
  }

  try {
    // Try to create the key immediately with a placeholder status code (102 Processing)
    try {
      await IdempotencyKey.create({
        key,
        response: { status: 'processing' },
        statusCode: 102,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        const existing = await IdempotencyKey.findOne({ key }).lean();
        if (existing) {
          if (existing.statusCode === 102) {
            return res.status(409).json({
              success: false,
              message: 'Request already in progress. Please wait.',
            });
          }
          return res.status(existing.statusCode).json(existing.response);
        }
      }
      throw err;
    }

    let completed = false;
    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      completed = true;
      IdempotencyKey.updateOne(
        { key },
        { $set: { response: body, statusCode: res.statusCode } }
      ).catch((dbErr) => {
        logger.error({ err: dbErr, key }, 'Failed to save idempotency key');
      });

      return originalJson(body);
    };

    // Clean up the key if connection closes without completing
    res.on('close', () => {
      if (!completed) {
        logger.warn({ key }, 'Request terminated before completion — releasing idempotency lock');
        IdempotencyKey.deleteOne({ key }).catch((dbErr) => {
          logger.error({ err: dbErr, key }, 'Failed to delete failed idempotency key');
        });
      }
    });

    next();
  } catch (error) {
    // Clean up the key if an error occurred before next() or inside the route handler synchronously
    IdempotencyKey.deleteOne({ key }).catch((dbErr) => {
      logger.error({ err: dbErr, key }, 'Failed to clean up idempotency key on error');
    });
    next(error);
  }
}
