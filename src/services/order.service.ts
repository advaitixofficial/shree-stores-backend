import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { NotificationService } from './notification.service';
import { runInTransaction } from '../utils/transaction';
import { Address } from '../models/Address';
import { User } from '../models/User';
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
      
      // Minimum Order Validation
      const minOrder = settings.codMinimumOrder || 100;
      if (cartVal.subtotal < minOrder) {
        throw new BadRequestError(`Minimum order amount is ₹${minOrder}`);
      }

      // 2. Validate Delivery Radius and get distance
      let distance = 0;
      if (settings.deliveryEnabled) {
        distance = require('../utils/geo').calculateDistanceInKm(
          settings.latitude,
          settings.longitude,
          address.latitude,
          address.longitude
        );
        if (distance > settings.deliveryRadiusKm) {
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
        { 
          deliveryFee: settings.deliveryFee, 
          freeDeliveryMinimum: settings.freeDeliveryMinimum,
          deliveryTiers: settings.deliveryTiers || [] 
        },
        couponData as any,
        distance
      );

      // 5. Build order snapshot items
      const orderItems = cartVal.validItems.map((item) => ({
        productId: item.product._id,
        variantId: item.variantId,
        productName: item.product.name,
        productNameHindi: item.product.nameHindi,
        image: item.product.thumbnail,
        quantity: item.quantity,
        unit: item.unitSnapshot,
        unitValue: item.unitValueSnapshot,
        price: item.priceSnapshot,
        mrp: item.mrpSnapshot,
        total: item.total,
      }));

      // 6. Deduct Inventory (from variants)
      for (const item of cartVal.validItems) {
        const productModel = mongoose.model('Product');
        
        // Find product with the specific variant having enough stock
        const updated = await productModel.findOneAndUpdate(
          { 
            _id: item.product._id, 
            'variants._id': item.variantId,
            'variants.stock': { $gte: item.quantity } 
          },
          { 
            $inc: { 'variants.$.stock': -item.quantity } 
          },
          { session, new: true }
        );

        if (!updated) {
          throw new BadRequestError(`Insufficient stock for ${item.product.name} during checkout`);
        }
        
        // If the variant stock became 0, update variant availability
        const variant = updated.variants.find((v: any) => v._id.toString() === item.variantId.toString());
        if (variant && variant.stock <= 0) {
          await productModel.updateOne(
            { _id: item.product._id, 'variants._id': item.variantId },
            { $set: { 'variants.$.isAvailable': false } },
            { session: session || undefined }
          );
        }

        // Check overall product availability
        const anyAvailable = updated.variants.some((v: any) => v.stock > 0);
        if (updated.isAvailable !== anyAvailable) {
          await productModel.updateOne(
            { _id: item.product._id },
            { $set: { isAvailable: anyAvailable } },
            { session: session || undefined }
          );
        }
      }

      // 7. Create Order
      const orderNumber = await generateOrderNumber();
      const isOnline = data.paymentMethod === 'ONLINE';
      
      const [order] = await Order.create([{
        orderNumber,
        user: userId,
        items: orderItems,
        shippingAddress: address,
        ...totals,
        coupon: couponData?._id,
        paymentMethod: data.paymentMethod,
        paymentStatus: 'PENDING',
        orderStatus: isOnline ? 'PENDING_PAYMENT' : 'PLACED',
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
      const isOnline = order.paymentMethod === 'ONLINE';

      // For ONLINE: Create Cashfree payment order
      if (isOnline) {
        try {
          const { PaymentService } = require('./payment.service');
          const user: any = await mongoose.model('User').findById(userId).lean();
          const customerName = user?.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : 'Customer';
          const rawPhone = user?.phone || '';
          const digitsOnly = rawPhone.replace(/\D/g, ''); // Remove all non-digits
          const customerPhone = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : '9999999999';

          const cfOrder = await PaymentService.createCashfreeOrder({
            orderId: order.orderNumber,
            orderAmount: order.total,
            customerPhone,
            customerName,
            customerId: userId,
          });

          // Return order with payment session
          return {
            ...order.toObject(),
            paymentSessionId: cfOrder.payment_session_id,
            cfOrderId: cfOrder.cf_order_id,
            cashfreeEnv: PaymentService.getEnvironment(),
          };
        } catch (err: any) {
          // If Cashfree fails, cancel the order
          order.orderStatus = 'CANCELLED';
          order.cancelReason = 'Payment gateway error';
          order.cancelledBy = 'SYSTEM';
          await order.save();
          throw err;
        }
      }

      // For COD: Trigger notifications
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
    
    if (filters.orderNumber) {
      const searchTerm = filters.orderNumber;
      // Search for users matching name or phone
      const matchedUsers = await User.find({
        $or: [
          { phone: { $regex: searchTerm, $options: 'i' } },
          {
            $expr: {
              $regexMatch: {
                input: { $concat: [{ $ifNull: ["$firstName", ""] }, " ", { $ifNull: ["$lastName", ""] }] },
                regex: searchTerm,
                options: "i"
              }
            }
          }
        ]
      }).select('_id');
      const userIds = matchedUsers.map(u => u._id);

      query.$or = [
        { orderNumber: { $regex: searchTerm, $options: 'i' } },
        { user: { $in: userIds } }
      ];
    }

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
