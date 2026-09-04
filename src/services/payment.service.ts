// ============================================================
// Shree Stores — Cashfree Payment Service
// Handles creating payment orders and verifying payments
// ============================================================

import { env } from '../config/env';
import { BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';

const CASHFREE_BASE_URL = env.CASHFREE_ENV === 'PRODUCTION'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const API_VERSION = '2023-08-01';

interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  payment_session_id: string;
  order_status: string;
}

interface CashfreePaymentStatus {
  order_id: string;
  order_status: string;
  order_amount: number;
  cf_order_id: string;
}

export class PaymentService {
  /**
   * Create a Cashfree order for online payment
   */
  static async createCashfreeOrder(params: {
    orderId: string;
    orderAmount: number;
    customerPhone: string;
    customerName: string;
    customerId: string;
    returnUrl?: string;
  }): Promise<CashfreeOrderResponse> {
    if (!env.CASHFREE_APP_ID || !env.CASHFREE_SECRET_KEY) {
      throw new BadRequestError('Payment gateway not configured');
    }

    const body = {
      order_id: params.orderId,
      order_amount: Number(params.orderAmount.toFixed(2)),
      order_currency: 'INR',
      customer_details: {
        customer_id: params.customerId,
        customer_phone: params.customerPhone,
        customer_name: params.customerName,
      },
      order_meta: {
        return_url: params.returnUrl || `${CASHFREE_BASE_URL}/orders/${params.orderId}/status`,
        notify_url: undefined, // Webhook URL is configured in Cashfree dashboard
      },
    };

    try {
      const response = await fetch(`${CASHFREE_BASE_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': env.CASHFREE_APP_ID,
          'x-client-secret': env.CASHFREE_SECRET_KEY,
          'x-api-version': API_VERSION,
        },
        body: JSON.stringify(body),
      });

      const data: any = await response.json();

      if (!response.ok) {
        logger.error({ cashfreeError: data }, '❌ Cashfree order creation failed');
        throw new BadRequestError(data.message || 'Payment order creation failed');
      }

      logger.info({ orderId: params.orderId, cfOrderId: data.cf_order_id }, '✅ Cashfree order created');
      return data as CashfreeOrderResponse;
    } catch (error: any) {
      if (error instanceof BadRequestError) throw error;
      logger.error({ err: error }, '❌ Cashfree API call failed');
      throw new BadRequestError('Payment service unavailable');
    }
  }

  /**
   * Verify payment status with Cashfree
   */
  static async verifyPayment(orderId: string): Promise<CashfreePaymentStatus> {
    if (!env.CASHFREE_APP_ID || !env.CASHFREE_SECRET_KEY) {
      throw new BadRequestError('Payment gateway not configured');
    }

    try {
      const response = await fetch(`${CASHFREE_BASE_URL}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'x-client-id': env.CASHFREE_APP_ID,
          'x-client-secret': env.CASHFREE_SECRET_KEY,
          'x-api-version': API_VERSION,
        },
      });

      const data: any = await response.json();

      if (!response.ok) {
        logger.error({ cashfreeError: data }, '❌ Cashfree verify failed');
        throw new BadRequestError('Payment verification failed');
      }

      return data as CashfreePaymentStatus;
    } catch (error: any) {
      if (error instanceof BadRequestError) throw error;
      logger.error({ err: error }, '❌ Cashfree verify API call failed');
      throw new BadRequestError('Payment verification unavailable');
    }
  }

  /**
   * Get the Cashfree checkout URL for WebView
   */
  static getCheckoutUrl(): string {
    return env.CASHFREE_ENV === 'PRODUCTION'
      ? 'https://api.cashfree.com/pg/orders/sessions'
      : 'https://sandbox.cashfree.com/pg/orders/sessions';
  }

  /**
   * Get the Cashfree environment string for frontend
   */
  static getEnvironment(): string {
    return env.CASHFREE_ENV === 'PRODUCTION' ? 'production' : 'sandbox';
  }
}
