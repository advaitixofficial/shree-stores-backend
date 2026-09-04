import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import catalogRoutes from './catalog.routes';
import cartRoutes from './cart.routes';
import addressRoutes from './address.routes';
import orderRoutes from './order.routes';
import publicRoutes from './public.routes';
import notificationRoutes from './notification.routes';
import paymentRoutes from './payment.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/catalog', catalogRoutes); // covers products and categories
router.use('/cart', cartRoutes);
router.use('/addresses', addressRoutes);
router.use('/orders', orderRoutes);
router.use('/public', publicRoutes); // covers config and banners
router.use('/notifications', notificationRoutes);
router.use('/payments', paymentRoutes);

export default router;

