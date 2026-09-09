import { api } from './client';
import type { CreateExpensePayload } from '../types';

export const expensesApi = {
  createExpense: async (data: CreateExpensePayload) => {
    const res = await api.post('/expenses', data);
    return res.data;
  },
};
