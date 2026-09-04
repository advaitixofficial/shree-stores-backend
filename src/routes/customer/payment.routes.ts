import { Router } from 'express';
import { PaymentController } from '../../controllers/payment.controller';
import { authenticateCustomer } from '../../middleware';

const router = Router();

// Customer: Verify payment after checkout
router.post('/verify/:orderId', authenticateCustomer, PaymentController.verifyPayment);

export default router;
