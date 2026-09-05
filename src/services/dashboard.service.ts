import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { User } from '../models/User';

export class DashboardService {
  static async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      ordersToday,
      revenueTodayResult,
      revenueWeekResult,
      revenueMonthResult,
      revenueTotalResult,
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
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfWeek }, orderStatus: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, orderStatus: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'CANCELLED' } } },
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
    const revenueThisWeek = revenueWeekResult.length > 0 ? revenueWeekResult[0].total : 0;
    const revenueThisMonth = revenueMonthResult.length > 0 ? revenueMonthResult[0].total : 0;
    const revenueTotal = revenueTotalResult.length > 0 ? revenueTotalResult[0].total : 0;

    return {
      today: {
        orders: ordersToday,
        revenue: revenueToday,
        pending: pendingOrders,
        preparing: preparingOrders,
        outForDelivery: outForDeliveryOrders,
      },
      revenue: {
        today: revenueToday,
        thisWeek: revenueThisWeek,
        thisMonth: revenueThisMonth,
        total: revenueTotal,
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
