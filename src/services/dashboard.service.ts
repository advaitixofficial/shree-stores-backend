import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';

export class DashboardService {
  static async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      ordersToday,
      revenueTodayResult,
      pendingOrders,
      preparingOrders,
      outForDeliveryOrders,
      totalCustomers,
      totalProducts,
      lowStockProducts,
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: today }, orderStatus: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.countDocuments({ orderStatus: 'PLACED' }),
      Order.countDocuments({ orderStatus: 'PREPARING' }),
      Order.countDocuments({ orderStatus: 'OUT_FOR_DELIVERY' }),
      User.countDocuments({ role: 'CUSTOMER' }),
      Product.countDocuments(),
      Product.countDocuments({ $expr: { $lte: ['$stock', '$lowStockThreshold'] } }),
    ]);

    const revenueToday = revenueTodayResult.length > 0 ? revenueTodayResult[0].total : 0;

    return {
      today: {
        orders: ordersToday,
        revenue: revenueToday,
        pending: pendingOrders,
        preparing: preparingOrders,
        outForDelivery: outForDeliveryOrders,
      },
      customers: {
        total: totalCustomers,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
      },
    };
  }
}
