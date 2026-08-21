import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { DeliveryService } from '../services/delivery.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { parsePagination } from '../utils/helpers';
import type { OrderStatus } from '../types';

export class OrderController {
  // ---- Customer Facing ----

  static async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.createOrder(req.userId!, req.body);
      // NOTE: idempotency middleware handles wrapping this response
      sendSuccess(res, order, 'Order placed successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await OrderService.getCustomerOrders(req.userId!, page, limit);
      sendPaginated(res, result.orders, result.pagination, 'Orders fetched');
    } catch (error) {
      next(error);
    }
  }

  static async cancelOrderCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const order = await OrderService.cancelOrder(req.params.id, 'USER', req.userId!, reason);
      sendSuccess(res, order, 'Order cancelled');
    } catch (error) {
      next(error);
    }
  }

  // ---- Admin Facing ----

  static async getAdminOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query);
      const filters = {
        status: req.query.status,
        paymentStatus: req.query.paymentStatus,
        orderNumber: req.query.orderNumber,
      };
      
      const result = await OrderService.getAdminOrders(page, limit, filters);
      sendPaginated(res, result.orders, result.pagination, 'Orders fetched');
    } catch (error) {
      next(error);
    }
  }

  static async getAdminOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await OrderService.getOrderById(req.params.id);
      sendSuccess(res, order, 'Order fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const order = await OrderService.updateOrderStatus(req.params.id, status as OrderStatus);
      sendSuccess(res, order, `Order status updated to ${status}`);
    } catch (error) {
      next(error);
    }
  }

  static async cancelOrderAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      // Pass empty string for userId since it's an admin acting, auth checks already passed
      const order = await OrderService.cancelOrder(req.params.id, 'ADMIN', '', reason);
      sendSuccess(res, order, 'Order cancelled by admin');
    } catch (error) {
      next(error);
    }
  }

  static async assignEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { employeeId } = req.body;
      const delivery = await DeliveryService.assignEmployee(req.params.id, employeeId);
      sendSuccess(res, delivery, 'Employee assigned to delivery');
    } catch (error) {
      next(error);
    }
  }
}
