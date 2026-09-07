import prisma from '../config/prisma';
import { CreateCategoryInput } from '../validators/category.validator';

export class CategoryService {
  /**
   * Returns all categories visible to the user:
   * 1. System defaults (userId IS NULL)
   * 2. User's own custom categories (userId === userId)
   */
  async getCategories(userId: string) {
    return prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Creates a custom category for the logged-in user.
   */
  async createCategory(userId: string, input: CreateCategoryInput) {
    const trimmedName = input.name.trim();

    // Check if category name already exists (as default or user's custom)
    const existing = await prisma.category.findFirst({
      where: {
        OR: [
          { userId, name: { equals: trimmedName, mode: 'insensitive' } },
          { userId: null, name: { equals: trimmedName, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      const error: any = new Error(
        existing.isDefault
          ? `"${trimmedName}" is already available as a default category`
          : `You already have a category named "${trimmedName}"`
      );
      error.statusCode = 409;
      throw error;
    }

    return prisma.category.create({
      data: {
        name: trimmedName,
        userId,
        isDefault: false,
      },
    });
  }

  /**
   * Deletes a custom category.
   * - Blocks deleting system default categories (403)
   * - Prevents deleting another user's category (404 / IDOR guard)
   * - Handles Prisma P2003 error (onDelete: Restrict) when expenses are linked (400)
   */
  async deleteCategory(userId: string, categoryId: string) {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      const error: any = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }

    if (category.userId === null || category.isDefault) {
      const error: any = new Error('Default system categories cannot be deleted');
      error.statusCode = 403;
      throw error;
    }

    if (category.userId !== userId) {
      // Return 404 to avoid leaking existence of other users' categories
      const error: any = new Error('Category not found');
      error.statusCode = 404;
      throw error;
    }

    try {
      await prisma.category.delete({
        where: { id: categoryId },
      });
      return { message: 'Category deleted successfully' };
    } catch (error: any) {
      // P2003: Foreign key constraint violation (Expense.categoryId -> Category.id with onDelete: Restrict)
      if (error.code === 'P2003') {
        const customError: any = new Error(
          'Cannot delete this category because it is currently linked to one or more expenses. Please reassign or delete those expenses first.'
        );
        customError.statusCode = 400;
        throw customError;
      }
      throw error;
    }
  }
}

export const categoryService = new CategoryService();
