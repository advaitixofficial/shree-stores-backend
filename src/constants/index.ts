// ============================================================
// Shree Stores Backend — Constants & Enums
// ============================================================

import type { OrderStatus } from '../types';

// ---- Permissions ----

export const Permissions = {
  // Products
  PRODUCT_CREATE: 'PRODUCT_CREATE',
  PRODUCT_READ: 'PRODUCT_READ',
  PRODUCT_UPDATE: 'PRODUCT_UPDATE',
  PRODUCT_DELETE: 'PRODUCT_DELETE',
  // Categories
  CATEGORY_CREATE: 'CATEGORY_CREATE',
  CATEGORY_READ: 'CATEGORY_READ',
  CATEGORY_UPDATE: 'CATEGORY_UPDATE',
  CATEGORY_DELETE: 'CATEGORY_DELETE',
  // Orders
  ORDER_READ: 'ORDER_READ',
  ORDER_UPDATE: 'ORDER_UPDATE',
  ORDER_CANCEL: 'ORDER_CANCEL',
  ORDER_ASSIGN: 'ORDER_ASSIGN',
  // Inventory
  INVENTORY_READ: 'INVENTORY_READ',
  INVENTORY_UPDATE: 'INVENTORY_UPDATE',
  // Customers
  CUSTOMER_READ: 'CUSTOMER_READ',
  CUSTOMER_UPDATE: 'CUSTOMER_UPDATE',
  // Employees
  EMPLOYEE_CREATE: 'EMPLOYEE_CREATE',
  EMPLOYEE_READ: 'EMPLOYEE_READ',
  EMPLOYEE_UPDATE: 'EMPLOYEE_UPDATE',
  EMPLOYEE_DELETE: 'EMPLOYEE_DELETE',
  // Banners
  BANNER_CREATE: 'BANNER_CREATE',
  BANNER_UPDATE: 'BANNER_UPDATE',
  BANNER_DELETE: 'BANNER_DELETE',
  // Coupons
  COUPON_CREATE: 'COUPON_CREATE',
  COUPON_UPDATE: 'COUPON_UPDATE',
  COUPON_DELETE: 'COUPON_DELETE',
  // Reports
  REPORT_READ: 'REPORT_READ',
  // Settings
  SETTINGS_READ: 'SETTINGS_READ',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  // Admin management
  ADMIN_CREATE: 'ADMIN_CREATE',
  ADMIN_UPDATE: 'ADMIN_UPDATE',
  ADMIN_DELETE: 'ADMIN_DELETE',
  // Audit
  AUDIT_LOG_READ: 'AUDIT_LOG_READ',
  // Reviews
  REVIEW_READ: 'REVIEW_READ',
  REVIEW_MODERATE: 'REVIEW_MODERATE',
  // Notifications
  NOTIFICATION_READ: 'NOTIFICATION_READ',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

// ---- Default Role Permissions ----

export const ADMIN_PERMISSIONS: Permission[] = [
  Permissions.PRODUCT_CREATE, Permissions.PRODUCT_READ, Permissions.PRODUCT_UPDATE, Permissions.PRODUCT_DELETE,
  Permissions.CATEGORY_CREATE, Permissions.CATEGORY_READ, Permissions.CATEGORY_UPDATE, Permissions.CATEGORY_DELETE,
  Permissions.ORDER_READ, Permissions.ORDER_UPDATE, Permissions.ORDER_CANCEL, Permissions.ORDER_ASSIGN,
  Permissions.INVENTORY_READ, Permissions.INVENTORY_UPDATE,
  Permissions.CUSTOMER_READ, Permissions.CUSTOMER_UPDATE,
  Permissions.EMPLOYEE_CREATE, Permissions.EMPLOYEE_READ, Permissions.EMPLOYEE_UPDATE, Permissions.EMPLOYEE_DELETE,
  Permissions.BANNER_CREATE, Permissions.BANNER_UPDATE, Permissions.BANNER_DELETE,
  Permissions.COUPON_CREATE, Permissions.COUPON_UPDATE, Permissions.COUPON_DELETE,
  Permissions.REPORT_READ,
  Permissions.SETTINGS_READ, Permissions.SETTINGS_UPDATE,
  Permissions.REVIEW_READ, Permissions.REVIEW_MODERATE,
  Permissions.NOTIFICATION_READ,
];

export const MANAGER_PERMISSIONS: Permission[] = [
  Permissions.ORDER_READ, Permissions.ORDER_UPDATE, Permissions.ORDER_CANCEL, Permissions.ORDER_ASSIGN,
  Permissions.INVENTORY_READ, Permissions.INVENTORY_UPDATE,
  Permissions.CUSTOMER_READ,
  Permissions.EMPLOYEE_CREATE, Permissions.EMPLOYEE_READ, Permissions.EMPLOYEE_UPDATE,
  Permissions.PRODUCT_READ,
  Permissions.CATEGORY_READ,
  Permissions.NOTIFICATION_READ,
];

// ---- Order Status Transitions ----

export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['PLACED', 'CANCELLED'],
  PLACED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  REJECTED: [],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const CANCELLABLE_STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT', 'PLACED', 'ACCEPTED', 'PREPARING',
];

export const CUSTOMER_CANCELLABLE_STATUSES: OrderStatus[] = [
  'PENDING_PAYMENT', 'PLACED',
];

// ---- Order Status Timestamps ----

export const STATUS_TIMESTAMP_MAP: Partial<Record<OrderStatus, string>> = {
  ACCEPTED: 'acceptedAt',
  PREPARING: 'preparingAt',
  READY: 'readyAt',
  OUT_FOR_DELIVERY: 'outForDeliveryAt',
  DELIVERED: 'deliveredAt',
  CANCELLED: 'cancelledAt',
};

// ---- Misc Constants ----

export const MAX_PAGINATION_LIMIT = 100;
export const DEFAULT_PAGINATION_LIMIT = 20;

export const MAX_CART_ITEM_QUANTITY = 50;

export const ALLOWED_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export const ADMIN_MAX_LOGIN_ATTEMPTS = 5;
export const ADMIN_LOCK_TIME_MINUTES = 30;

export const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours
