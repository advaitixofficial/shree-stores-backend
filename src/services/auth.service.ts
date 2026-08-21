import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { redisOps } from '../config/redis';
import { User } from '../models/User';
import { generateOtp, normalizePhone } from '../utils/helpers';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { logger } from '../utils/logger';

export class AuthService {
  /**
   * Send OTP to customer's phone number.
   * Caches OTP in Redis with expiration.
   */
  static async sendOtp(phoneInput: string): Promise<string> {
    const phone = normalizePhone(phoneInput);
    const otp = generateOtp();
    const redisKey = `otp:${phone}`;

    // Prevent abuse: check if OTP was recently sent (cooldown)
    const attemptsKey = `otp_attempts:${phone}`;
    const attempts = await redisOps.incr(attemptsKey);
    
    if (attempts === 1) {
      await redisOps.expire(attemptsKey, 15 * 60); // 15 mins
    }
    if (attempts > 5) {
      throw new BadRequestError('Too many OTP requests. Please try again later.');
    }

    // Save OTP to Redis
    await redisOps.set(redisKey, otp, env.OTP_EXPIRY_MINUTES * 60);

    // TODO: Integrate actual SMS gateway here (Twilio/AWS SNS/Msg91)
    logger.info({ phone, otp }, 'OTP generated (simulate SMS send)');

    return env.NODE_ENV === 'development' ? otp : 'OTP sent successfully';
  }

  /**
   * Verify OTP and check if user exists.
   */
  static async verifyOtp(phoneInput: string, otp: string): Promise<{ isNewUser: boolean; tokenPair?: any; user?: any; registrationToken?: string }> {
    const phone = normalizePhone(phoneInput);
    const redisKey = `otp:${phone}`;
    const savedOtp = await redisOps.get(redisKey);

    if (!savedOtp) {
      throw new BadRequestError('OTP expired or not found');
    }
    if (savedOtp !== otp) {
      throw new BadRequestError('Invalid OTP');
    }

    // Clear OTP
    await redisOps.del(redisKey);
    await redisOps.del(`otp_attempts:${phone}`);

    const user = await User.findOne({ phone }).lean();

    if (!user) {
      // New user: Generate a temporary registration token valid for 15 mins
      const registrationToken = jwt.sign(
        { sub: phone, role: 'PENDING_CUSTOMER' },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
      return { isNewUser: true, registrationToken };
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    return {
      isNewUser: false,
      tokenPair: this.generateTokens(user._id.toString(), 'CUSTOMER'),
      user,
    };
  }

  /**
   * Register a new customer after OTP verification.
   */
  static async register(data: {
    firstName: string;
    lastName: string;
    registrationToken: string;
    email?: string;
    preferredLanguage?: string;
  }) {
    // Decode and verify registration token
    let phone = '';
    try {
      const decoded = jwt.verify(data.registrationToken, env.JWT_ACCESS_SECRET) as any;
      if (decoded.role !== 'PENDING_CUSTOMER') {
        throw new Error('Invalid token role');
      }
      phone = decoded.sub;
    } catch {
      throw new UnauthorizedError('Invalid or expired registration session');
    }

    const existingUser = await User.findOne({ phone }).lean();
    if (existingUser) {
      throw new BadRequestError('User with this phone number already exists');
    }

    const user = await User.create({
      ...data,
      phone,
      isVerified: true,
      role: 'CUSTOMER',
      lastLoginAt: new Date(),
    });

    return {
      user,
      tokenPair: this.generateTokens(user._id.toString(), 'CUSTOMER'),
    };
  }

  /**
   * Generate Access and Refresh JWT tokens.
   */
  static generateTokens(userId: string, role: string) {
    const accessToken = jwt.sign(
      { sub: userId, role },
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any }
    );

    const refreshToken = jwt.sign(
      { sub: userId, role, type: 'refresh' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
    );

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token using a valid refresh token.
   */
  static async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as any;
      
      if (decoded.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      // Ensure user still exists
      let userExists = false;
      if (decoded.role === 'CUSTOMER') {
        userExists = !!(await User.exists({ _id: decoded.sub, isActive: true }));
      } else {
        // We handle admin refresh in AdminAuthService, but theoretically it could be here
        userExists = true; 
      }

      if (!userExists) {
        throw new UnauthorizedError('User not found or inactive');
      }

      return this.generateTokens(decoded.sub, decoded.role);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }
}
