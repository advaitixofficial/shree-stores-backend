import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { NotFoundError, BadRequestError } from '../utils/errors';
import { buildPaginationMeta, generateSlug } from '../utils/helpers';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

export class ProductService {
  /**
   * Get paginated products for customers (only active/available).
   */
  static async getProducts(
    page: number,
    limit: number,
    sort: Record<string, 1 | -1>,
    filters: any
  ) {
    const skip = (page - 1) * limit;
    
    // Base filter for customers
    const query: any = { isActive: true };

    if (filters.category) query.category = filters.category;
    if (filters.isFeatured) query.isFeatured = true;
    if (filters.isAvailable !== undefined) query.isAvailable = filters.isAvailable;
    
    if (filters.minPrice || filters.maxPrice) {
      query.price = {};
      if (filters.minPrice) query.price.$gte = filters.minPrice;
      if (filters.maxPrice) query.price.$lte = filters.maxPrice;
    }

    // Partial-text search
    if (filters.q) {
      const safeQuery = filters.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: safeQuery, $options: 'i' } },
        { nameHindi: { $regex: safeQuery, $options: 'i' } },
        { sku: { $regex: safeQuery, $options: 'i' } },
        { description: { $regex: safeQuery, $options: 'i' } }
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('category', 'name nameHindi slug')
        .lean(),
      Product.countDocuments(query),
    ]);

    return {
      products,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  /**
   * Get product by ID (Customer).
   */
  static async getProductById(id: string) {
    const product = await Product.findOne({ _id: id, isActive: true })
      .populate('category', 'name nameHindi slug')
      .lean();
      
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  /**
   * Admin: Create product
   */
  static async createProduct(data: any, files?: Express.Multer.File[]) {
    // Generate slug
    const slug = generateSlug(data.name);
    const existing = await Product.findOne({ $or: [{ slug }, { sku: data.sku }] }).lean();
    
    if (existing) {
      if (existing.slug === slug) throw new BadRequestError('Product with similar name already exists');
      if (existing.sku === data.sku) throw new BadRequestError('Product with this SKU already exists');
    }

    // Handle image uploads
    const images = [];
    let thumbnail = null;

    if (files && files.length > 0) {
      for (const file of files) {
        const result = await uploadToCloudinary(file.buffer, 'products');
        images.push(result);
      }
      thumbnail = images[0]; // Set first image as thumbnail
    }

    const product = await Product.create({
      ...data,
      nameHindi: data.nameHindi || data.name,
      description: data.description || data.name,
      descriptionHindi: data.descriptionHindi || data.description || data.name,
      sku: data.sku || `SKU-${Date.now()}`,
      mrp: data.mrp !== undefined && data.mrp !== '' ? data.mrp : data.price,
      slug,
      images,
      thumbnail,
      isAvailable: data.stock > 0,
    });

    // Update category product count
    await Category.findByIdAndUpdate(data.category, { $inc: { productCount: 1 } });

    return product;
  }

  /**
   * Admin: Update product
   */
  static async updateProduct(id: string, data: any) {
    if (data.name) {
      data.slug = generateSlug(data.name);
      const existing = await Product.findOne({ slug: data.slug, _id: { $ne: id } }).lean();
      if (existing) throw new BadRequestError('Product with similar name already exists');
    }

    if (data.sku) {
      const existing = await Product.findOne({ sku: data.sku, _id: { $ne: id } }).lean();
      if (existing) throw new BadRequestError('Product with this SKU already exists');
    }

    // Auto-update availability based on stock if stock is provided
    if (data.stock !== undefined) {
      data.isAvailable = data.stock > 0;
    }

    const product = await Product.findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate('category', 'name nameHindi')
      .lean();
      
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  /**
   * Admin: Update stock safely
   */
  static async updateStock(id: string, stock: number) {
    const isAvailable = stock > 0;
    const product = await Product.findByIdAndUpdate(
      id,
      { $set: { stock, isAvailable } },
      { new: true }
    ).lean();

    if (!product) throw new NotFoundError('Product not found');
    
    // Optional: trigger socket event for inventory update
    return product;
  }

  /**
   * Admin: Upload product image
   */
  static async uploadImage(id: string, fileBuffer: Buffer) {
    const product = await Product.findById(id);
    if (!product) throw new NotFoundError('Product not found');

    const result = await uploadToCloudinary(fileBuffer, 'products');
    
    product.images.push(result);
    // Since the admin app currently only supports uploading a single primary image,
    // we make the latest uploaded image the thumbnail.
    product.thumbnail = result;
    
    await product.save();
    return product;
  }

  /**
   * Admin: Delete product image
   */
  static async deleteImage(id: string, publicId: string) {
    const product = await Product.findById(id);
    if (!product) throw new NotFoundError('Product not found');

    // Remove from array
    product.images = product.images.filter((img) => img.publicId !== publicId);
    
    // Update thumbnail if necessary
    if (product.thumbnail?.publicId === publicId) {
      product.thumbnail = product.images.length > 0 ? product.images[0] : undefined;
    }

    await Promise.all([
      deleteFromCloudinary(publicId),
      product.save()
    ]);

    return product;
  }
}
