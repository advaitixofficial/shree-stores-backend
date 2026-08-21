import { Banner } from '../models/Banner';
import { NotFoundError } from '../utils/errors';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

export class BannerService {
  static async getActiveBanners() {
    return Banner.find({
      isActive: true,
      $or: [
        { startDate: null, endDate: null },
        { startDate: { $lte: new Date() }, endDate: { $gte: new Date() } },
      ],
    }).sort({ sortOrder: 1 }).lean();
  }

  static async createBanner(data: any, fileBuffer?: Buffer) {
    let image = undefined;
    if (fileBuffer) {
      image = await uploadToCloudinary(fileBuffer, 'banners');
    }
    return Banner.create({ ...data, image });
  }

  static async updateBanner(id: string, data: any, fileBuffer?: Buffer) {
    const banner = await Banner.findById(id);
    if (!banner) throw new NotFoundError('Banner not found');

    if (fileBuffer) {
      if (banner.image?.publicId) {
        await deleteFromCloudinary(banner.image.publicId);
      }
      data.image = await uploadToCloudinary(fileBuffer, 'banners');
    }

    Object.assign(banner, data);
    await banner.save();
    return banner;
  }

  static async deleteBanner(id: string) {
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) throw new NotFoundError('Banner not found');

    if (banner.image?.publicId) {
      await deleteFromCloudinary(banner.image.publicId);
    }
    return banner;
  }
}
