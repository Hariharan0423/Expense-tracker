import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../api/dashboard';
import { categoriesApi } from '../api/categories';
import { incomeApi } from '../api/income';
import { expensesApi } from '../api/expenses';
import { incomeFormSchema } from '../validators/income.validator';
import type { IncomeFormData } from '../validators/income.validator';
import { expenseFormSchema } from '../validators/expense.validator';
import type { ExpenseFormData } from '../validators/expense.validator';
import axios from 'axios';

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();

  const [incomeSuccess, setIncomeSuccess] = useState<string | null>(null);
  const [incomeError, setIncomeError] = useState<string | null>(null);

  const [expenseSuccess, setExpenseSuccess] = useState<string | null>(null);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  // Determine current month and year for display and default income payload
  const today = new Date();
  const currentMonthNum = today.getMonth() + 1; // 1-indexed (1-12)
  const currentYearNum = today.getFullYear();
  const todayDateStr = today.toISOString().split('T')[0];
  const currentMonthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  // 1. Fetch Dashboard data
  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    error: dashboardFetchError,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getDashboard,
  });

  // 2. Fetch Categories for the expense dropdown
  const {
    data: categoriesData,
    isLoading: isCategoriesLoading,
  } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getCategories,
  });

  // Income Form
  const {
    register: registerIncome,
    handleSubmit: handleIncomeSubmit,
    reset: resetIncomeForm,
    formState: { errors: incomeErrors, isSubmitting: isIncomeSubmitting },
  } = useForm<IncomeFormData>({
    resolver: zodResolver(incomeFormSchema),
  });

  // Expense Form
  const {
    register: registerExpense,
    handleSubmit: handleExpenseSubmit,
    reset: resetExpenseForm,
    formState: { errors: expenseErrors, isSubmitting: isExpenseSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      date: todayDateStr,
      categoryId: '',
    },
  });

  // Mutation: Set Income for Current Month
  const incomeMutation = useMutation({
    mutationFn: incomeApi.setIncome,
    onSuccess: () => {
      // Invalidate the dashboard query cache so React Query re-fetches the latest totals
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setIncomeSuccess(`Income for ${currentMonthName} updated successfully!`);
      setIncomeError(null);
      resetIncomeForm();
    },
    onError: (err: unknown) => {
      setIncomeSuccess(null);
      if (axios.isAxiosError(err)) {
        setIncomeError(err.response?.data?.message || 'Failed to update income.');
      } else {
        setIncomeError('An unexpected error occurred.');
      }
    },
  });

  // Mutation: Add Expense
  const expenseMutation = useMutation({
    mutationFn: expensesApi.createExpense,
    onSuccess: () => {
      // Invalidate the dashboard query cache so React Query re-fetches the latest totals
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setExpenseSuccess('Expense added successfully!');
      setExpenseError(null);
      resetExpenseForm({
        date: todayDateStr,
        categoryId: '',
        amount: undefined as unknown as number,
        description: '',
      });
    },
    onError: (err: unknown) => {
      setExpenseSuccess(null);
      if (axios.isAxiosError(err)) {
        setExpenseError(err.response?.data?.message || 'Failed to create expense.');
      } else {
        setExpenseError('An unexpected error occurred.');
      }
    },
  });

  const onIncomeSubmit = (data: IncomeFormData) => {
    setIncomeSuccess(null);
    setIncomeError(null);
    incomeMutation.mutate({
      month: currentMonthNum,
      year: currentYearNum,
      amount: data.amount,
      note: data.note || undefined,
    });
  };

  const onExpenseSubmit = (data: ExpenseFormData) => {
    setExpenseSuccess(null);
    setExpenseError(null);
    expenseMutation.mutate({
      amount: data.amount,
      categoryId: data.categoryId,
      date: data.date,
      description: data.description || undefined,
    });
  };

  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.appTitle}>Expense Tracker</h1>
          <span style={styles.userEmail}>
            Logged in as <strong>{user?.email || 'User'}</strong>
            {user?.name ? ` (${user.name})` : ''}
          </span>
        </div>
        <button onClick={() => logout()} style={styles.logoutButton}>
          Sign Out
        </button>
      </header>

      <main style={styles.mainContent}>
        {/* Metric Cards */}
        <section>
          <h2 style={styles.sectionHeading}>Financial Overview</h2>

          {isDashboardLoading && <p style={styles.loadingText}>Loading dashboard metrics...</p>}

          {isDashboardError && (
            <div style={styles.alertError}>
              Failed to load dashboard data:{' '}
              {axios.isAxiosError(dashboardFetchError)
                ? dashboardFetchError.response?.data?.message || dashboardFetchError.message
                : 'Network error'}
            </div>
          )}

          {dashboard && (
            <>
              {/* Lifetime Overview */}
              <div style={styles.cardsGrid}>
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>Total Lifetime Income</span>
                  <span style={{ ...styles.metricValue, color: '#16a34a' }}>
                    {formatCurrency(dashboard.totalIncome)}
                  </span>
                </div>
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>Total Lifetime Expenses</span>
                  <span style={{ ...styles.metricValue, color: '#dc2626' }}>
                    {formatCurrency(dashboard.totalExpenses)}
                  </span>
                </div>
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>Available Balance</span>
                  <span
                    style={{
                      ...styles.metricValue,
                      color: dashboard.availableBalance >= 0 ? '#2563eb' : '#dc2626',
                    }}
                  >
                    {formatCurrency(dashboard.availableBalance)}
                  </span>
                </div>
              </div>

              {/* Current Month Overview */}
              <h3 style={styles.subSectionHeading}>Current Month ({currentMonthName})</h3>
              <div style={styles.cardsGrid}>
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>Month Income</span>
                  <span style={{ ...styles.metricValue, color: '#16a34a' }}>
                    {formatCurrency(dashboard.currentMonth?.income)}
                  </span>
                </div>
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>Month Spent</span>
                  <span style={{ ...styles.metricValue, color: '#dc2626' }}>
                    {formatCurrency(dashboard.currentMonth?.spent)}
                  </span>
                </div>
                <div style={styles.metricCard}>
                  <span style={styles.metricLabel}>Month Remaining</span>
                  <span
                    style={{
                      ...styles.metricValue,
                      color:
                        (dashboard.currentMonth?.remaining ?? 0) >= 0 ? '#059669' : '#dc2626',
                    }}
                  >
                    {formatCurrency(dashboard.currentMonth?.remaining)}
                  </span>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Action Forms Grid */}
        <section style={styles.formsGrid}>
          {/* Form 1: Set Income */}
          <div style={styles.formCard}>
            <h3 style={styles.cardTitle}>Set Income for {currentMonthName}</h3>
            <p style={styles.cardSubtitle}>
              Sets or updates the baseline budget for this month ({currentMonthNum}/{currentYearNum}).
            </p>

            {incomeSuccess && <div style={styles.alertSuccess}>{incomeSuccess}</div>}
            {incomeError && <div style={styles.alertError}>{incomeError}</div>}

            <form onSubmit={handleIncomeSubmit(onIncomeSubmit)} style={styles.form}>
              <div style={styles.formGroup}>
                <label htmlFor="income-amount" style={styles.label}>
                  Income Amount (₹) *
                </label>
                <input
                  id="income-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 50000.00"
                  {...registerIncome('amount', { valueAsNumber: true })}
                  style={styles.input}
                />
                {incomeErrors.amount && (
                  <span style={styles.fieldError}>{incomeErrors.amount.message}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="income-note" style={styles.label}>
                  Optional Note
                </label>
                <input
                  id="income-note"
                  type="text"
                  placeholder="e.g. Salary + Freelance"
                  {...registerIncome('note')}
                  style={styles.input}
                />
                {incomeErrors.note && (
                  <span style={styles.fieldError}>{incomeErrors.note.message}</span>
                )}
              </div>

              <button
                type="submit"
                disabled={isIncomeSubmitting || incomeMutation.isPending}
                style={styles.submitButton}
              >
                {isIncomeSubmitting || incomeMutation.isPending
                  ? 'Saving Income...'
                  : 'Save Month Income'}
              </button>
            </form>
          </div>

          {/* Form 2: Add Expense */}
          <div style={styles.formCard}>
            <h3 style={styles.cardTitle}>Add an Expense</h3>
            <p style={styles.cardSubtitle}>Log a new expense towards this month's budget.</p>

            {expenseSuccess && <div style={styles.alertSuccess}>{expenseSuccess}</div>}
            {expenseError && <div style={styles.alertError}>{expenseError}</div>}

            <form onSubmit={handleExpenseSubmit(onExpenseSubmit)} style={styles.form}>
              <div style={styles.formGroup}>
                <label htmlFor="expense-amount" style={styles.label}>
                  Amount (₹) *
                </label>
                <input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 450.00"
                  {...registerExpense('amount', { valueAsNumber: true })}
                  style={styles.input}
                />
                {expenseErrors.amount && (
                  <span style={styles.fieldError}>{expenseErrors.amount.message}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="expense-category" style={styles.label}>
                  Category *
                </label>
                <select
                  id="expense-category"
                  {...registerExpense('categoryId')}
                  style={styles.select}
                  disabled={isCategoriesLoading}
                >
                  <option value="">
                    {isCategoriesLoading ? 'Loading categories...' : '-- Select a Category --'}
                  </option>
                  {categoriesData?.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {expenseErrors.categoryId && (
                  <span style={styles.fieldError}>{expenseErrors.categoryId.message}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="expense-date" style={styles.label}>
                  Date *
                </label>
                <input
                  id="expense-date"
                  type="date"
                  {...registerExpense('date')}
                  style={styles.input}
                />
                {expenseErrors.date && (
                  <span style={styles.fieldError}>{expenseErrors.date.message}</span>
                )}
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="expense-desc" style={styles.label}>
                  Description (Optional)
                </label>
                <input
                  id="expense-desc"
                  type="text"
                  placeholder="e.g. Groceries at Trader Joe's"
                  {...registerExpense('description')}
                  style={styles.input}
                />
                {expenseErrors.description && (
                  <span style={styles.fieldError}>{expenseErrors.description.message}</span>
                )}
              </div>

              <button
                type="submit"
                disabled={isExpenseSubmitting || expenseMutation.isPending}
                style={{ ...styles.submitButton, backgroundColor: '#dc2626' }}
              >
                {isExpenseSubmitting || expenseMutation.isPending
                  ? 'Adding Expense...'
                  : 'Add Expense'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0',
  },
  appTitle: {
    margin: 0,
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  userEmail: {
    fontSize: '0.85rem',
    color: '#64748b',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    backgroundColor: '#ffffff',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  mainContent: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '2rem 1.5rem',
  },
  sectionHeading: {
    fontSize: '1.25rem',
    fontWeight: 600,
    margin: '0 0 1rem 0',
    color: '#1e293b',
  },
  subSectionHeading: {
    fontSize: '1.05rem',
    fontWeight: 600,
    margin: '1.5rem 0 0.75rem 0',
    color: '#334155',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
  },
  metricCard: {
    backgroundColor: '#ffffff',
    padding: '1.25rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },
  metricLabel: {
    fontSize: '0.825rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.025em',
    color: '#64748b',
  },
  metricValue: {
    fontSize: '1.6rem',
    fontWeight: 700,
  },
  formsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.5rem',
    marginTop: '2.5rem',
  },
  formCard: {
    backgroundColor: '#ffffff',
    padding: '1.5rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.07)',
  },
  cardTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '1.15rem',
    fontWeight: 600,
    color: '#0f172a',
  },
  cardSubtitle: {
    margin: '0 0 1.25rem 0',
    fontSize: '0.825rem',
    color: '#64748b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: '#334155',
  },
  input: {
    padding: '0.55rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.95rem',
    outline: 'none',
  },
  select: {
    padding: '0.55rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.95rem',
    backgroundColor: '#ffffff',
    outline: 'none',
  },
  submitButton: {
    padding: '0.65rem 1rem',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.95rem',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  fieldError: {
    color: '#dc2626',
    fontSize: '0.8rem',
  },
  alertSuccess: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
    padding: '0.6rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
  alertError: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    padding: '0.6rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '0.95rem',
  },
};
