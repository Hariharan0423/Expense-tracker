export interface User {
  id: string;
  email: string;
  name?: string | null;
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  user: User;
}

export interface RefreshResponse {
  accessToken: string;
}

export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
  userId: string | null;
}

export interface CategoriesResponse {
  categories: Category[];
}

export interface CurrentMonthData {
  income: number;
  spent: number;
  remaining: number;
}

export interface RecentMonthData {
  month: number;
  year: number;
  income: number;
  spent: number;
}

export interface DashboardData {
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
  currentMonth: CurrentMonthData;
  recentMonths: RecentMonthData[];
}

export interface SetIncomePayload {
  month: number;
  year: number;
  amount: number;
  note?: string;
}

export interface CreateExpensePayload {
  amount: number;
  categoryId: string;
  date: string;
  description?: string;
}
