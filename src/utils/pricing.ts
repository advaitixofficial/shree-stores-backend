// ============================================================
// Shree Stores Backend — Pricing Utilities
// Centralized order/delivery fee calculations.
// ============================================================

import type { IOrderItem, DiscountType } from '../types';

export interface OrderTotals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
}

export interface DeliveryFeeConfig {
  deliveryFee: number;
  deliveryTiers: { maxDistance: number; fee: number }[];
  freeDeliveryMinimum: number;
}

export interface CouponDiscount {
  discountType: DiscountType;
  discountValue: number;
  maximumDiscount?: number;
}

/**
 * Calculate subtotal from order items.
 */
export function calculateSubtotal(items: IOrderItem[]): number {
  return items.reduce((sum, item) => sum + item.total, 0);
}

/**
 * Calculate delivery fee based on store configuration and distance.
 */
export function calculateDeliveryFee(
  subtotal: number,
  config: DeliveryFeeConfig,
  distanceKm: number = 0
): number {
  // Free delivery for orders above the minimum
  if (config.freeDeliveryMinimum > 0 && subtotal >= config.freeDeliveryMinimum) {
    return 0;
  }

  // Free delivery under 10km
  if (distanceKm <= 10) {
    return 0;
  }

  // Find the applicable tier based on distance
  if (config.deliveryTiers && config.deliveryTiers.length > 0) {
    // Sort tiers by distance ascending to ensure correct matching
    const sortedTiers = [...config.deliveryTiers].sort((a, b) => a.maxDistance - b.maxDistance);
    
    for (const tier of sortedTiers) {
      if (distanceKm <= tier.maxDistance) {
        return tier.fee;
      }
    }
  }

  return config.deliveryFee;
}

/**
 * Calculate coupon discount amount.
 */
export function calculateCouponDiscount(
  subtotal: number,
  coupon: CouponDiscount
): number {
  let discount = 0;

  if (coupon.discountType === 'PERCENTAGE') {
    discount = (subtotal * coupon.discountValue) / 100;
  } else if (coupon.discountType === 'FIXED') {
    discount = coupon.discountValue;
  }

  // Apply maximum cap
  if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
    discount = coupon.maximumDiscount;
  }

  // Discount should never exceed subtotal
  if (discount > subtotal) {
    discount = subtotal;
  }

  return Math.round(discount * 100) / 100;
}

/**
 * Calculate complete order totals.
 */
export function calculateOrderTotals(
  items: IOrderItem[],
  deliveryFeeConfig: DeliveryFeeConfig,
  coupon?: CouponDiscount,
  distanceKm: number = 0
): OrderTotals {
  const subtotal = calculateSubtotal(items);
  const discount = coupon ? calculateCouponDiscount(subtotal, coupon) : 0;
  const deliveryFee = calculateDeliveryFee(subtotal - discount, deliveryFeeConfig, distanceKm);
  const total = Math.max(0, subtotal - discount + deliveryFee);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discount: Math.round(discount * 100) / 100,
    deliveryFee: Math.round(deliveryFee * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
