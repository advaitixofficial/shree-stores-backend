import { Router } from 'express';
import { AuthController } from '../../controllers';
import { validate, otpLimiter, loginLimiter } from '../../middleware';
import { sendOtpSchema, verifyOtpSchema, registerSchema, refreshSchema } from '../../schemas';

const router = Router();

router.post('/send-otp', otpLimiter, validate(sendOtpSchema), AuthController.sendOtp);
router.post('/verify-otp', loginLimiter, validate(verifyOtpSchema), AuthController.verifyOtp);
router.post('/register', validate(registerSchema), AuthController.register);
router.post('/refresh', validate(refreshSchema), AuthController.refresh);
router.post('/logout', AuthController.logout);

export default router;
