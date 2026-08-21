import { StoreSettings } from '../models/StoreSettings';
import { NotFoundError } from '../utils/errors';

export class SettingsService {
  /**
   * Get store settings. Creates default if none exist.
   */
  static async getSettings() {
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = await StoreSettings.create({
        storeName: 'Shree Stores',
        storeNameHindi: 'श्री स्टोर्स',
        phone: '+919876543210',
        email: 'info@shreestores.com',
        address: 'Varanasi',
        latitude: 25.2677,
        longitude: 82.9913,
      });
    }
    return settings;
  }

  /**
   * Update store settings.
   */
  static async updateSettings(data: any) {
    const settings = await StoreSettings.findOne();
    if (!settings) throw new NotFoundError('Settings not initialized');
    
    Object.assign(settings, data);
    await settings.save();
    return settings;
  }

  /**
   * Get public configuration for the customer app.
   */
  static async getPublicConfig() {
    const settings = await this.getSettings();
    if (!settings) throw new NotFoundError('Settings not found');
    
    // Pick only public fields
    return {
      storeName: settings.storeName,
      storeNameHindi: settings.storeNameHindi,
      logo: settings.logo,
      phone: settings.phone,
      email: settings.email,
      address: settings.address,
      latitude: settings.latitude,
      longitude: settings.longitude,
      deliveryEnabled: settings.deliveryEnabled,
      deliveryFee: settings.deliveryFee,
      freeDeliveryMinimum: settings.freeDeliveryMinimum,
      estimatedDeliveryMinutes: settings.estimatedDeliveryMinutes,
      currency: settings.currency,
      onlinePaymentEnabled: settings.onlinePaymentEnabled,
      codEnabled: settings.codEnabled,
      reviewsEnabled: settings.reviewsEnabled,
      couponsEnabled: settings.couponsEnabled,
      codMinimumOrder: settings.codMinimumOrder,
      codMaximumOrder: settings.codMaximumOrder,
    };
  }
}
