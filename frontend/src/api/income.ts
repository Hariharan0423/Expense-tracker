import { api } from './client';
import type { SetIncomePayload } from '../types';

export const incomeApi = {
  setIncome: async (data: SetIncomePayload) => {
    const res = await api.post('/income', data);
    return res.data;
  },
};
