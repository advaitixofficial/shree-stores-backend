import { Address } from '../models/Address';
import { NotFoundError } from '../utils/errors';

export class AddressService {
  /**
   * Get all addresses for a user.
   */
  static async getAddresses(userId: string) {
    return Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 }).lean();
  }

  /**
   * Create a new address.
   */
  static async createAddress(userId: string, data: any) {
    // If it's marked as default, unset other defaults
    if (data.isDefault) {
      await Address.updateMany({ user: userId }, { isDefault: false });
    } else {
      // If this is their first address, force it to be default
      const count = await Address.countDocuments({ user: userId });
      if (count === 0) {
        data.isDefault = true;
      }
    }

    return Address.create({ ...data, user: userId });
  }

  /**
   * Update an address. Ensures user owns the address.
   */
  static async updateAddress(userId: string, addressId: string, data: any) {
    const address = await Address.findOne({ _id: addressId, user: userId });
    if (!address) throw new NotFoundError('Address not found');

    if (data.isDefault && !address.isDefault) {
      await Address.updateMany({ user: userId, _id: { $ne: addressId } }, { isDefault: false });
    }

    Object.assign(address, data);
    await address.save();
    return address;
  }

  /**
   * Set an address as default.
   */
  static async setDefault(userId: string, addressId: string) {
    const address = await Address.findOne({ _id: addressId, user: userId });
    if (!address) throw new NotFoundError('Address not found');

    // Remove old default
    await Address.updateMany({ user: userId }, { isDefault: false });
    
    // Set new default
    address.isDefault = true;
    await address.save();
    
    return address;
  }

  /**
   * Delete an address.
   */
  static async deleteAddress(userId: string, addressId: string) {
    const address = await Address.findOneAndDelete({ _id: addressId, user: userId }).lean();
    if (!address) throw new NotFoundError('Address not found');

    // If we deleted the default address, make the next latest address default
    if (address.isDefault) {
      const nextAddress = await Address.findOne({ user: userId }).sort({ createdAt: -1 });
      if (nextAddress) {
        nextAddress.isDefault = true;
        await nextAddress.save();
      }
    }

    return address;
  }
}
