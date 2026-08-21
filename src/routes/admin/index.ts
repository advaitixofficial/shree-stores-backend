import { Router } from 'express';
import authRoutes from './auth.routes';
import catalogRoutes from './catalog.routes';
import orderRoutes from './order.routes';
import employeeRoutes from './employee.routes';
import marketingRoutes from './marketing.routes';
import systemRoutes from './system.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/catalog', catalogRoutes);
router.use('/orders', orderRoutes);
router.use('/employees', employeeRoutes);
router.use('/marketing', marketingRoutes);
router.use('/', systemRoutes); // Settings & Dashboard

export default router;
