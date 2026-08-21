import { Request, Response, NextFunction } from 'express';
import { CouponService } from '../services/coupon.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/helpers';

export class CouponController {
  static async validateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;
      const { subtotal } = req.query; // Usually passed as query for quick check
      
      const coupon = await CouponService.validateCoupon(code, req.userId!, Number(subtotal) || 0);
      sendSuccess(res, coupon, 'Coupon is valid');
    } catch (error) {
      next(error);
    }
  }

  static async getCoupons(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await CouponService.getCoupons(page, limit);
      sendPaginated(res, result.coupons, result.pagination, 'Coupons fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async createCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await CouponService.createCoupon(req.body);
      sendSuccess(res, coupon, 'Coupon created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await CouponService.updateCoupon(req.params.id, req.body);
      sendSuccess(res, coupon, 'Coupon updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      await CouponService.deleteCoupon(req.params.id);
      sendSuccess(res, null, 'Coupon deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
