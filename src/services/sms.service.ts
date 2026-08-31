// ============================================================
// Shree Stores Backend — SMS Service (Fast2SMS)
// Handles sending OTP SMS via Fast2SMS API.
// ============================================================

import { env, isDev } from '../config/env';
import { logger } from '../utils/logger';

const FAST2SMS_API_URL = 'https://www.fast2sms.com/dev/bulkV2';

interface Fast2SMSResponse {
  return: boolean;
  request_id: string;
  message: string[];
}

export class SmsService {
  /**
   * Send OTP via Fast2SMS.
   * In development mode, logs OTP to console instead of sending SMS.
   * @param phone - Phone number (may include +91 prefix)
   * @param otp - The OTP string to send
   */
  static async sendOtp(phone: string, otp: string): Promise<boolean> {
    // Strip country code if present (+91 or 91 prefix)
    const mobileNumber = phone.replace(/^\+?91/, '');

    if (mobileNumber.length !== 10) {
      logger.error({ phone, mobileNumber }, 'Invalid phone number for SMS');
      return false;
    }

    // In development mode, skip actual SMS and just log
    if (isDev) {
      logger.info({ phone: mobileNumber, otp }, '📱 [DEV] OTP (not sent via SMS)');
      return true;
    }

    // Check if API key is configured
    if (!env.FAST2SMS_API_KEY) {
      logger.warn('FAST2SMS_API_KEY is not configured. SMS will not be sent.');
      return false;
    }

    try {
      const params = new URLSearchParams({
        authorization: env.FAST2SMS_API_KEY,
        message: `Your Shree Stores OTP is ${otp}. Do not share with anyone.`,
        route: 'q',
        numbers: mobileNumber,
      });

      const response = await fetch(`${FAST2SMS_API_URL}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'cache-control': 'no-cache',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const data = (await response.json()) as Fast2SMSResponse;

      if (data.return) {
        logger.info(
          { phone: mobileNumber, requestId: data.request_id },
          '✅ OTP SMS sent successfully via Fast2SMS'
        );
        return true;
      } else {
        logger.error(
          { phone: mobileNumber, response: data },
          '❌ Fast2SMS returned failure'
        );
        return false;
      }
    } catch (error: any) {
      logger.error(
        {
          phone: mobileNumber,
          error: error.message,
        },
        '❌ Failed to send OTP via Fast2SMS'
      );
      return false;
    }
  }
}
