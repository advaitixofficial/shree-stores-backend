import { Router } from 'express';
import { OrderController, CouponController } from '../../controllers';
import { authenticateCustomer, validate, idempotency } from '../../middleware';
import { createOrderSchema, cancelOrderSchema, validateCouponSchema, paginationQuerySchema } from '../../schemas';

const router = Router();

router.use(authenticateCustomer);

// Coupons
router.post('/coupons/validate', validate(validateCouponSchema), CouponController.validateCoupon);

// Orders
router.get('/', validate(paginationQuerySchema), OrderController.getCustomerOrders);
router.post('/', idempotency, validate(createOrderSchema), OrderController.createOrder);
router.post('/:id/cancel', validate(cancelOrderSchema), OrderController.cancelOrderCustomer);

export default router;
