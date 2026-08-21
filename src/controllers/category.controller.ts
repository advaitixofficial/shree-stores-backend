import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { parsePagination, buildPaginationMeta } from '../utils/helpers';

export class CategoryController {
  // ---- Customer Facing ----

  static async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await CategoryService.getCategories();
      sendSuccess(res, categories, 'Categories fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.getCategory(req.params.id);
      sendSuccess(res, category, 'Category fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  // ---- Admin Facing ----

  static async getAdminCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit } = parsePagination(req.query);
      const result = await CategoryService.getAdminCategories(page, limit);
      sendPaginated(
        res,
        result.categories,
        buildPaginationMeta(result.total, page, limit),
        'Admin categories fetched successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.createCategory(req.body, req.file?.buffer);
      sendSuccess(res, category, 'Category created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await CategoryService.updateCategory(req.params.id, req.body, req.file?.buffer);
      sendSuccess(res, category, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      await CategoryService.deleteCategory(req.params.id);
      sendSuccess(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
