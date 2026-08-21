import { Coupon } from '../models/Coupon';
import { BadRequestError, NotFoundError } from '../utils/errors';
import mongoose from 'mongoose';
import { buildPaginationMeta } from '../utils/helpers';

export class CouponService {
  /**
   * Admin: Get all coupons paginated.
   */
  static async getCoupons(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [coupons, total] = await Promise.all([
      Coupon.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Coupon.countDocuments(),
    ]);

    return { coupons, pagination: buildPaginationMeta(total, page, limit) };
  }

  /**
   * Admin: Create coupon.
   */
  static async createCoupon(data: any) {
    const existing = await Coupon.findOne({ code: data.code.toUpperCase() }).lean();
    if (existing) throw new BadRequestError('Coupon code already exists');
    return Coupon.create({ ...data, code: data.code.toUpperCase() });
  }

  /**
   * Admin: Update coupon.
   */
  static async updateCoupon(id: string, data: any) {
    if (data.code) {
      data.code = data.code.toUpperCase();
      const existing = await Coupon.findOne({ code: data.code, _id: { $ne: id } }).lean();
      if (existing) throw new BadRequestError('Coupon code already exists');
    }

    const coupon = await Coupon.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
    if (!coupon) throw new NotFoundError('Coupon not found');
    return coupon;
  }

  /**
   * Admin: Delete coupon.
   */
  static async deleteCoupon(id: string) {
    const coupon = await Coupon.findByIdAndDelete(id).lean();
    if (!coupon) throw new NotFoundError('Coupon not found');
    return coupon;
  }

  /**
   * Validate coupon code for a user and a subtotal.
   * Internal use, does not lock.
   */
  static async validateCoupon(code: string, userId: string, orderSubtotal: number) {
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).lean();

    if (!coupon) throw new BadRequestError('Invalid or expired coupon');

    if (orderSubtotal < coupon.minimumOrderAmount) {
      throw new BadRequestError(`Minimum order amount of ${coupon.minimumOrderAmount} required`);
    }

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestError('Coupon usage limit reached');
    }

    // Check per-user limit
    const OrderModel = mongoose.model('Order');
    const userUsageCount = await OrderModel.countDocuments({
      user: userId,
      coupon: coupon._id,
      orderStatus: { $ne: 'CANCELLED' },
    });

    if (userUsageCount >= coupon.perUserLimit) {
      throw new BadRequestError('You have reached the usage limit for this coupon');
    }

    return coupon;
  }

  /**
   * Validate and lock coupon usage in a transaction.
   */
  static async validateAndLockCoupon(userId: string, code: string, orderSubtotal: number, session: mongoose.ClientSession | null) {
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    }).session(session);

    if (!coupon) throw new BadRequestError('Invalid or expired coupon');

    if (orderSubtotal < coupon.minimumOrderAmount) {
      throw new BadRequestError(`Minimum order amount of ${coupon.minimumOrderAmount} required`);
    }

    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestError('Coupon usage limit reached');
    }

    const OrderModel = mongoose.model('Order');
    const userUsageCount = await OrderModel.countDocuments({
      user: userId,
      coupon: coupon._id,
      orderStatus: { $ne: 'CANCELLED' },
    }).session(session);

    if (userUsageCount >= coupon.perUserLimit) {
      throw new BadRequestError('You have reached the usage limit for this coupon');
    }

    // Lock coupon usage
    coupon.usedCount += 1;
    await coupon.save({ session });

    return coupon;
  }
}
