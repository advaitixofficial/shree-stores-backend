import { User } from '../models/User';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';
import { NotFoundError, BadRequestError } from '../utils/errors';

export class UserService {
  /**
   * Get customer profile.
   */
  static async getProfile(userId: string) {
    const user = await User.findById(userId).lean();
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  /**
   * Update customer profile details.
   */
  static async updateProfile(userId: string, data: Partial<{ firstName: string; lastName: string; email: string; preferredLanguage: string }>) {
    // If email is being updated, ensure it's not taken by another user
    if (data.email) {
      const existing = await User.findOne({ email: data.email, _id: { $ne: userId } }).lean();
      if (existing) {
        throw new BadRequestError('Email is already in use by another account');
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { $set: data }, { new: true }).lean();
    if (!updatedUser) throw new NotFoundError('User not found');
    
    return updatedUser;
  }

  /**
   * Upload and update profile image.
   */
  static async uploadProfileImage(userId: string, fileBuffer: Buffer) {
    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    // Delete old image if it exists
    if (user.profileImage?.publicId) {
      await deleteFromCloudinary(user.profileImage.publicId);
    }

    // Upload new image
    const result = await uploadToCloudinary(fileBuffer, 'profiles');
    
    user.profileImage = result;
    await user.save();

    return user;
  }
}
