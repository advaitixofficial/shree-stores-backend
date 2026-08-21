
import { connectDatabase } from '../config/database';
import { Admin } from '../models/Admin';
import { StoreSettings } from '../models/StoreSettings';

async function seed() {
  try {
    await connectDatabase();

    console.log('Seeding database...');

    // 1. Create Super Admin
    const superAdminEmail = 'admin@shreestores.com';
    const existingAdmin = await Admin.findOne({ email: superAdminEmail });
    if (!existingAdmin) {
      await Admin.create({
        name: 'Store Manager',
        email: superAdminEmail,
        passwordHash: 'Admin@123', // Mongoose pre-save hook will hash this
        role: 'SUPER_ADMIN',
        permissions: ['*'],
      });
      console.log(`[+] Super Admin created: ${superAdminEmail}`);
    } else {
      console.log(`[-] Super Admin already exists: ${superAdminEmail}`);
    }

    // 2. Create Default Store Settings
    const existingSettings = await StoreSettings.findOne();
    if (!existingSettings) {
      await StoreSettings.create({
        storeName: 'Shree Stores',
        storeNameHindi: 'श्री स्टोर्स',
        phone: '+919876543210',
        email: 'support@shreestores.com',
        address: 'Varanasi, UP',
        latitude: 25.3176,
        longitude: 82.9739,
        deliveryEnabled: true,
        deliveryRadiusKm: 5,
        deliveryFee: 20,
        freeDeliveryMinimum: 500,
      });
      console.log('[+] Default store settings created.');
    } else {
      console.log('[-] Store settings already exist.');
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
