import { api } from './client';
import type { DashboardData } from '../types';

export const dashboardApi = {
  getDashboard: async (): Promise<DashboardData> => {
    const res = await api.get<DashboardData>('/dashboard');
    return res.data;
  },
};
