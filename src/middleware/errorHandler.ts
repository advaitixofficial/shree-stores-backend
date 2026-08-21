import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';
import mongoose from 'mongoose';
import { isProd } from '../config/env';

/**
 * Global Error Handler Middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: string[] = [];

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    if ('errors' in err && Array.isArray(err.errors)) {
      errors = err.errors;
    }
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 422;
    message = 'Database validation failed';
    errors = Object.values(err.errors).map((e) => e.message);
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if ((err as any).code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    const field = Object.keys((err as any).keyValue)[0];
    message = `Duplicate value for field: ${field}`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Log error
  if (statusCode >= 500) {
    logger.error({ err, req: { method: req.method, url: req.url, ip: req.ip } }, 'Unhandled Exception');
  } else {
    logger.debug({ err: err.message, status: statusCode }, 'Operational Error');
  }

  // Hide stack trace in production
  if (!isProd && statusCode === 500) {
    errors.push(err.stack || '');
  }

  sendError(res, message, statusCode, errors);
}
