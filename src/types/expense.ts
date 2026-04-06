// ═══════════════════════════════════════════════════════════════
// FINCALIX EXPENSE TRACKER — GROUND TRUTH DATA MODEL
// This is the ONLY data model. Everything else derives from this.
// Never store calculated values — only store raw facts.
// ═══════════════════════════════════════════════════════════════

export type EntryType = 'expense' | 'income' | 'investment' | 'transfer';

export type PaymentMethod =
  | 'cash'
  | 'upi'
  | 'debit_card'
  | 'credit_card'
  | 'net_banking'
  | 'cheque'
  | 'auto_debit'
  | 'other';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Entry {
  id: string;
  type: EntryType;
  amount: number;               // always positive
  date: string;                 // 'YYYY-MM-DD' — NO time
  category: string;             // category id
  subCategory?: string;
  description: string;
  paymentMethod: PaymentMethod;
  accountId?: string;           // which bank account
  tags?: string[];
  recurrence: RecurrenceType;
  recurrenceParentId?: string;
  investmentType?: string;
  isDeleted: boolean;
  createdAt: string;            // ISO timestamp
  updatedAt: string;            // ISO timestamp
  toAccountId?: string;         // for transfers
  isCreditCardSpend?: boolean;
  creditCardAccountId?: string;
}

// ─── CATEGORY SYSTEM ──────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: EntryType;
  color: string;
  isCustom: boolean;
  isActive: boolean;
}

export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  { id: 'food_dining',    name: 'Food & Dining',    icon: '🍽', type: 'expense', color: '#f97316', isCustom: false, isActive: true },
  { id: 'groceries',      name: 'Groceries',        icon: '🛒', type: 'expense', color: '#84cc16', isCustom: false, isActive: true },
  { id: 'transport',      name: 'Transport',        icon: '🚗', type: 'expense', color: '#3b82f6', isCustom: false, isActive: true },
  { id: 'shopping',       name: 'Shopping',         icon: '🛍', type: 'expense', color: '#a855f7', isCustom: false, isActive: true },
  { id: 'health',         name: 'Health & Medical',  icon: '💊', type: 'expense', color: '#ef4444', isCustom: false, isActive: true },
  { id: 'education',      name: 'Education',        icon: '📚', type: 'expense', color: '#06b6d4', isCustom: false, isActive: true },
  { id: 'entertainment',  name: 'Entertainment',    icon: '🎬', type: 'expense', color: '#ec4899', isCustom: false, isActive: true },
  { id: 'utilities',      name: 'Utilities & Bills', icon: '💡', type: 'expense', color: '#f59e0b', isCustom: false, isActive: true },
  { id: 'rent_housing',   name: 'Rent & Housing',   icon: '🏠', type: 'expense', color: '#10b981', isCustom: false, isActive: true },
  { id: 'emi_loan',       name: 'EMI & Loan',       icon: '🏦', type: 'expense', color: '#6366f1', isCustom: false, isActive: true },
  { id: 'insurance',      name: 'Insurance',        icon: '🛡', type: 'expense', color: '#0ea5e9', isCustom: false, isActive: true },
  { id: 'personal_care',  name: 'Personal Care',    icon: '💅', type: 'expense', color: '#f472b6', isCustom: false, isActive: true },
  { id: 'travel',         name: 'Travel',           icon: '✈️', type: 'expense', color: '#14b8a6', isCustom: false, isActive: true },
  { id: 'subscription',   name: 'Subscriptions',    icon: '📱', type: 'expense', color: '#8b5cf6', isCustom: false, isActive: true },
  { id: 'other_expense',  name: 'Others',           icon: '📦', type: 'expense', color: '#94a3b8', isCustom: false, isActive: true },
];

export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  { id: 'salary',       name: 'Salary',           icon: '💼', type: 'income', color: '#22c55e', isCustom: false, isActive: true },
  { id: 'freelance',    name: 'Freelance',        icon: '💻', type: 'income', color: '#16a34a', isCustom: false, isActive: true },
  { id: 'business',     name: 'Business Income',  icon: '🏪', type: 'income', color: '#15803d', isCustom: false, isActive: true },
  { id: 'rental',       name: 'Rental Income',    icon: '🏘', type: 'income', color: '#166534', isCustom: false, isActive: true },
  { id: 'interest',     name: 'Interest/Returns', icon: '📈', type: 'income', color: '#4ade80', isCustom: false, isActive: true },
  { id: 'gift',         name: 'Gift/Bonus',       icon: '🎁', type: 'income', color: '#86efac', isCustom: false, isActive: true },
  { id: 'refund',       name: 'Refund',           icon: '↩️', type: 'income', color: '#bbf7d0', isCustom: false, isActive: true },
  { id: 'other_income', name: 'Other Income',     icon: '💰', type: 'income', color: '#dcfce7', isCustom: false, isActive: true },
];

export const DEFAULT_INVESTMENT_CATEGORIES: Category[] = [
  { id: 'inv_mutual_fund', name: 'Mutual Funds',     icon: '📊', type: 'investment', color: '#8b5cf6', isCustom: false, isActive: true },
  { id: 'inv_stocks',      name: 'Stocks',           icon: '📈', type: 'investment', color: '#3b82f6', isCustom: false, isActive: true },
  { id: 'inv_gold',        name: 'Gold',             icon: '🥇', type: 'investment', color: '#f59e0b', isCustom: false, isActive: true },
  { id: 'inv_silver',      name: 'Silver',           icon: '🥈', type: 'investment', color: '#94a3b8', isCustom: false, isActive: true },
  { id: 'inv_fd',          name: 'FD / RD',          icon: '🏦', type: 'investment', color: '#06b6d4', isCustom: false, isActive: true },
  { id: 'inv_ppf',         name: 'PPF / EPF',        icon: '🏛', type: 'investment', color: '#10b981', isCustom: false, isActive: true },
  { id: 'inv_crypto',      name: 'Crypto',           icon: '₿',  type: 'investment', color: '#f97316', isCustom: false, isActive: true },
  { id: 'inv_savings',     name: 'Cash Savings',     icon: '💵', type: 'investment', color: '#22c55e', isCustom: false, isActive: true },
  { id: 'inv_realestate',  name: 'Real Estate',      icon: '🏠', type: 'investment', color: '#84cc16', isCustom: false, isActive: true },
  { id: 'inv_other',       name: 'Other Investment', icon: '💼', type: 'investment', color: '#a78bfa', isCustom: false, isActive: true },
];

export const ALL_DEFAULT_CATEGORIES: Category[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
  ...DEFAULT_INVESTMENT_CATEGORIES,
];

// ─── BANK ACCOUNT MODEL ──────────────────────────────────────

export type AccountType = 'savings' | 'current' | 'salary' | 'fixed_deposit' | 'wallet' | 'cash' | 'credit_card';

export interface BankAccount {
  id: string;
  name: string;
  accountType: AccountType;
  bankName: string;
  lastFourDigits?: string;
  manualBalance: number;
  balanceDate: string;
  creditLimit?: number;
  color: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
}

// ─── BUDGET MODEL ─────────────────────────────────────────────

export interface Budget {
  id: string;
  month: string;              // 'YYYY-MM'
  monthlyIncome: number;
  fixedExpenses: FixedExpense[];
  categoryLimits: CategoryLimit[];
  investmentTargets: InvestmentTarget[];
  createdAt: string;
  updatedAt: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  dueDay: number;
}

export interface CategoryLimit {
  categoryId: string;
  monthlyLimit: number;
}

export interface InvestmentTarget {
  categoryId: string;
  monthlyTarget: number;
}

// ─── PAYMENT METHOD DISPLAY ───────────────────────────────────

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { label: string; icon: string }> = {
  cash: { label: 'Cash', icon: '💵' },
  upi: { label: 'UPI', icon: '📱' },
  debit_card: { label: 'Debit Card', icon: '💳' },
  credit_card: { label: 'Credit Card', icon: '💳' },
  net_banking: { label: 'Net Banking', icon: '🏦' },
  cheque: { label: 'Cheque', icon: '📝' },
  auto_debit: { label: 'Auto Debit', icon: '🔄' },
  other: { label: 'Other', icon: '📦' },
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, { label: string; icon: string }> = {
  savings: { label: 'Savings', icon: '💰' },
  current: { label: 'Current', icon: '🏢' },
  salary: { label: 'Salary', icon: '💼' },
  fixed_deposit: { label: 'FD', icon: '📈' },
  wallet: { label: 'Wallet', icon: '👛' },
  cash: { label: 'Cash', icon: '💵' },
  credit_card: { label: 'Credit Card', icon: '💳' },
};
