import { Router } from 'express';
import { SettingsController, BannerController } from '../../controllers';

const router = Router();

// Public config / homepage data
router.get('/config', SettingsController.getPublicConfig);
router.get('/banners', BannerController.getActiveBanners);

export default router;
