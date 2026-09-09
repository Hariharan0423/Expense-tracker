import { z } from 'zod';

export const incomeFormSchema = z.object({
  amount: z
    .number({ message: 'Amount must be a number' })
    .positive('Amount must be greater than 0'),
  note: z.string().trim().max(255, 'Note cannot exceed 255 characters').optional(),
});

export type IncomeFormData = z.infer<typeof incomeFormSchema>;
