// ============================================================
// Shree Stores Backend — Sales & Marketing Reports Service
// Centralized MongoDB aggregation reporting pipelines.
// ============================================================

import { Order } from '../models/Order';
import { User } from '../models/User';
import { Delivery } from '../models/Delivery';

export class ReportService {
  /**
   * Get Sales Overview report grouped by day, week, or month.
   */
  static async getSalesReport(startDate: Date, endDate: Date, interval: 'day' | 'week' | 'month' = 'day') {
    let groupFormat = '%Y-%m-%d';
    if (interval === 'week') {
      groupFormat = '%Y-W%U';
    } else if (interval === 'month') {
      groupFormat = '%Y-%m';
    }

    const salesOverTime = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          orderStatus: { $ne: 'CANCELLED' },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Summary statistics
    const summaryResult = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: { $cond: [{ $ne: ['$orderStatus', 'CANCELLED'] }, '$total', 0] },
          },
          totalOrders: { $sum: 1 },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'CANCELLED'] }, 1, 0] },
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'DELIVERED'] }, 1, 0] },
          },
        },
      },
    ]);

    const summary = summaryResult[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      cancelledOrders: 0,
      deliveredOrders: 0,
    };

    return {
      summary,
      salesOverTime,
    };
  }

  /**
   * Get Top Selling Products.
   */
  static async getTopProducts(startDate: Date, endDate: Date, limit: number = 10) {
    return Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          orderStatus: { $ne: 'CANCELLED' },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.productName' },
          nameHindi: { $first: '$items.productNameHindi' },
          image: { $first: '$items.image' },
          unitsSold: { $sum: '$items.quantity' },
          revenueGenerated: { $sum: '$items.total' },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: limit },
    ]);
  }

  /**
   * Get Customer Growth analytics.
   */
  static async getCustomerGrowth(startDate: Date, endDate: Date) {
    return User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          role: 'CUSTOMER',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          newCustomers: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  /**
   * Get Delivery Employee performance report.
   */
  static async getDeliveryPerformance(startDate: Date, endDate: Date) {
    return Delivery.aggregate([
      {
        $match: {
          assignedAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$employee',
          totalDeliveries: { $sum: 1 },
          completedDeliveries: {
            $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] },
          },
          cancelledDeliveries: {
            $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employeeDetails',
        },
      },
      { $unwind: '$employeeDetails' },
      {
        $project: {
          employeeId: '$_id',
          name: '$employeeDetails.name',
          phone: '$employeeDetails.phone',
          totalDeliveries: 1,
          completedDeliveries: 1,
          cancelledDeliveries: 1,
        },
      },
      { $sort: { completedDeliveries: -1 } },
    ]);
  }
}
