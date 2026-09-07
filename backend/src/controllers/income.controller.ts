import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { incomeService } from '../services/income.service';
import { setIncomeSchema, getIncomeByMonthParamsSchema } from '../validators/income.validator';

export class IncomeController {
  async setIncome(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const validatedData = setIncomeSchema.parse(req.body);
      const income = await incomeService.setIncome(userId, validatedData);

      return res.status(200).json({
        message: 'Income saved successfully',
        income,
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
        message: error.message || 'Failed to save income',
      });
    }
  }

  async getAllIncome(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const incomeList = await incomeService.getAllIncome(userId);

      return res.status(200).json({
        income: incomeList,
      });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({
        message: error.message || 'Failed to fetch income records',
      });
    }
  }

  async getIncomeByMonth(req: Request, res: Response) {
    try {
      const userId = req.userId!;
      const { year, month } = getIncomeByMonthParamsSchema.parse(req.params);
      const income = await incomeService.getIncomeByMonth(userId, year, month);

      return res.status(200).json({
        income,
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
        message: error.message || 'Failed to fetch income entry',
      });
    }
  }
}

export const incomeController = new IncomeController();
