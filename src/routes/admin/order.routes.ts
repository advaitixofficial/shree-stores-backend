import { Router } from 'express';
import { OrderController } from '../../controllers';
import { authenticateAdmin, requireRole, validate } from '../../middleware';
import { updateOrderStatusSchema, cancelOrderSchema, assignEmployeeSchema, paginationQuerySchema } from '../../schemas';

const router = Router();

router.use(authenticateAdmin);
router.use(requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']));

router.get('/', validate(paginationQuerySchema), OrderController.getAdminOrders);
router.get('/:id', OrderController.getAdminOrderById);
router.patch('/:id/status', validate(updateOrderStatusSchema), OrderController.updateOrderStatus);
router.post('/:id/cancel', requireRole(['SUPER_ADMIN', 'ADMIN']), validate(cancelOrderSchema), OrderController.cancelOrderAdmin);
router.post('/:id/assign', validate(assignEmployeeSchema), OrderController.assignEmployee);

export default router;
