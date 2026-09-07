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
    const existing = await Product.findOne({ slug }).lean();
    
    if (existing) {
      throw new BadRequestError('Product with similar name already exists');
    }

    // Process variants
    if (!data.variants || !Array.isArray(data.variants) || data.variants.length === 0) {
      throw new BadRequestError('At least one variant is required');
    }
    
    // Ensure all variants have a SKU and valid data
    const processedVariants = data.variants.map((v: any) => ({
      ...v,
      sku: v.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      mrp: v.mrp !== undefined && v.mrp !== '' ? Number(v.mrp) : Number(v.price),
      price: Number(v.price),
      stock: Number(v.stock) || 0,
      unitValue: Number(v.unitValue),
      isAvailable: Number(v.stock) > 0,
    }));
    
    // Check for duplicate variant quantities
    const variantKeys = processedVariants.map((v: any) => `${v.unitValue}-${v.unit}`);
    if (new Set(variantKeys).size !== variantKeys.length) {
      throw new BadRequestError('Duplicate variants are not allowed');
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
      slug,
      images,
      thumbnail,
      variants: processedVariants,
      isAvailable: processedVariants.some((v: any) => v.stock > 0),
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

    if (data.variants && Array.isArray(data.variants)) {
      if (data.variants.length === 0) {
        throw new BadRequestError('At least one variant is required');
      }
      
      data.variants = data.variants.map((v: any) => ({
        ...v,
        sku: v.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        mrp: v.mrp !== undefined && v.mrp !== '' ? Number(v.mrp) : Number(v.price),
        price: Number(v.price),
        stock: Number(v.stock) || 0,
        unitValue: Number(v.unitValue),
        isAvailable: Number(v.stock) > 0,
      }));
      
      // Check for duplicate variant quantities
      const variantKeys = data.variants.map((v: any) => `${v.unitValue}-${v.unit}`);
      if (new Set(variantKeys).size !== variantKeys.length) {
        throw new BadRequestError('Duplicate variants are not allowed');
      }
      
      data.isAvailable = data.variants.some((v: any) => v.stock > 0);
    }

    const product = await Product.findByIdAndUpdate(id, { $set: data }, { new: true })
      .populate('category', 'name nameHindi')
      .lean();
      
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }

  /**
   * Admin: Update stock safely (for a specific variant)
   */
  static async updateStock(id: string, variantId: string, stock: number) {
    const isAvailable = stock > 0;
    
    // Find the product and update the specific variant's stock
    const product = await Product.findOneAndUpdate(
      { _id: id, 'variants._id': variantId },
      { 
        $set: { 
          'variants.$.stock': stock,
          'variants.$.isAvailable': isAvailable 
        } 
      },
      { new: true }
    ).lean();

    if (!product) throw new NotFoundError('Product or variant not found');
    
    // Update parent product availability if needed
    const anyAvailable = product.variants.some((v: any) => v.stock > 0);
    if (product.isAvailable !== anyAvailable) {
      await Product.findByIdAndUpdate(id, { isAvailable: anyAvailable });
    }

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

  /**
   * Admin: Delete product
   */
  static async deleteProduct(id: string) {
    const product = await Product.findById(id);
    if (!product) throw new NotFoundError('Product not found');

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      await Promise.all(
        product.images.map(img => deleteFromCloudinary(img.publicId))
      );
    } else if (product.thumbnail?.publicId) {
      await deleteFromCloudinary(product.thumbnail.publicId);
    }

    // Decrement product count from category
    if (product.category) {
      await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });
    }

    // Delete product from database
    await Product.findByIdAndDelete(id);

    return true;
  }
}
