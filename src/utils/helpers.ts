// ============================================================
// Shree Stores Backend — Helper Utilities
// ============================================================

import { env } from '../config/env';
import { DEFAULT_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT } from '../constants';

/**
 * Generate a URL-friendly slug from a string.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a numeric OTP of configured length.
 */
export function generateOtp(): string {
  const length = env.OTP_LENGTH;
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

/**
 * Parse and sanitize pagination query parameters.
 */
export function parsePagination(query: {
  page?: string | number;
  limit?: string | number;
}): { page: number; limit: number; skip: number } {
  let page = parseInt(String(query.page || '1'), 10);
  let limit = parseInt(String(query.limit || DEFAULT_PAGINATION_LIMIT), 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = DEFAULT_PAGINATION_LIMIT;
  if (limit > MAX_PAGINATION_LIMIT) limit = MAX_PAGINATION_LIMIT;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

/**
 * Parse sort string into Mongoose sort object.
 * Example: "-createdAt,name" → { createdAt: -1, name: 1 }
 */
export function parseSort(
  sortStr: string | undefined,
  allowedFields: string[]
): Record<string, 1 | -1> {
  if (!sortStr) return { createdAt: -1 };

  const sortObj: Record<string, 1 | -1> = {};
  const fields = sortStr.split(',');

  for (const field of fields) {
    const trimmed = field.trim();
    if (!trimmed) continue;

    const isDescending = trimmed.startsWith('-');
    const fieldName = isDescending ? trimmed.slice(1) : trimmed;

    if (allowedFields.includes(fieldName)) {
      sortObj[fieldName] = isDescending ? -1 : 1;
    }
  }

  return Object.keys(sortObj).length > 0 ? sortObj : { createdAt: -1 };
}

/**
 * Build pagination metadata.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Sanitize string for safe MongoDB text operations.
 * Prevents NoSQL injection via regex special chars.
 */
export function sanitizeSearch(query: string): string {
  return query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remove undefined/null values from an object (shallow).
 */
export function cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      (cleaned as Record<string, unknown>)[key] = value;
    }
  }
  return cleaned;
}

/**
 * Normalize phone number to a consistent format.
 * Strips all non-digit characters and standardizes it.
 * Defaults to prepending +91 for 10-digit Indian numbers.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length > 10) {
    return `+${digits}`;
  }
  return phone;
}
