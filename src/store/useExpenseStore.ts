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
 categories: Record<string, number>; // new for category limits
}

export interface Subscription {
 id: string;
 name: string;
 amount: number; // monthly equivalent
 billingCycle: 'monthly' | 'quarterly' | 'yearly';
 nextDueDate: string; // ISO date
 category: string;
 colorTag: string;
 isActive: boolean;
}

export interface NetWorthEntry {
 month: string; // "YYYY-MM"
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
 total: number; // 0-100
 savingsScore: number; // 0-40
 adherenceScore: number; // 0-35
 consistencyScore: number; // 0-25
 tips: string[];
 calculatedAt: string;
}

export interface QuickAddShortcut {
 id: string;
 name: string;
 amount: number;
 category: string;
 emoji: string;
}

const DEFAULT_SHORTCUTS: QuickAddShortcut[] = [
 { id: '1', name: 'Coffee', amount: 150, category: 'Food & Dining', emoji: '☕' },
 { id: '2', name: 'Lunch', amount: 250, category: 'Food & Dining', emoji: '🍱' },
 { id: '3', name: 'Transport', amount: 100, category: 'Transport', emoji: '🚇' },
 { id: '4', name: 'Groceries', amount: 500, category: 'Shopping', emoji: '🛒' },
 { id: '5', name: 'Dinner', amount: 600, category: 'Food & Dining', emoji: '🍽️' },
 { id: '6', name: 'Petrol', amount: 1000, category: 'Transport', emoji: '⛽' },
];

interface ExpenseState {
 expenses: Expense[];
 budget: Budget | null;
 subscriptions: Subscription[];
 netWorthHistory: NetWorthEntry[];
 insights: Insight[];
 healthScore: HealthScore | null;
 quickAddShortcuts: QuickAddShortcut[];
 addExpense: (expense: Omit<Expense, 'id'>) => void;
 updateExpense: (id: string, updates: Partial<Expense>) => void;
 deleteExpense: (id: string) => void;
 setBudget: (budget: Budget) => void;
 addSubscription: (sub: Omit<Subscription, 'id'>) => void;
 updateSubscription: (id: string, updates: Partial<Subscription>) => void;
 deleteSubscription: (id: string) => void;
 addNetWorthSnapshot: (entry: NetWorthEntry) => void;
 setInsights: (insights: Insight[]) => void;
 dismissInsight: (id: string) => void;
 setHealthScore: (score: HealthScore) => void;
 updateShortcuts: (shortcuts: QuickAddShortcut[]) => void;

 getMonthExpenses: (month: number, year: number) => Expense[];
 getTotalSpent: (month: number, year: number) => number;
 getCategoryBreakdown: (month: number, year: number) => Record<string, number>;
}

export const useExpenseStore = create<ExpenseState>()(
 persist(
 (set, get) => ({
 expenses: [],
 budget: null,
 subscriptions: [],
 netWorthHistory: [],
 insights: [],
 healthScore: null,
 quickAddShortcuts: DEFAULT_SHORTCUTS,
 addExpense: (expense) => set((state) => ({
 expenses: [...state.expenses, { ...expense, id: Date.now().toString() }]
 })),
 updateExpense: (id, updates) => set((state) => ({
 expenses: state.expenses.map(e => e.id === id ? { ...e, ...updates } : e)
 })),
 deleteExpense: (id) => set((state) => ({
 expenses: state.expenses.filter(e => e.id !== id)
 })),
 setBudget: (budget) => set({ budget }),
 addSubscription: (sub) => set((state) => ({
 subscriptions: [...state.subscriptions, { ...sub, id: Date.now().toString() }]
 })),
 updateSubscription: (id, updates) => set((state) => ({
 subscriptions: state.subscriptions.map(s => s.id === id ? { ...s, ...updates } : s)
 })),
 deleteSubscription: (id) => set((state) => ({
 subscriptions: state.subscriptions.filter(s => s.id !== id)
 })),
 addNetWorthSnapshot: (entry) => set((state) => {
 const filtered = state.netWorthHistory.filter(n => n.month !== entry.month); // replace if same month
 return { netWorthHistory: [...filtered, entry].sort((a, b) => a.month.localeCompare(b.month)) };
 }),
 setInsights: (insights) => set({ insights }),
 dismissInsight: (id) => set((state) => ({
 insights: state.insights.map(i => i.id === id ? { ...i, dismissed: true } : i)
 })),
 setHealthScore: (healthScore) => set({ healthScore }),
 updateShortcuts: (quickAddShortcuts) => set({ quickAddShortcuts }),
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
