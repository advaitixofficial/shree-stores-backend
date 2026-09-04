// ============================================================
// Shree Stores — Payment Controller
// Handles payment verification and Cashfree webhooks
// ============================================================

import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service';
import { Order } from '../models/Order';
import { sendSuccess } from '../utils/response';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { NotificationService } from '../services/notification.service';
import { logger } from '../utils/logger';
import crypto from 'crypto';
import { env } from '../config/env';

export class PaymentController {
  /**
   * Customer: Verify payment after Cashfree checkout
   * POST /api/payments/verify/:orderId
   */
  static async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const { orderId } = req.params;
      
      const order = await Order.findById(orderId);
      if (!order) throw new NotFoundError('Order not found');
      if (order.user.toString() !== req.userId) throw new BadRequestError('Not authorized');
      if (order.paymentMethod !== 'ONLINE') throw new BadRequestError('Not an online payment order');

      // Verify with Cashfree
      const cfStatus = await PaymentService.verifyPayment(order.orderNumber);
      
      if (cfStatus.order_status === 'PAID') {
        order.paymentStatus = 'PAID';
        order.orderStatus = 'PLACED';
        await order.save();
        
        logger.info({ orderId: order._id, orderNumber: order.orderNumber }, '✅ Payment verified - PAID');

        // Notify admin
        NotificationService.createNotification({
          recipientType: 'ADMIN',
          title: 'New Online Order',
          message: `Order #${order.orderNumber} of ₹${order.total} - Payment received via Cashfree.`,
          type: 'ORDER_PLACED',
          payload: { orderId: order._id },
        });

        sendSuccess(res, { paymentStatus: 'PAID', order }, 'Payment verified successfully');
      } else {
        logger.warn({ orderId: order._id, cfStatus: cfStatus.order_status }, '⚠️ Payment not yet completed');
        sendSuccess(res, { paymentStatus: cfStatus.order_status, order }, 'Payment pending');
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cashfree Webhook Handler
   * POST /api/webhooks/cashfree
   */
  static async cashfreeWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      // Verify webhook signature
      const signature = req.headers['x-webhook-signature'] as string;
      const timestamp = req.headers['x-webhook-timestamp'] as string;
      const rawBody = JSON.stringify(req.body);

      if (signature && env.CASHFREE_SECRET_KEY) {
        const data = timestamp + rawBody;
        const expectedSignature = crypto
          .createHmac('sha256', env.CASHFREE_SECRET_KEY)
          .update(data)
          .digest('base64');

        if (signature !== expectedSignature) {
          logger.warn('⚠️ Invalid Cashfree webhook signature');
          return res.status(400).json({ message: 'Invalid signature' });
        }
      }

      const { data } = req.body;
      
      if (!data || !data.order || !data.order.order_id) {
        return res.status(200).json({ message: 'Ignored' });
      }

      const orderNumber = data.order.order_id;
      const paymentStatus = data.order.order_status;

      const order = await Order.findOne({ orderNumber });
      if (!order) {
        logger.warn({ orderNumber }, '⚠️ Webhook: Order not found');
        return res.status(200).json({ message: 'Order not found' });
      }

      if (paymentStatus === 'PAID' && order.paymentStatus !== 'PAID') {
        order.paymentStatus = 'PAID';
        if (order.orderStatus === 'PENDING_PAYMENT') {
          order.orderStatus = 'PLACED';
        }
        await order.save();
        logger.info({ orderNumber }, '✅ Webhook: Payment confirmed');

        NotificationService.createNotification({
          recipientType: 'CUSTOMER',
          recipientId: order.user.toString(),
          title: 'Payment Successful',
          titleHindi: 'भुगतान सफल',
          message: `Payment for order #${order.orderNumber} has been confirmed.`,
          messageHindi: `ऑर्डर #${order.orderNumber} का भुगतान पुष्टि हो गया है।`,
          type: 'PAYMENT_SUCCESS',
          payload: { orderId: order._id },
        });
      }

      return res.status(200).json({ message: 'Webhook processed' });
    } catch (error) {
      logger.error({ err: error }, '❌ Cashfree webhook error');
      return res.status(200).json({ message: 'Error processing webhook' });
    }
  }
}
