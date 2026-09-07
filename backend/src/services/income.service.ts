import prisma from '../config/prisma';
import { SetIncomeInput } from '../validators/income.validator';

export class IncomeService {
  /**
   * Sets or updates monthly income using Prisma's upsert.
   * Relies on the unique compound constraint @@unique([userId, month, year]).
   */
  async setIncome(userId: string, input: SetIncomeInput) {
    const { month, year, amount, note } = input;

    return prisma.income.upsert({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
      update: {
        amount,
        note: note ?? null,
      },
      create: {
        userId,
        month,
        year,
        amount,
        note: note ?? null,
      },
    });
  }

  /**
   * Retrieves all income entries for the authenticated user,
   * sorted from most recent to oldest.
   */
  async getAllIncome(userId: string) {
    return prisma.income.findMany({
      where: { userId },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });
  }

  /**
   * Retrieves an income entry for a specific month/year for the authenticated user.
   */
  async getIncomeByMonth(userId: string, year: number, month: number) {
    const income = await prisma.income.findUnique({
      where: {
        userId_month_year: {
          userId,
          month,
          year,
        },
      },
    });

    if (!income) {
      const error: any = new Error(`No income record found for ${month}/${year}`);
      error.statusCode = 404;
      throw error;
    }

    return income;
  }
}

export const incomeService = new IncomeService();
