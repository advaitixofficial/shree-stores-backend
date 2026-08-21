import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { NotificationService } from './notification.service';
import { runInTransaction } from '../utils/transaction';
import { Address } from '../models/Address';
import { StoreSettings } from '../models/StoreSettings';
import { CartService } from './cart.service';
import { CouponService } from './coupon.service';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { generateOrderNumber } from '../utils/orderNumber';
import { calculateOrderTotals } from '../utils/pricing';
import { VALID_ORDER_TRANSITIONS, STATUS_TIMESTAMP_MAP, CUSTOMER_CANCELLABLE_STATUSES } from '../constants';
import { buildPaginationMeta } from '../utils/helpers';
import type { OrderStatus } from '../types';

export class OrderService {
  /**
   * Customer: Create Order (Transaction safe)
   */
  static async createOrder(userId: string, data: { addressId: string; couponCode?: string; paymentMethod: 'COD' | 'ONLINE'; notes?: string }) {
    return runInTransaction(async (session) => {
      // 1. Fetch dependencies
      const [address, settings, cartVal] = await Promise.all([
        Address.findOne({ _id: data.addressId, user: userId }).lean(),
        StoreSettings.findOne().lean(),
        CartService.validateCart(userId),
      ]);

      if (!address) throw new BadRequestError('Invalid delivery address');
      if (!settings) throw new BadRequestError('Store settings missing');
      if (!cartVal.isValid || cartVal.validItems.length === 0) {
        throw new BadRequestError(cartVal.issues.join(', ') || 'Cart is empty');
      }

      // 2. Validate Delivery Radius
      if (settings.deliveryEnabled) {
        const isWithin = require('../utils/geo').isWithinDeliveryRadius(
          settings.latitude,
          settings.longitude,
          address.latitude,
          address.longitude,
          settings.deliveryRadiusKm
        );
        if (!isWithin) {
          throw new BadRequestError(`Delivery is not available at this location (Max ${settings.deliveryRadiusKm} KM)`);
        }
      }

      // 3. Process Coupon
      let couponData = null;
      if (data.couponCode) {
        couponData = await CouponService.validateAndLockCoupon(
          userId,
          data.couponCode,
          cartVal.subtotal,
          session
        );
      }

      // 4. Calculate final totals
      const totals = calculateOrderTotals(
        cartVal.validItems,
        { deliveryFee: settings.deliveryFee, freeDeliveryMinimum: settings.freeDeliveryMinimum },
        couponData as any
      );

      // 5. Build order snapshot items
      const orderItems = cartVal.validItems.map((item) => ({
        productId: item.product._id,
        productName: item.product.name,
        productNameHindi: item.product.nameHindi,
        image: item.product.thumbnail,
        quantity: item.quantity,
        unit: item.product.unit,
        price: item.priceSnapshot,
        mrp: item.mrpSnapshot,
        total: item.total,
      }));

      // 6. Deduct Inventory
      for (const item of cartVal.validItems) {
        const updated = await mongoose.model('Product').findOneAndUpdate(
          { _id: item.product._id, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { session, new: true }
        );
        if (!updated) {
          throw new BadRequestError(`Insufficient stock for ${item.product.name} during checkout`);
        }
        // Auto mark unavailable if stock hits 0
        if (updated.stock === 0) {
          updated.isAvailable = false;
          await updated.save({ session });
        }
      }

      // 7. Create Order
      const orderNumber = await generateOrderNumber();
      const [order] = await Order.create([{
        orderNumber,
        user: userId,
        items: orderItems,
        shippingAddress: address,
        ...totals,
        coupon: couponData?._id,
        paymentMethod: data.paymentMethod,
        paymentStatus: 'PENDING',
        orderStatus: 'PLACED',
        notes: data.notes,
      }], { session });

      // 8. Clear Cart
      await mongoose.model('Cart').findOneAndUpdate(
        { user: userId },
        { items: [] },
        { session }
      );

      return order;
    }).then(async (order) => {
      // Trigger notifications out-of-transaction (fire-and-forget)
      NotificationService.createNotification({
        recipientType: 'CUSTOMER',
        recipientId: userId,
        title: 'Order Placed Successfully',
        titleHindi: 'ऑर्डर सफलतापूर्वक दिया गया',
        message: `Your order #${order.orderNumber} has been placed.`,
        messageHindi: `आपका ऑर्डर #${order.orderNumber} स्वीकार कर लिया गया है।`,
        type: 'ORDER_PLACED',
        payload: { orderId: order._id },
      });

      NotificationService.createNotification({
        recipientType: 'ADMIN',
        title: 'New Order Placed',
        message: `A new order #${order.orderNumber} of ₹${order.total} has been placed.`,
        type: 'ORDER_PLACED',
        payload: { orderId: order._id },
      });

      return order;
    });
  }

  /**
   * Customer: Get their orders
   */
  static async getCustomerOrders(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find({ user: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments({ user: userId }),
    ]);

    return { orders, pagination: buildPaginationMeta(total, page, limit) };
  }

  /**
   * Admin: Get paginated orders with filters
   */
  static async getAdminOrders(page: number, limit: number, filters: any) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filters.status) query.orderStatus = filters.status;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
    if (filters.orderNumber) query.orderNumber = { $regex: filters.orderNumber, $options: 'i' };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'firstName lastName phone')
        .populate('assignedEmployee', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    return { orders, pagination: buildPaginationMeta(total, page, limit) };
  }

  /**
   * Admin: Get single order by ID
   */
  static async getOrderById(orderId: string) {
    const order = await Order.findById(orderId)
      .populate('user', 'firstName lastName name phone email')
      .populate('assignedEmployee', 'name phone role')
      .lean();

    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  /**
   * Admin: Change Order Status
   */
  static async updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    return runInTransaction(async (session) => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new NotFoundError('Order not found');

      const validNextStates = VALID_ORDER_TRANSITIONS[order.orderStatus];
      if (!validNextStates.includes(newStatus)) {
        throw new BadRequestError(`Invalid transition from ${order.orderStatus} to ${newStatus}`);
      }

      order.orderStatus = newStatus;

      // Set timestamp
      const timestampField = STATUS_TIMESTAMP_MAP[newStatus];
      if (timestampField) {
        (order as any)[timestampField] = new Date();
      }

      // Auto-update payment status for COD if delivered
      if (newStatus === 'DELIVERED' && order.paymentMethod === 'COD') {
        order.paymentStatus = 'PAID';
      }

      // Handle delivery employee release upon delivery completion
      if (newStatus === 'DELIVERED' && order.assignedEmployee) {
        await mongoose.model('Employee').findByIdAndUpdate(
          order.assignedEmployee,
          { availability: 'AVAILABLE' },
          { session }
        );

        await mongoose.model('Delivery').findOneAndUpdate(
          { order: order._id },
          { status: 'DELIVERED', deliveredAt: new Date() },
          { session }
        );
      }

      await order.save({ session });
      return order;
    }).then(async (order) => {
      // Trigger status transition notification (fire-and-forget)
      const statusTitleMap: Record<string, { en: string; hi: string }> = {
        ACCEPTED: { en: 'Order Accepted', hi: 'ऑर्डर स्वीकार कर लिया गया' },
        PREPARING: { en: 'Order Preparing', hi: 'ऑर्डर तैयार हो रहा है' },
        READY: { en: 'Order Ready', hi: 'ऑर्डर तैयार है' },
        OUT_FOR_DELIVERY: { en: 'Out for Delivery', hi: 'डिलीवरी के लिए रवाना' },
        DELIVERED: { en: 'Order Delivered', hi: 'ऑर्डर डिलीवर हो गया' },
      };

      const titles = statusTitleMap[newStatus];
      if (titles) {
        NotificationService.createNotification({
          recipientType: 'CUSTOMER',
          recipientId: order.user.toString(),
          title: titles.en,
          titleHindi: titles.hi,
          message: `Your order #${order.orderNumber} status is now: ${newStatus.replace(/_/g, ' ')}.`,
          messageHindi: `आपके ऑर्डर #${order.orderNumber} की स्थिति अब ${newStatus} है।`,
          type: `ORDER_${newStatus}`,
          payload: { orderId: order._id, status: newStatus },
        });
      }

      return order;
    });
  }

  /**
   * Cancel Order (Shared logic for Customer and Admin)
   */
  static async cancelOrder(orderId: string, cancelledBy: 'USER' | 'ADMIN', userId: string, reason: string) {
    return runInTransaction(async (session) => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new NotFoundError('Order not found');

      // Authorization & State check
      if (cancelledBy === 'USER') {
        if (order.user.toString() !== userId) throw new BadRequestError('Not authorized');
        if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.orderStatus)) {
          throw new BadRequestError(`Cannot cancel order in ${order.orderStatus} state`);
        }
      }

      if (order.orderStatus === 'CANCELLED' || order.orderStatus === 'DELIVERED') {
        throw new BadRequestError(`Order is already ${order.orderStatus}`);
      }

      order.orderStatus = 'CANCELLED';
      order.cancelReason = reason;
      order.cancelledBy = cancelledBy;
      order.cancelledAt = new Date();

      // Refund inventory
      for (const item of order.items) {
        await mongoose.model('Product').findByIdAndUpdate(
          item.productId,
          { $inc: { stock: item.quantity }, isAvailable: true },
          { session }
        );
      }

      // If assigned, release employee
      if (order.assignedEmployee) {
        await mongoose.model('Employee').findByIdAndUpdate(
          order.assignedEmployee,
          { availability: 'AVAILABLE' },
          { session }
        );
        // Also update delivery record
        await mongoose.model('Delivery').findOneAndUpdate(
          { order: order._id },
          { status: 'CANCELLED' },
          { session }
        );
      }

      await order.save({ session });
      return order;
    }).then(async (order) => {
      // Trigger cancellation notification (fire-and-forget)
      NotificationService.createNotification({
        recipientType: 'CUSTOMER',
        recipientId: order.user.toString(),
        title: 'Order Cancelled',
        titleHindi: 'ऑर्डर रद्द कर दिया गया',
        message: `Your order #${order.orderNumber} has been cancelled. Reason: ${reason}`,
        messageHindi: `आपका ऑर्डर #${order.orderNumber} रद्द कर दिया गया है। कारण: ${reason}`,
        type: 'ORDER_CANCELLED',
        payload: { orderId: order._id, reason },
      });

      NotificationService.createNotification({
        recipientType: 'ADMIN',
        title: 'Order Cancelled',
        message: `Order #${order.orderNumber} has been cancelled by ${cancelledBy}. Reason: ${reason}`,
        type: 'ORDER_CANCELLED',
        payload: { orderId: order._id, reason },
      });

      return order;
    });
  }
}
