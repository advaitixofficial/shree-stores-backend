import { Router } from 'express';
import { BannerController, CouponController } from '../../controllers';
import { authenticateAdmin, requireRole, validate, upload } from '../../middleware';
import { createBannerSchema, updateBannerSchema, createCouponSchema, updateCouponSchema } from '../../schemas';

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

export default router;
