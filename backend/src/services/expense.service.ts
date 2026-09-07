import prisma from '../config/prisma';
import { CreateExpenseInput, UpdateExpenseInput, QueryExpenseInput } from '../validators/expense.validator';

export class ExpenseService {
  /**
   * Helper: checks if a category exists and is accessible to this user
   * (either system default or owned by the user).
   */
  async validateCategoryVisibility(userId: string, categoryId: string) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [{ userId: null }, { userId }],
      },
    });

    if (!category) {
      const error: any = new Error('Category not found or not accessible');
      error.statusCode = 400;
      throw error;
    }

    return category;
  }

  /**
   * Create an expense entry.
   */
  async createExpense(userId: string, input: CreateExpenseInput) {
    // Validate category accessibility
    await this.validateCategoryVisibility(userId, input.categoryId);

    return prisma.expense.create({
      data: {
        amount: input.amount,
        categoryId: input.categoryId,
        date: input.date,
        description: input.description ?? null,
        userId,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * List expenses for the authenticated user with optional filters and pagination.
   */
  async getExpenses(userId: string, query: QueryExpenseInput) {
    const { category, startDate, endDate, page, limit } = query;

    const where: any = { userId };

    if (category) {
      where.categoryId = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [expenses, total] = await prisma.$transaction([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          category: true,
        },
      }),
      prisma.expense.count({ where }),
    ]);

    return {
      expenses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update an expense, strictly enforcing that it belongs to the authenticated user.
   */
  async updateExpense(userId: string, expenseId: string, input: UpdateExpenseInput) {
    // Ownership check (IDOR protection)
    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!existing) {
      const error: any = new Error('Expense not found');
      error.statusCode = 404;
      throw error;
    }

    if (input.categoryId) {
      await this.validateCategoryVisibility(userId, input.categoryId);
    }

    return prisma.expense.update({
      where: { id: expenseId },
      data: {
        amount: input.amount,
        categoryId: input.categoryId,
        date: input.date,
        description: input.description,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Delete an expense, strictly enforcing that it belongs to the authenticated user.
   */
  async deleteExpense(userId: string, expenseId: string) {
    const existing = await prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });

    if (!existing) {
      const error: any = new Error('Expense not found');
      error.statusCode = 404;
      throw error;
    }

    await prisma.expense.delete({
      where: { id: expenseId },
    });

    return { message: 'Expense deleted successfully' };
  }

  /**
   * Dashboard & Balance metrics:
   * - Total income ever entered for this user
   * - Total expenses ever recorded for this user
   * - Available balance (totalIncome - totalExpenses)
   * - Current month income, spent, and remaining
   * - Trend of recent 6 months
   */
  async getDashboard(userId: string) {
    // 1. Overall Lifetime Aggregates
    const [incomeAggregate, expenseAggregate] = await prisma.$transaction([
      prisma.income.aggregate({
        _sum: { amount: true },
        where: { userId },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { userId },
      }),
    ]);

    const totalIncome = Number(incomeAggregate._sum.amount ?? 0);
    const totalExpenses = Number(expenseAggregate._sum.amount ?? 0);
    const availableBalance = Number((totalIncome - totalExpenses).toFixed(2));

    // 2. Current Month Calculation
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    const startOfCurrentMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfCurrentMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const [currentMonthIncomeRecord, currentMonthExpenseAggregate] = await prisma.$transaction([
      prisma.income.findUnique({
        where: {
          userId_month_year: {
            userId,
            month: currentMonth,
            year: currentYear,
          },
        },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          date: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth,
          },
        },
      }),
    ]);

    const currentIncome = Number(currentMonthIncomeRecord?.amount ?? 0);
    const currentSpent = Number(currentMonthExpenseAggregate._sum.amount ?? 0);
    const currentRemaining = Number((currentIncome - currentSpent).toFixed(2));

    // 3. Last 6 Months Trend
    const monthsList: Array<{ year: number; month: number; start: Date; end: Date }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      monthsList.push({ year: y, month: m, start, end });
    }

    // Fetch incomes for these 6 months in a single query
    const sixMonthIncomes = await prisma.income.findMany({
      where: {
        userId,
        OR: monthsList.map((item) => ({ year: item.year, month: item.month })),
      },
    });

    // Execute the 6 indexed expense sum queries in a single database transaction
    const sixMonthExpenseAggregates = await prisma.$transaction(
      monthsList.map((item) =>
        prisma.expense.aggregate({
          _sum: { amount: true },
          where: {
            userId,
            date: {
              gte: item.start,
              lte: item.end,
            },
          },
        })
      )
    );

    const recentMonths = monthsList.map((item, index) => {
      const inc = sixMonthIncomes.find((i) => i.year === item.year && i.month === item.month);
      const exp = sixMonthExpenseAggregates[index];
      const monthIncome = Number(inc?.amount ?? 0);
      const monthSpent = Number(exp._sum.amount ?? 0);

      return {
        month: item.month,
        year: item.year,
        income: monthIncome,
        spent: monthSpent,
      };
    });

    return {
      totalIncome,
      totalExpenses,
      availableBalance,
      currentMonth: {
        income: currentIncome,
        spent: currentSpent,
        remaining: currentRemaining,
      },
      recentMonths,
    };
  }
}

export const expenseService = new ExpenseService();
