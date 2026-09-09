import { api } from './client';
import type { AuthResponse, RefreshResponse, User } from '../types';

export interface SignupCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export const authApi = {
  signup: async (data: SignupCredentials) => {
    const res = await api.post<{ message: string; user: User }>('/auth/signup', data);
    return res.data;
  },

  login: async (data: LoginCredentials) => {
    const res = await api.post<AuthResponse>('/auth/login', data);
    return res.data;
  },

  refresh: async () => {
    const res = await api.post<RefreshResponse>('/auth/refresh');
    return res.data;
  },

  logout: async () => {
    const res = await api.post<{ message: string }>('/auth/logout');
    return res.data;
  },
};
