import { z } from 'zod';

export const createExpenseSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be greater than 0'),
  categoryId: z
    .string()
    .min(1, 'Category ID is required'),
  date: z.coerce
    .date({ message: 'A valid date is required' }),
  description: z
    .string()
    .trim()
    .max(255, 'Description cannot exceed 255 characters')
    .optional(),
});

export const updateExpenseSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .optional(),
  categoryId: z
    .string()
    .min(1, 'Category ID cannot be empty')
    .optional(),
  date: z.coerce
    .date()
    .optional(),
  description: z
    .string()
    .trim()
    .max(255, 'Description cannot exceed 255 characters')
    .optional()
    .nullable(),
});

export const queryExpenseSchema = z.object({
  category: z
    .string()
    .trim()
    .optional(),
  startDate: z.coerce
    .date()
    .optional(),
  endDate: z.coerce
    .date()
    .optional(),
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type QueryExpenseInput = z.infer<typeof queryExpenseSchema>;
