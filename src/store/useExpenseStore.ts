import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Expense {
    id: string;
    date: string;
    category: string;
    amount: number;
    description: string;
    type: 'fixed' | 'variable';
}

export interface Budget {
    monthlyIncome: number;
    rent: number;
    emiPayment: number;
    utilities: number;
    mobile: number;
    insurance: number;
    otherFixed: number;
}

interface ExpenseState {
    expenses: Expense[];
    budget: Budget | null;
    addExpense: (expense: Omit<Expense, 'id'>) => void;
    deleteExpense: (id: string) => void;
    setBudget: (budget: Budget) => void;
    getMonthExpenses: (month: number, year: number) => Expense[];
    getTotalSpent: (month: number, year: number) => number;
    getCategoryBreakdown: (month: number, year: number) => Record<string, number>;
}

export const useExpenseStore = create<ExpenseState>()(
    persist(
        (set, get) => ({
            expenses: [],
            budget: null,
            addExpense: (expense) => set((state) => ({
                expenses: [...state.expenses, { ...expense, id: Date.now().toString() }]
            })),
            deleteExpense: (id) => set((state) => ({
                expenses: state.expenses.filter(e => e.id !== id)
            })),
            setBudget: (budget) => set({ budget }),
            getMonthExpenses: (month, year) => {
                return get().expenses.filter(e => {
                    const d = new Date(e.date);
                    return d.getMonth() === month && d.getFullYear() === year;
                }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            },
            getTotalSpent: (month, year) => {
                return get().getMonthExpenses(month, year).reduce((sum, e) => sum + e.amount, 0);
            },
            getCategoryBreakdown: (month, year) => {
                const expenses = get().getMonthExpenses(month, year);
                return expenses.reduce((acc, e) => {
                    acc[e.category] = (acc[e.category] || 0) + e.amount;
                    return acc;
                }, {} as Record<string, number>);
            },
        }),
        { name: 'fincalix-expenses' }
    )
);
