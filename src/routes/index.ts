import { Router } from 'express';
import customerRoutes from './customer';
import adminRoutes from './admin';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Cashfree webhook (no authentication — verified via signature)
router.post('/webhooks/cashfree', PaymentController.cashfreeWebhook);

router.use('/customer', customerRoutes);
router.use('/admin', adminRoutes);

export default router;
