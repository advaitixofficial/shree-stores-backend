import { Router } from 'express';
import { NotificationController } from '../../controllers';
import { authenticateCustomer } from '../../middleware';

const router = Router();

router.use(authenticateCustomer);

router.get('/', NotificationController.getCustomerNotifications);
router.patch('/read-all', NotificationController.markAllAsRead);
router.patch('/:id/read', NotificationController.markAsRead);
router.delete('/clear-all', NotificationController.deleteAll);

export default router;
