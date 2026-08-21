import { Router } from 'express';
import customerRoutes from './customer';
import adminRoutes from './admin';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

router.use('/customer', customerRoutes);
router.use('/admin', adminRoutes);

export default router;
