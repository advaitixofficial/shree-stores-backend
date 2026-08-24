// ============================================================
// Shree Stores Backend — TypeScript Interfaces & Types
// ============================================================

import { Document, Types } from 'mongoose';

// ---- Generic ----

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  pagination?: PaginationMeta;
  errors?: string[];
}

// ---- JWT ----

export interface JwtAccessPayload {
  sub: string;
  role: string;
}

export interface JwtRefreshPayload {
  sub: string;
  role: string;
  type: 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ---- User ----

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  profileImage?: ImageAsset;
  role: 'CUSTOMER';
  isActive: boolean;
  isVerified: boolean;
  preferredLanguage: 'en' | 'hi';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Admin ----

export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';

export interface IAdmin extends Document {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: AdminRole;
  permissions: string[];
  profileImage?: ImageAsset;
  isActive: boolean;
  loginAttempts: number;
  lockUntil?: Date;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ---- Category ----

export interface ICategory extends Document {
  name: string;
  nameHindi: string;
  slug: string;
  description?: string;
  descriptionHindi?: string;
  image?: ImageAsset;
  icon?: string;
  color?: string;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Product ----

export interface ImageAsset {
  url: string;
  publicId: string;
}

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface IProduct extends Document {
  name: string;
  nameHindi: string;
  slug: string;
  description: string;
  descriptionHindi: string;
  images: ImageAsset[];
  thumbnail?: ImageAsset;
  category: Types.ObjectId;
  brand?: string;
  sku: string;
  unit: string;
  unitValue: number;
  price: number;
  mrp: number;
  discountType?: DiscountType;
  discountValue?: number;
  stock: number;
  lowStockThreshold: number;
  isAvailable: boolean;
  isFeatured: boolean;
  isActive: boolean;
  searchKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ---- Cart ----

export interface ICartItem {
  product: Types.ObjectId;
  quantity: number;
}

export interface ICart extends Document {
  user: Types.ObjectId;
  items: ICartItem[];
  updatedAt: Date;
}

// ---- Address ----

export type AddressLabel = 'HOME' | 'WORK' | 'OTHER';

export interface IAddress extends Document {
  user: Types.ObjectId;
  label: AddressLabel;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Order ----

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'COD' | 'ONLINE';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface IOrderItem {
  productId: Types.ObjectId;
  productName: string;
  productNameHindi: string;
  image?: ImageAsset;
  quantity: number;
  unit: string;
  price: number;
  mrp: number;
  total: number;
}

export interface IOrderAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  user: Types.ObjectId;
  items: IOrderItem[];
  shippingAddress: IOrderAddress;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  coupon?: Types.ObjectId;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  assignedEmployee?: Types.ObjectId;
  notes?: string;
  cancelReason?: string;
  cancelledBy?: string;
  cancelledAt?: Date;
  acceptedAt?: Date;
  preparingAt?: Date;
  readyAt?: Date;
  outForDeliveryAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Coupon ----

export interface ICoupon extends Document {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscount?: number;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Employee ----

export type EmployeeRole = 'DELIVERY_EMPLOYEE' | 'STORE_EMPLOYEE';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type EmployeeAvailability = 'AVAILABLE' | 'BUSY';

export interface IEmployee extends Document {
  name: string;
  phone: string;
  email?: string;
  photo?: ImageAsset;
  role: EmployeeRole;
  status: EmployeeStatus;
  availability: EmployeeAvailability;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Banner ----

export interface IBanner extends Document {
  title: string;
  titleHindi: string;
  description?: string;
  descriptionHindi?: string;
  image?: ImageAsset;
  backgroundColor?: string;
  textColor?: string;
  linkType?: string;
  linkValue?: string;
  sortOrder: number;
  startDate?: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Review ----

export interface IReview extends Document {
  user: Types.ObjectId;
  order: Types.ObjectId;
  product: Types.ObjectId;
  rating: number;
  comment?: string;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Notification ----

export type RecipientType = 'CUSTOMER' | 'ADMIN';
export type NotificationType =
  | 'NEW_ORDER'
  | 'ORDER_ACCEPTED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'ORDER_ASSIGNED'
  | 'ORDER_OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'LOW_STOCK'
  | 'PROMOTION'
  | 'SYSTEM';

export interface INotification extends Document {
  recipientType: RecipientType;
  recipientId: Types.ObjectId;
  title: string;
  titleHindi?: string;
  message: string;
  messageHindi?: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  isRead: boolean;
  readBy?: Types.ObjectId[];
  deletedBy?: Types.ObjectId[];
  createdAt: Date;
}

// ---- Payment ----

export interface IPayment extends Document {
  order: Types.ObjectId;
  provider: string;
  providerPaymentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  metadata?: Record<string, unknown>;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Store Settings ----

export interface IStoreSettings extends Document {
  storeName: string;
  storeNameHindi: string;
  logo?: ImageAsset;
  phone: string;
  email: string;
  address: string;
  latitude: number;
  longitude: number;
  deliveryEnabled: boolean;
  deliveryRadiusKm: number;
  deliveryFee: number;
  deliveryTiers: { maxDistance: number; fee: number }[];
  freeDeliveryMinimum: number;
  estimatedDeliveryMinutes: number;
  currency: string;
  timezone: string;
  supportPhone?: string;
  supportEmail?: string;
  // Feature flags
  onlinePaymentEnabled: boolean;
  codEnabled: boolean;
  reviewsEnabled: boolean;
  couponsEnabled: boolean;
  notificationsEnabled: boolean;
  // COD settings
  codMinimumOrder: number;
  codMaximumOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Audit Log ----

export type AuditAction =
  | 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_DELETED'
  | 'CATEGORY_CREATED' | 'CATEGORY_UPDATED' | 'CATEGORY_DELETED'
  | 'ORDER_STATUS_CHANGED' | 'ORDER_ASSIGNED' | 'ORDER_CANCELLED'
  | 'EMPLOYEE_CREATED' | 'EMPLOYEE_UPDATED' | 'EMPLOYEE_DELETED'
  | 'COUPON_CREATED' | 'COUPON_UPDATED' | 'COUPON_DELETED'
  | 'BANNER_CREATED' | 'BANNER_UPDATED' | 'BANNER_DELETED'
  | 'SETTINGS_UPDATED'
  | 'ADMIN_CREATED' | 'ADMIN_UPDATED' | 'ADMIN_DELETED'
  | 'CUSTOMER_UPDATED'
  | 'INVENTORY_UPDATED';

export interface IAuditLog extends Document {
  admin: Types.ObjectId;
  action: AuditAction;
  resource: string;
  resourceId?: Types.ObjectId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// ---- Delivery ----

export type DeliveryStatus = 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface IDelivery extends Document {
  order: Types.ObjectId;
  employee: Types.ObjectId;
  assignedAt: Date;
  pickedUpAt?: Date;
  outForDeliveryAt?: Date;
  deliveredAt?: Date;
  status: DeliveryStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ---- Idempotency ----

export interface IIdempotencyKey extends Document {
  key: string;
  response: Record<string, unknown>;
  statusCode: number;
  createdAt: Date;
}

// ---- Express augmentation ----

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      adminId?: string;
      adminRole?: string;
      adminPermissions?: string[];
    }
  }
}
