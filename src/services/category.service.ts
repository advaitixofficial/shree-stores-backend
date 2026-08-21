import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { generateSlug } from '../utils/helpers';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

export class CategoryService {
  /**
   * Get all active categories (Customer).
   */
  static async getCategories() {
    return Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean();
  }

  /**
   * Get single category by ID or slug.
   */
  static async getCategory(identifier: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
    const query = isObjectId ? { _id: identifier } : { slug: identifier };
    
    const category = await Category.findOne(query).lean();
    if (!category) throw new NotFoundError('Category not found');
    
    return category;
  }

  /**
   * Admin: Get all categories with pagination.
   */
  static async getAdminCategories(page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    const [categories, total] = await Promise.all([
      Category.find().sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Category.countDocuments(),
    ]);

    return { categories, total };
  }

  /**
   * Admin: Create category.
   */
  static async createCategory(data: any, fileBuffer?: Buffer) {
    const slug = generateSlug(data.name);
    const existing = await Category.findOne({ slug }).lean();
    
    if (existing) {
      throw new BadRequestError('Category with similar name already exists');
    }

    let image = undefined;
    if (fileBuffer) {
      image = await uploadToCloudinary(fileBuffer, 'categories');
    }

    return Category.create({ ...data, slug, image });
  }

  /**
   * Admin: Update category.
   */
  static async updateCategory(id: string, data: any, fileBuffer?: Buffer) {
    if (data.name) {
      data.slug = generateSlug(data.name);
      const existing = await Category.findOne({ slug: data.slug, _id: { $ne: id } }).lean();
      if (existing) throw new BadRequestError('Category with similar name already exists');
    }

    const category = await Category.findById(id);
    if (!category) throw new NotFoundError('Category not found');

    if (fileBuffer) {
      if (category.image?.publicId) {
        await deleteFromCloudinary(category.image.publicId);
      }
      data.image = await uploadToCloudinary(fileBuffer, 'categories');
    }

    Object.assign(category, data);
    await category.save();

    return category;
  }

  /**
   * Admin: Delete category (only if no products).
   */
  static async deleteCategory(id: string) {
    const productCount = await Product.countDocuments({ category: id });
    if (productCount > 0) {
      throw new BadRequestError(`Cannot delete category. It contains ${productCount} products.`);
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) throw new NotFoundError('Category not found');

    if (category.image?.publicId) {
      await deleteFromCloudinary(category.image.publicId);
    }

    return category;
  }
}
