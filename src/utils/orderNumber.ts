// ============================================================
// Shree Stores Backend — Order Number Generator
// Format: SS-YYYYMMDD-NNNNNN
// ============================================================

import { Order } from '../models/Order';

/**
 * Generate a human-friendly order number.
 * Format: SS-20260816-000123
 */
export async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  const dateStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('');

  const prefix = `SS-${dateStr}`;

  // Find last order number for today
  const lastOrder = await Order.findOne({
    orderNumber: { $regex: `^${prefix}` },
  })
    .sort({ orderNumber: -1 })
    .select('orderNumber')
    .lean();

  let sequence = 1;
  if (lastOrder?.orderNumber) {
    const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}-${String(sequence).padStart(6, '0')}`;
}
