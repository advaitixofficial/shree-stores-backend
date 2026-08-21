import { Request, Response, NextFunction } from 'express';
import { SettingsService, DashboardService, ReportService } from '../services';
import { sendSuccess } from '../utils/response';

export class SettingsController {
  // ---- Customer Facing ----

  static async getPublicConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const config = await SettingsService.getPublicConfig();
      sendSuccess(res, config, 'Store config fetched');
    } catch (error) {
      next(error);
    }
  }

  // ---- Admin Facing ----

  static async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.getSettings();
      sendSuccess(res, settings, 'Store settings fetched');
    } catch (error) {
      next(error);
    }
  }

  static async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await SettingsService.updateSettings(req.body);
      sendSuccess(res, settings, 'Store settings updated');
    } catch (error) {
      next(error);
    }
  }

  static async getDashboardStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await DashboardService.getDashboardStats();
      sendSuccess(res, stats, 'Dashboard stats fetched');
    } catch (error) {
      next(error);
    }
  }

  static async getSalesReport(req: Request, res: Response, next: NextFunction) {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const interval = (req.query.interval as 'day' | 'week' | 'month') || 'day';

      const salesData = await ReportService.getSalesReport(startDate, endDate, interval);
      const topProducts = await ReportService.getTopProducts(startDate, endDate, 10);
      const customerGrowth = await ReportService.getCustomerGrowth(startDate, endDate);
      const deliveryPerformance = await ReportService.getDeliveryPerformance(startDate, endDate);

      sendSuccess(
        res,
        {
          ...salesData,
          topProducts,
          customerGrowth,
          deliveryPerformance,
        },
        'Sales and marketing reports fetched successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}
