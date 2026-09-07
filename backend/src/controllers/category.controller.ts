import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { categoryService } from '../services/category.service';
import { createCategorySchema } from '../validators/category.validator';

export class CategoryController {
  async getCategories(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const categories = await categoryService.getCategories(userId);

      return res.status(200).json({
        categories,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        message: error.message || 'Failed to fetch categories',
      });
    }
  }

  async createCategory(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const validatedData = createCategorySchema.parse(req.body);
      const category = await categoryService.createCategory(userId, validatedData);

      return res.status(201).json({
        message: 'Category created successfully',
        category,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      return res.status(error.statusCode || 500).json({
        message: error.message || 'Failed to create category',
      });
    }
  }

  async deleteCategory(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const categoryId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const result = await categoryService.deleteCategory(userId, categoryId);

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        message: error.message || 'Failed to delete category',
      });
    }
  }
}

export const categoryController = new CategoryController();
