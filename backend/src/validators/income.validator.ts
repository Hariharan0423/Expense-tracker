import { z } from 'zod';

export const setIncomeSchema = z.object({
  month: z
    .number()
    .int('Month must be an integer')
    .min(1, 'Month must be between 1 and 12')
    .max(12, 'Month must be between 1 and 12'),
  year: z
    .number()
    .int('Year must be an integer')
    .min(2000, 'Year must be 2000 or later')
    .max(2100, 'Year must be 2100 or earlier'),
  amount: z
    .number()
    .positive('Income amount must be greater than 0'),
  note: z
    .string()
    .trim()
    .max(255, 'Note cannot exceed 255 characters')
    .optional(),
});

export const getIncomeByMonthParamsSchema = z.object({
  year: z.coerce
    .number()
    .int('Year must be an integer')
    .min(2000, 'Year must be 2000 or later')
    .max(2100, 'Year must be 2100 or earlier'),
  month: z.coerce
    .number()
    .int('Month must be an integer')
    .min(1, 'Month must be between 1 and 12')
    .max(12, 'Month must be between 1 and 12'),
});

export type SetIncomeInput = z.infer<typeof setIncomeSchema>;
export type GetIncomeByMonthParams = z.infer<typeof getIncomeByMonthParamsSchema>;
