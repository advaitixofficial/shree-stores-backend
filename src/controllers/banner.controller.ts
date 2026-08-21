import { Request, Response, NextFunction } from 'express';
import { BannerService } from '../services/banner.service';
import { sendSuccess } from '../utils/response';

export class BannerController {
  static async getActiveBanners(req: Request, res: Response, next: NextFunction) {
    try {
      const banners = await BannerService.getActiveBanners();
      sendSuccess(res, banners, 'Banners fetched');
    } catch (error) {
      next(error);
    }
  }

  static async createBanner(req: Request, res: Response, next: NextFunction) {
    try {
      const banner = await BannerService.createBanner(req.body, req.file?.buffer);
      sendSuccess(res, banner, 'Banner created', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateBanner(req: Request, res: Response, next: NextFunction) {
    try {
      const banner = await BannerService.updateBanner(req.params.id, req.body, req.file?.buffer);
      sendSuccess(res, banner, 'Banner updated');
    } catch (error) {
      next(error);
    }
  }

  static async deleteBanner(req: Request, res: Response, next: NextFunction) {
    try {
      await BannerService.deleteBanner(req.params.id);
      sendSuccess(res, null, 'Banner deleted');
    } catch (error) {
      next(error);
    }
  }
}
