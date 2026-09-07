import { Router } from 'express';
import { BannerController, CouponController, NotificationController } from '../../controllers';
import { authenticateAdmin, requireRole, validate, upload } from '../../middleware';
import { createBannerSchema, updateBannerSchema, createCouponSchema, updateCouponSchema, createNotificationSchema } from '../../schemas';

const router = Router();

router.use(authenticateAdmin);
router.use(requireRole(['SUPER_ADMIN', 'ADMIN'])); // Only admins manage marketing

// Banners
router.post('/banners', upload.single('image'), validate(createBannerSchema), BannerController.createBanner);
router.put('/banners/:id', upload.single('image'), validate(updateBannerSchema), BannerController.updateBanner);
router.delete('/banners/:id', BannerController.deleteBanner);

// Coupons
router.get('/coupons', CouponController.getCoupons);
router.post('/coupons', validate(createCouponSchema), CouponController.createCoupon);
router.put('/coupons/:id', validate(updateCouponSchema), CouponController.updateCoupon);
router.delete('/coupons/:id', CouponController.deleteCoupon);

// Push Notifications
router.post('/notifications', upload.single('image'), validate(createNotificationSchema), NotificationController.sendAdminPushNotification);

export default router;
