import { z } from 'zod';

export const expenseFormSchema = z.object({
  amount: z
    .number({ message: 'Amount must be a number' })
    .positive('Amount must be greater than 0'),
  categoryId: z.string().min(1, 'Please select a category'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().trim().max(255, 'Description cannot exceed 255 characters').optional(),
});

export type ExpenseFormData = z.infer<typeof expenseFormSchema>;
