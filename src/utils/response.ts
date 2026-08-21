// ============================================================
// Shree Stores Backend — Standardized API Response Helpers
// ============================================================

import { Response } from 'express';
import type { PaginationMeta } from '../types';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200
): void {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  message = 'Success'
): void {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination,
  });
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  errors: string[] = []
): void {
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
  });
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message = 'Created successfully'
): void {
  sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
