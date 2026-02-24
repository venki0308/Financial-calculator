import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BudgetCategory {
    id: string;
    name: string;
    emoji: string;
    budgeted: number;
    spent: number;
}

export interface BudgetEntry {
    id: string;
    categoryId: string;
    amount: number;
    description: string;
    date: string;
}

interface BudgetTrackerState {
    monthlyBudget: number;
    monthlyIncome: number;
    totalBalance: number;
    currentBalance: number;
    savingsGoal: number;
    categories: BudgetCategory[];
    entries: BudgetEntry[];
    setMonthlyBudget: (amount: number) => void;
    setMonthlyIncome: (amount: number) => void;
    setTotalBalance: (amount: number) => void;
    setCurrentBalance: (amount: number) => void;
    setSavingsGoal: (amount: number) => void;
    addCategory: (cat: Omit<BudgetCategory, 'id' | 'spent'>) => void;
    deleteCategory: (id: string) => void;
    addEntry: (entry: Omit<BudgetEntry, 'id'>) => void;
    deleteEntry: (id: string) => void;
    getTotalSpent: () => number;
}

export const useBudgetTrackerStore = create<BudgetTrackerState>()(
    persist(
        (set, get) => ({
            monthlyBudget: 0,
            monthlyIncome: 0,
            totalBalance: 0,
            currentBalance: 0,
            savingsGoal: 0,
            categories: [],
            entries: [],
            setMonthlyBudget: (amount) => set({ monthlyBudget: amount }),
            setMonthlyIncome: (amount) => set({ monthlyIncome: amount }),
            setTotalBalance: (amount) => set({ totalBalance: amount }),
            setCurrentBalance: (amount) => set({ currentBalance: amount }),
            setSavingsGoal: (amount) => set({ savingsGoal: amount }),
            addCategory: (cat) =>
                set((s) => ({
                    categories: [...s.categories, { ...cat, id: Date.now().toString(), spent: 0 }],
                })),
            deleteCategory: (id) =>
                set((s) => ({
                    categories: s.categories.filter((c) => c.id !== id),
                    entries: s.entries.filter((e) => e.categoryId !== id),
                })),
            addEntry: (entry) =>
                set((s) => ({
                    entries: [...s.entries, { ...entry, id: Date.now().toString() }],
                })),
            deleteEntry: (id) =>
                set((s) => ({
                    entries: s.entries.filter((e) => e.id !== id),
                })),
            getTotalSpent: () => {
                const now = new Date();
                const month = now.getMonth(), year = now.getFullYear();
                return get().entries.filter(e => {
                    const d = new Date(e.date);
                    return d.getMonth() === month && d.getFullYear() === year;
                }).reduce((sum, e) => sum + e.amount, 0);
            },
        }),
        { name: 'budget-tracker-storage' }
    )
);
