import { Router } from 'express';
import { SettingsController, NotificationController } from '../../controllers';
import { authenticateAdmin, requireRole, validate } from '../../middleware';
import { updateStoreSettingsSchema } from '../../schemas';

const router = Router();

router.use(authenticateAdmin);
router.use(requireRole(['SUPER_ADMIN', 'ADMIN']));

router.get('/settings', SettingsController.getSettings);
router.put('/settings', validate(updateStoreSettingsSchema), SettingsController.updateSettings);

router.get('/dashboard', requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), SettingsController.getDashboardStats);
router.get('/reports', SettingsController.getSalesReport);

// Notifications
router.get('/notifications', requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), NotificationController.getAdminNotifications);
router.patch('/notifications/:id/read', NotificationController.markAdminAsRead);

export default router;
