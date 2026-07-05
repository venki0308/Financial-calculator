// ═══════════════════════════════════════════════════════════════
// FINCALIX — BUSINESS TRACKER STORAGE ENGINE
// Raw CRUD operations on localStorage for the Business Tracker
// (daily income & expense logging per business). Mirrors the
// soft-delete + try/catch-read pattern of expenseStorage.ts.
//
// Storage keys (also validated in dataIntegrity.ts and wired into
// Settings export/import + clear-data):
//   'fincalix_businesses'       → Business[]
//   'fincalix_business_entries' → BizEntry[]
// ═══════════════════════════════════════════════════════════════

export type BusinessType = 'restaurant' | 'retail' | 'services' | 'manufacturing' | 'other';

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  emoji: string;
  createdAt: string;   // ISO timestamp
  updatedAt: string;   // ISO timestamp
  isDeleted?: boolean;
}

export type BizEntryType = 'income' | 'expense';

export interface BizEntry {
  id: string;
  businessId: string;
  date: string;        // 'YYYY-MM-DD' (local)
  type: BizEntryType;
  amount: number;
  category: string;    // id from BIZ_EXPENSE_CATEGORIES / BIZ_INCOME_CATEGORIES
  note?: string;
  createdAt: string;   // ISO timestamp
  isDeleted?: boolean;
}

export interface BizTotals {
  income: number;
  expenses: number;
  net: number;
}

const BUSINESSES_KEY = 'fincalix_businesses';
const BIZ_ENTRIES_KEY = 'fincalix_business_entries';

// ─── CATEGORY DEFINITIONS ─────────────────────────────────────
// Labels are English defaults; pages localize via t(`biz.cat.${id}`, label).

export interface BizCategory {
  id: string;
  emoji: string;
  label: string;
}

export const BIZ_EXPENSE_CATEGORIES: BizCategory[] = [
  { id: 'ingredients', emoji: '🥬', label: 'Ingredients / Stock' },
  { id: 'staff',       emoji: '👥', label: 'Staff Salaries' },
  { id: 'rent',        emoji: '🏠', label: 'Rent' },
  { id: 'utilities',   emoji: '💡', label: 'Utilities' },
  { id: 'equipment',   emoji: '🔧', label: 'Equipment' },
  { id: 'marketing',   emoji: '📣', label: 'Marketing' },
  { id: 'transport',   emoji: '🚚', label: 'Transport' },
  { id: 'packaging',   emoji: '📦', label: 'Packaging' },
  { id: 'maintenance', emoji: '🛠', label: 'Maintenance' },
  { id: 'other',       emoji: '📌', label: 'Other' },
];

export const BIZ_INCOME_CATEGORIES: BizCategory[] = [
  { id: 'sales',        emoji: '💰', label: 'Sales' },
  { id: 'online',       emoji: '📱', label: 'Online Orders' },
  { id: 'catering',     emoji: '🍽', label: 'Catering / Services' },
  { id: 'other_income', emoji: '➕', label: 'Other Income' },
];

export const getBizCategoryById = (id: string): BizCategory | undefined =>
  BIZ_EXPENSE_CATEGORIES.find(c => c.id === id) ?? BIZ_INCOME_CATEGORIES.find(c => c.id === id);

// ─── BUSINESS TYPE PRESETS ────────────────────────────────────

export const BUSINESS_TYPE_META: Record<BusinessType, { emoji: string; label: string }> = {
  restaurant:    { emoji: '🍽️', label: 'Restaurant' },
  retail:        { emoji: '🏪', label: 'Retail / Shop' },
  services:      { emoji: '💼', label: 'Services' },
  manufacturing: { emoji: '🏭', label: 'Manufacturing' },
  other:         { emoji: '🏢', label: 'Other' },
};

export const BUSINESS_TYPES: BusinessType[] = ['restaurant', 'retail', 'services', 'manufacturing', 'other'];

// ─── ID GENERATION ────────────────────────────────────────────

export const generateBusinessId = (): string =>
  `biz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const generateBizEntryId = (): string =>
  `bizent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ─── BUSINESSES CRUD ──────────────────────────────────────────

const getAllBusinessesRaw = (): Business[] => {
  try {
    const data = localStorage.getItem(BUSINESSES_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const getAllBusinesses = (): Business[] =>
  getAllBusinessesRaw().filter(b => !b.isDeleted);

export const getBusinessById = (id: string): Business | undefined =>
  getAllBusinesses().find(b => b.id === id);

export const addBusiness = (partial: Omit<Business, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>): Business => {
  const now = new Date().toISOString();
  const biz: Business = { ...partial, id: generateBusinessId(), createdAt: now, updatedAt: now, isDeleted: false };
  const all = getAllBusinessesRaw();
  all.push(biz);
  localStorage.setItem(BUSINESSES_KEY, JSON.stringify(all));
  return biz;
};

export const updateBusiness = (biz: Business): void => {
  const all = getAllBusinessesRaw();
  const idx = all.findIndex(b => b.id === biz.id);
  if (idx >= 0) {
    all[idx] = { ...biz, updatedAt: new Date().toISOString() };
    localStorage.setItem(BUSINESSES_KEY, JSON.stringify(all));
  }
};

/** Soft-delete a business AND all of its entries. */
export const softDeleteBusiness = (id: string): void => {
  const all = getAllBusinessesRaw();
  const idx = all.findIndex(b => b.id === id);
  if (idx >= 0) {
    all[idx].isDeleted = true;
    all[idx].updatedAt = new Date().toISOString();
    localStorage.setItem(BUSINESSES_KEY, JSON.stringify(all));
  }
  // Cascade: soft-delete every entry that belongs to this business
  const entries = getAllBizEntriesRaw();
  let touched = false;
  entries.forEach(e => {
    if (e.businessId === id && !e.isDeleted) {
      e.isDeleted = true;
      touched = true;
    }
  });
  if (touched) localStorage.setItem(BIZ_ENTRIES_KEY, JSON.stringify(entries));
};

// ─── ENTRIES CRUD ─────────────────────────────────────────────

const getAllBizEntriesRaw = (): BizEntry[] => {
  try {
    const data = localStorage.getItem(BIZ_ENTRIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const getAllBizEntries = (): BizEntry[] =>
  getAllBizEntriesRaw().filter(e => !e.isDeleted);

export const addBizEntry = (partial: Omit<BizEntry, 'id' | 'createdAt' | 'isDeleted'>): BizEntry => {
  const entry: BizEntry = {
    ...partial,
    id: generateBizEntryId(),
    createdAt: new Date().toISOString(),
    isDeleted: false,
  };
  const all = getAllBizEntriesRaw();
  all.push(entry);
  localStorage.setItem(BIZ_ENTRIES_KEY, JSON.stringify(all));
  return entry;
};

export const softDeleteBizEntry = (id: string): void => {
  const all = getAllBizEntriesRaw();
  const idx = all.findIndex(e => e.id === id);
  if (idx >= 0) {
    all[idx].isDeleted = true;
    localStorage.setItem(BIZ_ENTRIES_KEY, JSON.stringify(all));
  }
};

/** Entries for one business inside an inclusive [startISO, endISO] date range.
 *  Dates are 'YYYY-MM-DD' strings, so plain string comparison is correct. */
export const getEntriesForBusiness = (bizId: string, startISO: string, endISO: string): BizEntry[] =>
  getAllBizEntries().filter(e => e.businessId === bizId && e.date >= startISO && e.date <= endISO);

// ─── TOTALS ───────────────────────────────────────────────────

export const calcBizTotals = (entries: BizEntry[]): BizTotals => {
  let income = 0;
  let expenses = 0;
  for (const e of entries) {
    if (e.type === 'income') income += e.amount;
    else expenses += e.amount;
  }
  return { income, expenses, net: income - expenses };
};
