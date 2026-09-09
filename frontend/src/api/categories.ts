import { api } from './client';
import type { CategoriesResponse } from '../types';

export const categoriesApi = {
  getCategories: async (): Promise<CategoriesResponse> => {
    const res = await api.get<CategoriesResponse>('/categories');
    return res.data;
  },
};
