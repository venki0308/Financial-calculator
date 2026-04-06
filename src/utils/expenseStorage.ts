// ═══════════════════════════════════════════════════════════════
// FINCALIX — EXPENSE STORAGE ENGINE
// Raw CRUD operations on localStorage. No calculations here.
// ═══════════════════════════════════════════════════════════════

import type { Entry, BankAccount, Budget, Category } from '../types/expense';
import { ALL_DEFAULT_CATEGORIES } from '../types/expense';

const ENTRIES_KEY = 'fincalix_entries';
const ACCOUNTS_KEY = 'fincalix_accounts';
const BUDGETS_KEY = 'fincalix_budgets';
const CATEGORIES_KEY = 'fincalix_categories';

// ─── ENTRIES ──────────────────────────────────────────────────

export const getAllEntries = (): Entry[] => {
  try {
    const data = localStorage.getItem(ENTRIES_KEY);
    if (!data) return [];
    const raw: Entry[] = JSON.parse(data);
    return raw.filter(e => !e.isDeleted);
  } catch { return []; }
};

const getAllEntriesRaw = (): Entry[] => {
  try {
    const data = localStorage.getItem(ENTRIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const saveEntry = (entry: Entry): void => {
  const all = getAllEntriesRaw();
  const idx = all.findIndex(e => e.id === entry.id);
  if (idx >= 0) {
    all[idx] = { ...entry, updatedAt: new Date().toISOString() };
  } else {
    all.push(entry);
  }
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(all));
};

export const deleteEntry = (id: string): void => {
  const all = getAllEntriesRaw();
  const idx = all.findIndex(e => e.id === id);
  if (idx >= 0) {
    all[idx].isDeleted = true;
    all[idx].updatedAt = new Date().toISOString();
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(all));
  }
};

export const getEntriesForDate = (date: string): Entry[] => {
  return getAllEntries().filter(e => e.date === date);
};

export const getEntriesForDateRange = (startDate: string, endDate: string): Entry[] => {
  return getAllEntries().filter(e => e.date >= startDate && e.date <= endDate);
};

export const getEntriesForMonth = (year: number, month: number): Entry[] => {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  return getAllEntries().filter(e => e.date.startsWith(monthStr));
};

export const getEntriesForYear = (year: number): Entry[] => {
  const yearStr = `${year}-`;
  return getAllEntries().filter(e => e.date.startsWith(yearStr));
};

export const generateEntryId = (): string => {
  return `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const createEntry = (partial: Omit<Entry, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt'>): Entry => {
  const now = new Date().toISOString();
  return {
    ...partial,
    id: generateEntryId(),
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
};

// ─── BANK ACCOUNTS ────────────────────────────────────────────

export const getAllAccounts = (): BankAccount[] => {
  try {
    const data = localStorage.getItem(ACCOUNTS_KEY);
    if (!data) return [];
    return (JSON.parse(data) as BankAccount[]).filter(a => a.isActive);
  } catch { return []; }
};

const getAllAccountsRaw = (): BankAccount[] => {
  try {
    const data = localStorage.getItem(ACCOUNTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const saveAccount = (account: BankAccount): void => {
  const all = getAllAccountsRaw();
  const idx = all.findIndex(a => a.id === account.id);
  if (idx >= 0) {
    all[idx] = account;
  } else {
    all.push(account);
  }
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all));
};

export const deleteAccount = (id: string): void => {
  const all = getAllAccountsRaw();
  const idx = all.findIndex(a => a.id === id);
  if (idx >= 0) {
    all[idx].isActive = false;
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(all));
  }
};

export const getAccountById = (id: string): BankAccount | undefined => {
  return getAllAccountsRaw().find(a => a.id === id);
};

export const generateAccountId = (): string => {
  return `acc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

// ─── BUDGETS ──────────────────────────────────────────────────

export const getAllBudgets = (): Budget[] => {
  try {
    const data = localStorage.getItem(BUDGETS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const getBudgetForMonth = (monthStr: string): Budget | undefined => {
  return getAllBudgets().find(b => b.month === monthStr);
};

export const saveBudget = (budget: Budget): void => {
  const all = getAllBudgets();
  const idx = all.findIndex(b => b.id === budget.id);
  if (idx >= 0) {
    all[idx] = { ...budget, updatedAt: new Date().toISOString() };
  } else {
    all.push(budget);
  }
  localStorage.setItem(BUDGETS_KEY, JSON.stringify(all));
};

export const generateBudgetId = (): string => {
  return `budget_${Date.now()}`;
};

// ─── CUSTOM CATEGORIES ────────────────────────────────────────

export const getCustomCategories = (): Category[] => {
  try {
    const data = localStorage.getItem(CATEGORIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const saveCustomCategory = (cat: Category): void => {
  const all = getCustomCategories();
  const idx = all.findIndex(c => c.id === cat.id);
  if (idx >= 0) {
    all[idx] = cat;
  } else {
    all.push(cat);
  }
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(all));
};

export const getAllCategories = (): Category[] => {
  return [...ALL_DEFAULT_CATEGORIES, ...getCustomCategories()];
};

export const getCategoryById = (id: string): Category | undefined => {
  return getAllCategories().find(c => c.id === id);
};

// ─── DATA MIGRATION (from old store) ──────────────────────────

export const migrateFromOldStore = (): boolean => {
  try {
    const oldData = localStorage.getItem('budget-tracker-storage');
    if (!oldData) return false;

    const existing = getAllEntries();
    if (existing.length > 0) return false; // already migrated

    const parsed = JSON.parse(oldData);
    const state = parsed?.state;
    if (!state?.entries?.length) return false;

    const migrated: Entry[] = state.entries.map((old: any) => ({
      id: old.id || generateEntryId(),
      type: old.entryType === 'investment' ? 'investment' : old.entryType === 'income' ? 'income' : 'expense',
      amount: Math.abs(old.amount || 0),
      date: old.date ? old.date.split('T')[0] : new Date().toISOString().split('T')[0],
      category: normalizeCategoryId(old.category || 'other_expense'),
      description: old.description || '',
      paymentMethod: normalizePaymentMethod(old.paymentMethod),
      recurrence: 'none' as const,
      isDeleted: false,
      createdAt: old.date || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      investmentType: old.investmentType,
    }));

    localStorage.setItem(ENTRIES_KEY, JSON.stringify(migrated));
    return true;
  } catch {
    return false;
  }
};

const normalizeCategoryId = (raw: string): string => {
  // Strip i18n prefixes
  const cleaned = raw
    .replace(/^expenses\.categories\./, '')
    .replace(/^income\.categories\./, '')
    .replace(/^investment\.categories\./, '');

  // Map old names to new IDs
  const MAP: Record<string, string> = {
    food: 'food_dining', dining: 'food_dining', 'food_dining': 'food_dining',
    groceries: 'groceries',
    transportation: 'transport', transport: 'transport',
    shopping: 'shopping',
    healthcare: 'health', health: 'health', medical: 'health',
    education: 'education',
    entertainment: 'entertainment',
    utilities: 'utilities', bills: 'utilities',
    rent: 'rent_housing', housing: 'rent_housing', rent_housing: 'rent_housing',
    emi: 'emi_loan', loan: 'emi_loan', emi_loan: 'emi_loan',
    insurance: 'insurance',
    personalCare: 'personal_care', personal_care: 'personal_care',
    travel: 'travel',
    subscription: 'subscription', subscriptions: 'subscription',
    others: 'other_expense', other: 'other_expense', other_expense: 'other_expense',
    salary: 'salary',
    freelance: 'freelance',
    business: 'business',
    rental: 'rental',
    interest: 'interest',
    gift: 'gift',
    refund: 'refund',
    other_income: 'other_income',
    cash_savings: 'inv_savings',
    gold: 'inv_gold',
    silver: 'inv_silver',
    stocks: 'inv_stocks',
    mutual_funds: 'inv_mutual_fund',
    fixed_deposit: 'inv_fd',
    ppf_epf: 'inv_ppf',
    crypto: 'inv_crypto',
    real_estate: 'inv_realestate',
    other_investment: 'inv_other',
  };

  return MAP[cleaned] || cleaned;
};

const normalizePaymentMethod = (raw: string | undefined): Entry['paymentMethod'] => {
  if (!raw) return 'other';
  const lower = raw.toLowerCase().replace(/\s+/g, '_');
  const MAP: Record<string, Entry['paymentMethod']> = {
    cash: 'cash', upi: 'upi',
    debit_card: 'debit_card', credit_card: 'credit_card',
    net_banking: 'net_banking', cheque: 'cheque',
    auto_debit: 'auto_debit',
  };
  return MAP[lower] || 'other';
};
