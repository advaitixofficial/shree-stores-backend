import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { parsePagination, parseSort } from '../utils/helpers';
import { BadRequestError } from '../utils/errors';

export class ProductController {
  // ---- Customer Facing ----

  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query);
      const sort = parseSort(req.query.sort as string, ['price', 'name', 'createdAt']);
      
      const filters = {
        q: req.query.q,
        category: req.query.category,
        isFeatured: req.query.isFeatured,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
      };

      const result = await ProductService.getProducts(page, limit, sort, filters);
      sendPaginated(res, result.products, result.pagination, 'Products fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.getProductById(req.params.id);
      sendSuccess(res, product, 'Product fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  // ---- Admin Facing ----

  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const product = await ProductService.createProduct(req.body, files);
      sendSuccess(res, product, 'Product created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await ProductService.updateProduct(req.params.id, req.body);
      sendSuccess(res, product, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateStock(req: Request, res: Response, next: NextFunction) {
    try {
      const { stock } = req.body;
      const product = await ProductService.updateStock(req.params.id, Number(stock));
      sendSuccess(res, product, 'Stock updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new BadRequestError('No image file provided');
      const product = await ProductService.uploadImage(req.params.id, req.file.buffer);
      sendSuccess(res, product, 'Image uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { publicId } = req.params;
      const product = await ProductService.deleteImage(req.params.id, publicId);
      sendSuccess(res, product, 'Image deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      await ProductService.deleteProduct(req.params.id);
      sendSuccess(res, null, 'Product deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
