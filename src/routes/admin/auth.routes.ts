import { Router } from 'express';
import { AdminAuthController } from '../../controllers';
import { validate, adminLoginLimiter, authenticateAdmin } from '../../middleware';
import { adminLoginSchema } from '../../schemas';

const router = Router();

router.post('/login', adminLoginLimiter, validate(adminLoginSchema), AdminAuthController.login);
router.get('/me', authenticateAdmin, AdminAuthController.getMe);
router.put('/push-token', authenticateAdmin, AdminAuthController.updatePushToken);

export default router;
