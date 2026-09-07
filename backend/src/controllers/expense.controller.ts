import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { expenseService } from '../services/expense.service';
import { createExpenseSchema, updateExpenseSchema, queryExpenseSchema } from '../validators/expense.validator';

export class ExpenseController {
  async createExpense(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const validatedData = createExpenseSchema.parse(req.body);
      const expense = await expenseService.createExpense(userId, validatedData);

      return res.status(201).json({
        message: 'Expense created successfully',
        expense,
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
        message: error.message || 'Failed to create expense',
      });
    }
  }

  async getExpenses(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const validatedQuery = queryExpenseSchema.parse(req.query);
      const result = await expenseService.getExpenses(userId, validatedQuery);

      return res.status(200).json(result);
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
        message: error.message || 'Failed to fetch expenses',
      });
    }
  }

  async updateExpense(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const expenseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const validatedData = updateExpenseSchema.parse(req.body);
      const expense = await expenseService.updateExpense(userId, expenseId, validatedData);

      return res.status(200).json({
        message: 'Expense updated successfully',
        expense,
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
        message: error.message || 'Failed to update expense',
      });
    }
  }

  async deleteExpense(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const expenseId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const result = await expenseService.deleteExpense(userId, expenseId);

      return res.status(200).json(result);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        message: error.message || 'Failed to delete expense',
      });
    }
  }

  async getDashboard(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const dashboard = await expenseService.getDashboard(userId);

      return res.status(200).json(dashboard);
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        message: error.message || 'Failed to fetch dashboard data',
      });
    }
  }
}

export const expenseController = new ExpenseController();
