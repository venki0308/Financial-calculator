import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface BudgetCategory {
    id: string;
    name: string;
    emoji: string;
    budgeted: number;
    spent: number;
}

export interface Subscription {
    id: string;
    name: string;
    amount: number;
    billingCycle: 'monthly' | 'quarterly' | 'yearly';
    nextDueDate: string;
    category: string;
    colorTag: string;
    isActive: boolean;
}

export interface NetWorthEntry {
    month: string;
    assets: { label: string; value: number }[];
    liabilities: { label: string; value: number }[];
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
}

export interface Insight {
    id: string;
    type: 'warning' | 'success' | 'tip' | 'alert';
    title: string;
    message: string;
    actionLabel?: string;
    actionRoute?: string;
    dismissed: boolean;
    generatedAt: string;
}

export interface HealthScore {
    total: number;
    savingsScore: number;
    adherenceScore: number;
    consistencyScore: number;
    tips: string[];
    calculatedAt: string;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Debit Card' | 'Credit Card';

export interface BudgetEntry {
    id: string;
    categoryId: string;     // Built-in category key OR custom category id
    amount: number;
    description: string;
    date: string;           // ISO string (e.g. "2026-03-05T10:00:00.000Z")
    paymentMethod?: PaymentMethod;
}


export interface FixedExpenses {
    rent: number;
    utilities: number;
    mobile: number;
    insurance: number;
    emi: number;
    others: { id: string; label: string; amount: number }[];
}

export interface CategoryBudgets {
    food: number;
    transportation: number;
    shopping: number;
    entertainment: number;
    healthcare: number;
    education: number;
    groceries: number;
    personalCare: number;
    others: number;
}

export const EXPENSE_CATEGORIES = [
    { id: 'food', name: 'Food & Dining', icon: '🍽️' },
    { id: 'transportation', name: 'Transportation', icon: '🚗' },
    { id: 'shopping', name: 'Shopping', icon: '🛒' },
    { id: 'entertainment', name: 'Entertainment', icon: '🎮' },
    { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
    { id: 'education', name: 'Education', icon: '📚' },
    { id: 'groceries', name: 'Groceries', icon: '🛍️' },
    { id: 'personalCare', name: 'Personal Care', icon: '💇' },
    { id: 'others', name: 'Others', icon: '📌' },
] as const;

export type BuiltInCategoryId = (typeof EXPENSE_CATEGORIES)[number]['id'];

const defaultCategoryBudgets: CategoryBudgets = {
    food: 0, transportation: 0, shopping: 0, entertainment: 0,
    healthcare: 0, education: 0, groceries: 0, personalCare: 0, others: 0,
};

const defaultFixedExpenses: FixedExpenses = {
    rent: 0, utilities: 0, mobile: 0, insurance: 0, emi: 0, others: [],
};

interface BudgetTrackerState {
    monthlyIncome: number;
    currentBalance: number;
    totalBalance: number;
    savingsGoal: number;
    fixedExpenses: FixedExpenses;
    categoryBudgets: CategoryBudgets;
    // Custom user-defined categories (backward compat)
    categories: BudgetCategory[];
    entries: BudgetEntry[];

    subscriptions: Subscription[];
    netWorthHistory: NetWorthEntry[];
    insights: Insight[];
    healthScore: HealthScore | null;

    // Setters
    setMonthlyIncome: (v: number) => void;
    setCurrentBalance: (v: number) => void;
    setTotalBalance: (v: number) => void;
    setSavingsGoal: (v: number) => void;
    setMonthlyBudget: (v: number) => void;  // compat alias
    setFixedExpenses: (v: Partial<FixedExpenses>) => void;
    setCategoryBudgets: (v: Partial<CategoryBudgets>) => void;
    addCustomFixed: (label: string, amount: number) => void;
    removeCustomFixed: (id: string) => void;

    // Category CRUD (custom)
    addCategory: (cat: Omit<BudgetCategory, 'id' | 'spent'>) => void;
    deleteCategory: (id: string) => void;

    // Entry CRUD
    addEntry: (entry: Omit<BudgetEntry, 'id'>) => void;
    deleteEntry: (id: string) => void;
    updateEntry: (id: string, data: Partial<Omit<BudgetEntry, 'id'>>) => void;

    // Selectors
    getTotalFixed: () => number;
    getTotalSpent: () => number;
    getEntriesByMonth: (year: number, month: number) => BudgetEntry[];
    getEntriesByDate: (dateStr: string) => BudgetEntry[];
    getMonthlySpentByCategory: (categoryId: string) => number;

    addSubscription: (sub: Omit<Subscription, 'id'>) => void;
    updateSubscription: (id: string, updates: Partial<Subscription>) => void;
    deleteSubscription: (id: string) => void;

    addNetWorthSnapshot: (entry: NetWorthEntry) => void;

    setInsights: (insights: Insight[]) => void;
    dismissInsight: (id: string) => void;
    setHealthScore: (score: HealthScore) => void;
}

export const useBudgetTrackerStore = create<BudgetTrackerState>()(
    persist(
        (set, get) => ({
            monthlyIncome: 0,
            currentBalance: 0,
            totalBalance: 0,
            savingsGoal: 0,
            fixedExpenses: defaultFixedExpenses,
            categoryBudgets: defaultCategoryBudgets,
            categories: [],
            entries: [],
            subscriptions: [],
            netWorthHistory: [],
            insights: [],
            healthScore: null,

            setMonthlyIncome: (v) => set({ monthlyIncome: v }),
            setCurrentBalance: (v) => set({ currentBalance: v }),
            setTotalBalance: (v) => set({ totalBalance: v }),
            setSavingsGoal: (v) => set({ savingsGoal: v }),
            setMonthlyBudget: (v) => set({ monthlyIncome: v }), // compat

            setFixedExpenses: (v) => set((s) => ({
                fixedExpenses: { ...s.fixedExpenses, ...v },
            })),

            setCategoryBudgets: (v) => set((s) => ({
                categoryBudgets: { ...s.categoryBudgets, ...v },
            })),

            addCustomFixed: (label, amount) => set((s) => ({
                fixedExpenses: {
                    ...s.fixedExpenses,
                    others: [
                        ...s.fixedExpenses.others,
                        { id: Date.now().toString(), label, amount },
                    ],
                },
            })),

            removeCustomFixed: (id) => set((s) => ({
                fixedExpenses: {
                    ...s.fixedExpenses,
                    others: s.fixedExpenses.others.filter((o) => o.id !== id),
                },
            })),

            addCategory: (cat) => set((s) => ({
                categories: [...s.categories, { ...cat, id: Date.now().toString(), spent: 0 }],
            })),

            deleteCategory: (id) => set((s) => ({
                categories: s.categories.filter((c) => c.id !== id),
                entries: s.entries.filter((e) => e.categoryId !== id),
            })),

            addEntry: (entry) => set((s) => ({
                entries: [...s.entries, { ...entry, id: Date.now().toString() }],
            })),

            deleteEntry: (id) => set((s) => ({
                entries: s.entries.filter((e) => e.id !== id),
            })),

            updateEntry: (id, data) => set((s) => ({
                entries: s.entries.map((e) => e.id === id ? { ...e, ...data } : e),
            })),

            getTotalFixed: () => {
                const fe = get().fixedExpenses;
                const base = fe.rent + fe.utilities + fe.mobile + fe.insurance + fe.emi;
                const custom = fe.others.reduce((sum, o) => sum + o.amount, 0);
                return base + custom;
            },

            getTotalSpent: () => {
                const now = new Date();
                return get().getEntriesByMonth(now.getFullYear(), now.getMonth() + 1)
                    .reduce((sum, e) => sum + e.amount, 0);
            },

            getEntriesByMonth: (year, month) => {
                return get().entries.filter((e) => {
                    const d = new Date(e.date);
                    return d.getFullYear() === year && (d.getMonth() + 1) === month;
                });
            },

            getEntriesByDate: (dateStr) => {
                return get().entries.filter((e) => {
                    const d = new Date(e.date);
                    const target = new Date(dateStr);
                    return d.getFullYear() === target.getFullYear() &&
                        d.getMonth() === target.getMonth() &&
                        d.getDate() === target.getDate();
                });
            },

            getMonthlySpentByCategory: (categoryId) => {
                const now = new Date();
                return get().getEntriesByMonth(now.getFullYear(), now.getMonth() + 1)
                    .filter((e) => e.categoryId === categoryId)
                    .reduce((sum, e) => sum + e.amount, 0);
            },
            
            addSubscription: (sub) => set((s) => ({
                subscriptions: [...s.subscriptions, { ...sub, id: Date.now().toString() }]
            })),
            updateSubscription: (id, updates) => set((s) => ({
                subscriptions: s.subscriptions.map(sub => sub.id === id ? { ...sub, ...updates } : sub)
            })),
            deleteSubscription: (id) => set((s) => ({
                subscriptions: s.subscriptions.filter(sub => sub.id !== id)
            })),
            addNetWorthSnapshot: (entry) => set((s) => {
                const filtered = s.netWorthHistory.filter(n => n.month !== entry.month);
                return { netWorthHistory: [...filtered, entry].sort((a, b) => a.month.localeCompare(b.month)) };
            }),
            setInsights: (insights) => set({ insights }),
            dismissInsight: (id) => set((s) => ({
                insights: s.insights.map(i => i.id === id ? { ...i, dismissed: true } : i)
            })),
            setHealthScore: (healthScore) => set({ healthScore }),
        }),
        { name: 'budget-tracker-storage' }
    )
);
