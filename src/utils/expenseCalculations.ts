// ═══════════════════════════════════════════════════════════════
// FINCALIX — EXPENSE CALCULATION ENGINE
// This is the ONLY place calculations happen.
// All views import from here. No inline math anywhere.
// ═══════════════════════════════════════════════════════════════

import type { Entry, Budget, Category } from '../types/expense';
import { ALL_DEFAULT_CATEGORIES } from '../types/expense';
import { getCustomCategories } from './expenseStorage';

// ─── INTERFACES ───────────────────────────────────────────────

export interface PeriodSummary {
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  totalTransfers: number;
  netSavings: number;
  savingsRate: number;
  investmentRate: number;
  entryCount: number;
  expenseCount: number;
  incomeCount: number;
  investmentCount: number;
  expenseByCategory: CategoryTotal[];
  incomeByCategory: CategoryTotal[];
  investmentByCategory: CategoryTotal[];
  dailyTotals: DailyTotal[];
  budgetedExpenses: number;
  budgetVariance: number;
}

export interface CategoryTotal {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface DailyTotal {
  date: string;
  income: number;
  expenses: number;
  investments: number;
  net: number;
}

export interface WeeklySummary {
  weekNumber: number;
  startDate: string;
  endDate: string;
  label: string;
  income: number;
  expenses: number;
  investments: number;
  net: number;
}

// ─── MASTER CALCULATION FUNCTION ──────────────────────────────

export const calculateSummary = (entries: Entry[], budget?: Budget): PeriodSummary => {
  const incomeEntries = entries.filter(e => e.type === 'income');
  const expenseEntries = entries.filter(e => e.type === 'expense');
  const investmentEntries = entries.filter(e => e.type === 'investment');
  const transferEntries = entries.filter(e => e.type === 'transfer');

  const totalIncome = incomeEntries.reduce((s, e) => s + e.amount, 0);
  const totalExpenses = expenseEntries.reduce((s, e) => s + e.amount, 0);
  const totalInvestments = investmentEntries.reduce((s, e) => s + e.amount, 0);
  const totalTransfers = transferEntries.reduce((s, e) => s + e.amount, 0);

  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const investmentRate = totalIncome > 0 ? (totalInvestments / totalIncome) * 100 : 0;

  const expenseByCategory = buildCategoryTotals(expenseEntries, totalExpenses);
  const incomeByCategory = buildCategoryTotals(incomeEntries, totalIncome);
  const investmentByCategory = buildCategoryTotals(investmentEntries, totalInvestments);
  const dailyTotals = buildDailyTotals(entries);

  const budgetedExpenses = budget
    ? budget.categoryLimits.reduce((s, l) => s + l.monthlyLimit, 0)
      + budget.fixedExpenses.reduce((s, f) => s + f.amount, 0)
    : 0;
  const budgetVariance = totalExpenses - budgetedExpenses;

  return {
    totalIncome, totalExpenses, totalInvestments, totalTransfers,
    netSavings, savingsRate, investmentRate,
    entryCount: entries.length,
    expenseCount: expenseEntries.length,
    incomeCount: incomeEntries.length,
    investmentCount: investmentEntries.length,
    expenseByCategory, incomeByCategory, investmentByCategory,
    dailyTotals, budgetedExpenses, budgetVariance,
  };
};

// ─── CATEGORY TOTALS ──────────────────────────────────────────

const buildCategoryTotals = (entries: Entry[], total: number): CategoryTotal[] => {
  const amountMap = new Map<string, number>();
  const countMap = new Map<string, number>();

  entries.forEach(e => {
    const cat = e.category || 'other_expense';
    amountMap.set(cat, (amountMap.get(cat) ?? 0) + e.amount);
    countMap.set(cat, (countMap.get(cat) ?? 0) + 1);
  });

  const allCats = [...ALL_DEFAULT_CATEGORIES, ...getCustomCategories()];
  const result: CategoryTotal[] = [];

  amountMap.forEach((amount, categoryId) => {
    const catDef = allCats.find(c => c.id === categoryId);
    result.push({
      categoryId,
      categoryName: catDef?.name ?? toHumanReadable(categoryId),
      categoryIcon: catDef?.icon ?? '📦',
      categoryColor: catDef?.color ?? '#94a3b8',
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
      count: countMap.get(categoryId) ?? 0,
    });
  });

  return result.sort((a, b) => b.amount - a.amount);
};

// Convert any category ID to human readable — fixes "expenses.categories.gold" bug
const toHumanReadable = (id: string): string => {
  const clean = id
    .replace(/^expenses\.categories\./, '')
    .replace(/^income\.categories\./, '')
    .replace(/^investment\.categories\./, '')
    .replace(/^inv_/, '');
  return clean.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

// ─── DAILY TOTALS ─────────────────────────────────────────────

const buildDailyTotals = (entries: Entry[]): DailyTotal[] => {
  const map = new Map<string, DailyTotal>();

  entries.forEach(e => {
    if (!map.has(e.date)) {
      map.set(e.date, { date: e.date, income: 0, expenses: 0, investments: 0, net: 0 });
    }
    const day = map.get(e.date)!;
    if (e.type === 'income') day.income += e.amount;
    if (e.type === 'expense') day.expenses += e.amount;
    if (e.type === 'investment') day.investments += e.amount;
    day.net = day.income - day.expenses;
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
};

// ─── WEEKLY BREAKDOWN FOR A MONTH ─────────────────────────────

export const buildWeeklyBreakdown = (entries: Entry[], year: number, month: number): WeeklySummary[] => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const weeks: WeeklySummary[] = [];
  let weekStart = new Date(firstDay);
  let weekNum = 1;

  while (weekStart <= lastDay) {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    if (weekEnd > lastDay) weekEnd.setTime(lastDay.getTime());

    const startStr = toLocalDateStr(weekStart);
    const endStr = toLocalDateStr(weekEnd);
    const weekEntries = entries.filter(e => e.date >= startStr && e.date <= endStr);

    const income = weekEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const expenses = weekEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    const investments = weekEntries.filter(e => e.type === 'investment').reduce((s, e) => s + e.amount, 0);

    weeks.push({
      weekNumber: weekNum,
      startDate: startStr,
      endDate: endStr,
      label: `${formatShortDate(weekStart)}-${formatShortDate(weekEnd)}`,
      income, expenses, investments,
      net: income - expenses,
    });

    weekNum++;
    weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() + 1);
  }

  return weeks;
};

// ─── DATE RANGE UTILITIES ─────────────────────────────────────

export const getWeekRange = (weekOffset: number = 0) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + weekOffset * 7);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: toLocalDateStr(monday),
    end: toLocalDateStr(sunday),
    label: `${formatShortDate(monday)} — ${formatShortDate(sunday, true)}`,
  };
};

export const getMonthRange = (monthOffset: number = 0) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + monthOffset);

  const start = toLocalDateStr(d);
  const end = toLocalDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));

  return {
    start, end,
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    monthStr: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
};

export const getYearRange = (yearOffset: number = 0) => {
  const year = new Date().getFullYear() + yearOffset;
  return {
    year,
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
};

// Use LOCAL date, not UTC (toISOString is UTC — wrong after 6:30 PM IST)
const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const getTodayStr = (): string => toLocalDateStr(new Date());

export const getDateStr = (d: Date): string => toLocalDateStr(d);

// ─── FORMAT UTILITIES ─────────────────────────────────────────

export const fmtINR = (amount: number): string => {
  if (!Number.isFinite(amount)) return '---';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(Math.round(amount));
};

export const fmtINRShort = (amount: number): string => {
  if (!Number.isFinite(amount)) return '---';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount)}`;
};

export const fmtPct = (value: number): string => {
  if (!Number.isFinite(value)) return '---';
  return `${value.toFixed(1)}%`;
};

export const formatShortDate = (d: Date, showYear?: boolean): string => {
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
    ...(showYear && { year: 'numeric' }),
  });
};

export const formatFullDate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── SUBSCRIPTION HELPERS ─────────────────────────────────────
// Subscriptions live in useBudgetTrackerStore (a different store from
// expenseStorage). To avoid circular imports between this calc engine and
// the Zustand store, we accept duck-typed subscription objects here.
// Anything matching this shape (the SubscriptionsTab Subscription type
// satisfies it) can be passed in.
export interface SubscriptionInput {
  amount: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  isActive: boolean;
}

/** Richer shape for date-aware billing calculations. The
 *  Subscriptions tab persists `nextDueDate` (YYYY-MM-DD) which we use as
 *  the anchor for projecting billing dates backward and forward.
 *
 *  `createdAt` is the earliest YYYY-MM-DD on which a billing for this
 *  subscription can have occurred. New subs stamp this at save time
 *  (see addSubscription in useBudgetTrackerStore). For legacy subs
 *  persisted before this field existed, the billing helpers fall back
 *  to (nextDueDate − 1 cycle) so we never bill months before the sub
 *  realistically existed. */
export interface BillingDateSubscription extends SubscriptionInput {
  nextDueDate?: string;
  createdAt?: string;
  name?: string;
  category?: string;
}

/** Sum the monthly equivalent of all ACTIVE subscriptions.
 *  quarterly = amount/3, yearly = amount/12, monthly = amount as-is.
 *  Used for FORWARD-LOOKING projections (Budget tab Est. Savings) where
 *  the question is "what's the monthly running cost?" rather than
 *  "what actually billed in this period?". */
export const getSubscriptionMonthlyTotal = (subs: SubscriptionInput[]): number => {
  if (!subs || subs.length === 0) return 0;
  return subs
    .filter(s => s.isActive)
    .reduce((sum, s) => {
      if (s.billingCycle === 'quarterly') return sum + s.amount / 3;
      if (s.billingCycle === 'yearly') return sum + s.amount / 12;
      return sum + s.amount;
    }, 0);
};

/** True if a date string (YYYY-MM-DD) falls in the given year/month. */
const isInMonth = (dateStr: string, year: number, month: number): boolean => {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  return dateStr.startsWith(monthStr);
};

/** Sum the monthly equivalent of subscriptions whose nextDueDate falls in
 *  the given year/month. Used by daily/weekly views to flag the renewal
 *  hitting that period. */
export const getSubscriptionsDueInMonth = <T extends SubscriptionInput & { nextDueDate?: string }>(
  subs: T[],
  year: number,
  month: number,
): T[] => {
  if (!subs || subs.length === 0) return [];
  return subs.filter(s => s.isActive && s.nextDueDate && isInMonth(s.nextDueDate, year, month));
};

// ─── DATE-AWARE BILLING DATE PROJECTION ──────────────────────
// These helpers walk forward/backward from `nextDueDate` to find every
// billing date that falls inside an arbitrary [startISO, endISO] range.
// They're the foundation for "actual cash flow" calculations across
// every tab and PDF — Monthly Cash Flow, Yearly per-month, Custom date
// range PDFs, etc. all need to know "did this sub bill in this period
// AND has the bill date already passed".

/** Add N months to a YYYY-MM-DD string, clamping the day to the new
 *  month's last day if needed (e.g. Jan 31 + 1 month → Feb 28/29). */
const addMonthsISO = (iso: string, months: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const newDate = new Date(y, m - 1 + months, 1);
  const lastDay = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
  newDate.setDate(Math.min(d, lastDay));
  return `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
};

/** Add N days to a YYYY-MM-DD string. */
const addDaysISO = (iso: string, days: number): string => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Returns the cycle step in months. Quarterly = 3, yearly = 12,
 *  monthly = 1. */
const cycleMonths = (cycle: 'monthly' | 'quarterly' | 'yearly'): number => {
  if (cycle === 'quarterly') return 3;
  if (cycle === 'yearly') return 12;
  return 1;
};

/** The first billing date that ever counts for this subscription.
 *
 *  In FinCalix's data model, `nextDueDate` is set ONCE by the user in
 *  the Subscriptions tab form and is never auto-advanced by the system.
 *  Semantically it means "the first scheduled billing date" — there
 *  are no prior billings. The user can always log past payments as
 *  manual expense entries if they want them tracked.
 *
 *  Therefore the lower bound is simply `nextDueDate` itself. If a new
 *  sub also has an explicit `createdAt` and that's somehow later than
 *  `nextDueDate` (data-entry mistake), we use whichever is later — we
 *  never bill before the sub existed.
 *
 *  This replaces the previous "nextDueDate − 1 cycle" legacy fallback,
 *  which was incorrect: it manufactured a phantom prior billing one
 *  full cycle before the user's first scheduled date. For Netflix with
 *  `nextDueDate = 2026-03-26`, the bad fallback projected a fake
 *  Feb 26 billing into the annual report. */
const getSubFirstBillingISO = (sub: BillingDateSubscription): string | null => {
  if (!sub.nextDueDate) return null;
  if (sub.createdAt && sub.createdAt > sub.nextDueDate) return sub.createdAt;
  return sub.nextDueDate;
};

/** Returns every billing date for a single subscription that falls
 *  inside [startISO, endISO]. Walks FORWARD only from the first
 *  billing date — there are no prior billings because `nextDueDate`
 *  is the first billing the user told us about.
 *
 *  If `nextDueDate` is missing, returns []. The Subscriptions tab
 *  always sets nextDueDate, so this is defensive only. */
export const getSubBillingDatesInRange = (
  sub: BillingDateSubscription,
  startISO: string,
  endISO: string,
): string[] => {
  if (!sub.isActive || !sub.nextDueDate) return [];

  const firstBilling = getSubFirstBillingISO(sub);
  if (!firstBilling) return [];

  // Nothing before firstBilling can ever bill. Bail early.
  if (endISO < firstBilling) return [];

  const stepMonths = cycleMonths(sub.billingCycle);
  const dates: string[] = [];

  // Walk forward from firstBilling, one cycle at a time, collecting
  // every date that lands inside the requested range.
  let cursor = firstBilling;
  let safety = 0;
  while (cursor <= endISO && safety < 240) {
    if (cursor >= startISO) dates.push(cursor);
    cursor = addMonthsISO(cursor, stepMonths);
    safety++;
  }

  return dates;
};

/** Sum the cash actually billed (or projected to bill) for a single sub
 *  in the given range, IGNORING today's date. Use this when you want
 *  the full period's expected cost. */
export const getSubAmountInRange = (
  sub: BillingDateSubscription,
  startISO: string,
  endISO: string,
): number => {
  if (!sub.isActive) return 0;
  return getSubBillingDatesInRange(sub, startISO, endISO).length * sub.amount;
};

/** Sum the cash actually billed for a single sub in the given range,
 *  but only counting billings whose date is on-or-before `asOfISO`
 *  (defaults to today). This is the canonical "actual cash flow" rule:
 *  for past months, all billings count; for the current month, only
 *  billings up to today count; for future months, none.
 *
 *  Example: Netflix nextDueDate=2026-04-26, today=2026-04-09.
 *    March range → [2026-03-26] all <= today → ₹499 counted
 *    April range → [2026-04-26] none <= today → ₹0 counted
 *    May range → [2026-05-26] none <= today → ₹0 counted */
export const getActualBilledSubAmountInRange = (
  sub: BillingDateSubscription,
  startISO: string,
  endISO: string,
  asOfISO: string = getTodayStr(),
): number => {
  if (!sub.isActive) return 0;
  const dates = getSubBillingDatesInRange(sub, startISO, endISO);
  return dates.filter(d => d <= asOfISO).length * sub.amount;
};

/** Total of all subs' actual billings in the given range. The single
 *  source of truth for "subscription contribution to expenses" in
 *  every tab and PDF except the Budget projection. */
export const getTotalActualBilledSubsInRange = (
  subs: BillingDateSubscription[],
  startISO: string,
  endISO: string,
  asOfISO: string = getTodayStr(),
): number => {
  if (!subs || subs.length === 0) return 0;
  return subs.reduce(
    (sum, sub) => sum + getActualBilledSubAmountInRange(sub, startISO, endISO, asOfISO),
    0,
  );
};

/** Build a synthetic Entry-like object for each subscription billing
 *  in the range. Used by the Daily/Weekly/Custom PDF transaction logs
 *  so users see "Netflix (Recurring) | ₹499" inline with their other
 *  expense rows. The synthetic ID prefix makes it easy to filter out. */
export interface SyntheticSubscriptionEntry {
  id: string;
  date: string;
  amount: number;
  type: 'expense';
  category: string;
  description: string;
  isRecurring: true;
  subscriptionName: string;
}

export const buildSubscriptionEntriesForRange = (
  subs: BillingDateSubscription[],
  startISO: string,
  endISO: string,
  asOfISO: string = getTodayStr(),
): SyntheticSubscriptionEntry[] => {
  if (!subs || subs.length === 0) return [];
  const result: SyntheticSubscriptionEntry[] = [];
  subs.forEach(sub => {
    if (!sub.isActive) return;
    const dates = getSubBillingDatesInRange(sub, startISO, endISO);
    dates.forEach(date => {
      if (date > asOfISO) return; // upcoming, skip
      result.push({
        id: `sub_${sub.name ?? 'unknown'}_${date}`,
        date,
        amount: sub.amount,
        type: 'expense',
        category: 'subscription',
        description: `${sub.name ?? 'Subscription'} (Recurring)`,
        isRecurring: true,
        subscriptionName: sub.name ?? 'Subscription',
      });
    });
  });
  return result.sort((a, b) => a.date.localeCompare(b.date));
};

// ─── CANONICAL EXPENSE / PERIOD CALCULATIONS ─────────────────
// One source of truth for "total expenses for any period" used by
// Monthly tab, Weekly tab, Yearly tab and every PDF report.

/** Canonical total expenses for any date range:
 *    logged expense entries in [startISO, endISO]
 *    + subscription billings in [startISO, endISO] that have actually
 *      occurred (date <= asOfISO).
 *
 *  This is the SINGLE source of truth — every "Total Expenses" number
 *  the user sees should come from here. */
export const getCanonicalExpensesForRange = (
  entries: Entry[],
  subscriptions: BillingDateSubscription[],
  startISO: string,
  endISO: string,
  asOfISO: string = getTodayStr(),
): number => {
  const loggedTotal = entries
    .filter(e => e.type === 'expense' && e.date >= startISO && e.date <= endISO)
    .reduce((sum, e) => sum + e.amount, 0);
  return loggedTotal + getUnloggedSubsForRange(entries, subscriptions, startISO, endISO, asOfISO);
};

/** Subscription billings in range NOT already covered by a manually-logged
 *  'subscription'-category expense entry. Every surface that shows
 *  "logged + recurring subscriptions" must add THIS (not the raw billed
 *  total) on top of logged entries, otherwise a user who logs the actual
 *  Netflix debit AND tracks Netflix in the Subscriptions tab gets the
 *  charge counted twice. */
export const getUnloggedSubsForRange = (
  entries: Entry[],
  subscriptions: BillingDateSubscription[],
  startISO: string,
  endISO: string,
  asOfISO: string = getTodayStr(),
): number => {
  const subsTotal = getTotalActualBilledSubsInRange(subscriptions, startISO, endISO, asOfISO);
  const loggedSubsTotal = entries
    .filter(e => e.type === 'expense' && e.category === 'subscription'
      && e.date >= startISO && e.date <= endISO)
    .reduce((sum, e) => sum + e.amount, 0);
  return Math.max(0, subsTotal - loggedSubsTotal);
};

/** Drop synthetic subscription billings already covered by manually-logged
 *  'subscription'-category expense entries in the same range (FIFO by
 *  amount). Used by the PDF generators that MERGE synthetic billing rows
 *  into the transaction log before computing totals — without this, a
 *  logged Netflix debit + its scheduled billing both land in the merged
 *  list and every derived figure double-counts. */
export const filterUncoveredSubBillings = <T extends { amount: number; date?: string }>(
  billings: T[],
  entries: Entry[],
  startISO: string,
  endISO: string,
): T[] => {
  // Multiset (array) of logged 'subscription'-entry amounts in range.
  const available: number[] = entries
    .filter(e => e.type === 'expense' && e.category === 'subscription'
      && e.date >= startISO && e.date <= endISO)
    .map(e => e.amount);

  // Deterministic processing order: by date, then amount.
  const ordered = [...billings].sort((a, b) => {
    const d = (a.date ?? '').localeCompare(b.date ?? '');
    return d !== 0 ? d : a.amount - b.amount;
  });

  // Pass 1 — exact-amount matching: a billing whose amount exactly matches
  // an available logged amount is dropped and that amount consumed. This
  // stops a pooled total from suppressing the wrong sub (e.g. a logged
  // Netflix ₹649 must not swallow Spotify ₹119).
  const remaining: T[] = [];
  for (const b of ordered) {
    const idx = available.indexOf(b.amount);
    if (idx !== -1) { available.splice(idx, 1); continue; }
    remaining.push(b);
  }

  // Pass 2 — the leftover covered total partially REDUCES remaining
  // billings in order (never drops a whole billing on partial coverage,
  // so totals stay in sync with getUnloggedSubsForRange). Inputs are
  // never mutated — reduced billings are pushed as copies.
  let covered = available.reduce((s, a) => s + a, 0);
  const out: T[] = [];
  for (const b of remaining) {
    if (covered <= 0) { out.push(b); continue; }
    const consumed = Math.min(covered, b.amount);
    covered -= consumed;
    const reduced = b.amount - consumed;
    if (reduced > 0) out.push({ ...b, amount: reduced } as T);
  }
  return out;
};

/** Active days in a range — count of UNIQUE dates that have at least
 *  one transaction. The previous implementation in some PDFs counted
 *  "elapsed calendar days in the week" which gave 4 even when the
 *  user had logged nothing. Now: 0 logged → 0 active. */
export const getActiveDaysInRange = (
  entries: Entry[],
  startISO: string,
  endISO: string,
): number => {
  const unique = new Set<string>();
  for (const e of entries) {
    if (e.date >= startISO && e.date <= endISO) unique.add(e.date);
  }
  return unique.size;
};

/** Safe % change between two periods. Handles every degenerate case
 *  the old `formatChange` did not:
 *    - both 0 → "Same"
 *    - prev 0, curr > 0 → "New activity"
 *    - prev > 0, curr 0 → "-100%"
 *    - normal → "+X%" / "-X%" */
export const formatPeriodChange = (current: number, previous: number): string => {
  if (previous === 0 && current === 0) return 'Same';
  if (previous === 0) return 'New activity';
  if (current === 0) return '-100%';
  const pct = ((current - previous) / previous) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`;
};

/** Same data as `formatPeriodChange` but as a structured object so
 *  callers can color-code positive vs negative changes without parsing
 *  the formatted string. */
export const calcPeriodChange = (
  current: number,
  previous: number,
): { display: string; tone: 'same' | 'new' | 'down' | 'up'; pct: number | null } => {
  if (previous === 0 && current === 0) return { display: 'Same', tone: 'same', pct: 0 };
  if (previous === 0) return { display: 'New activity', tone: 'new', pct: null };
  if (current === 0) return { display: '-100%', tone: 'down', pct: -100 };
  const pct = ((current - previous) / previous) * 100;
  return {
    display: `${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`,
    tone: pct >= 0 ? 'up' : 'down',
    pct,
  };
};

/** Safe savings rate. Returns `null` when income is 0/missing so the
 *  caller can show "N/A" instead of a misleading "0%". */
export const calcSafeSavingsRate = (
  totalIncome: number,
  netSavings: number,
): number | null => {
  if (!Number.isFinite(totalIncome) || totalIncome <= 0) return null;
  return (netSavings / totalIncome) * 100;
};

/** Format a possibly-null savings rate for display. */
export const formatSafeSavingsRate = (rate: number | null): string => {
  if (rate === null) return 'N/A';
  return `${rate.toFixed(1)}%`;
};

// ─── BUDGET HELPERS ───────────────────────────────────────────

export const getBudgetTotalFixed = (budget: Budget): number => {
  return budget.fixedExpenses.reduce((s, f) => s + f.amount, 0);
};

export const getBudgetTotalCategoryLimits = (budget: Budget): number => {
  return budget.categoryLimits.reduce((s, l) => s + l.monthlyLimit, 0);
};

export const getBudgetTotalInvestments = (budget: Budget): number => {
  return budget.investmentTargets.reduce((s, t) => s + t.monthlyTarget, 0);
};

export const getBudgetUnallocated = (budget: Budget): number => {
  return budget.monthlyIncome
    - getBudgetTotalFixed(budget)
    - getBudgetTotalCategoryLimits(budget)
    - getBudgetTotalInvestments(budget);
};

export const getCategorySpentVsBudget = (
  entries: Entry[],
  budget: Budget
): Array<{ categoryId: string; budgeted: number; spent: number; pct: number }> => {
  const summary = calculateSummary(entries, budget);
  return budget.categoryLimits.map(cl => {
    const cat = summary.expenseByCategory.find(c => c.categoryId === cl.categoryId);
    const spent = cat?.amount ?? 0;
    return {
      categoryId: cl.categoryId,
      budgeted: cl.monthlyLimit,
      spent,
      pct: cl.monthlyLimit > 0 ? (spent / cl.monthlyLimit) * 100 : 0,
    };
  });
};

// ─── COMPARISON HELPERS ───────────────────────────────────────

export const calculatePercentChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const getHighestSpendingDay = (dailyTotals: DailyTotal[]): DailyTotal | null => {
  if (dailyTotals.length === 0) return null;
  return dailyTotals.reduce((max, d) => d.expenses > max.expenses ? d : max, dailyTotals[0]);
};

export const getActiveDaysCount = (dailyTotals: DailyTotal[]): number => {
  return dailyTotals.filter(d => d.income > 0 || d.expenses > 0 || d.investments > 0).length;
};

// ═══════════════════════════════════════════════════════════════
// FINANCIAL HEALTH SCORE (0–100) — Indian context
// ═══════════════════════════════════════════════════════════════

export interface FinancialHealthScore {
  overall: number;             // 0–100
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    savingsScore: number;      // 0–25  (savings rate)
    debtScore: number;         // 0–25  (debt-to-income)
    investmentScore: number;   // 0–25  (investment rate)
    budgetScore: number;       // 0–25  (budget adherence)
  };
  metrics: {
    savingsRate: number;
    debtToIncomeRatio: number;
    investmentRate: number;
    budgetAdherence: number;
    emergencyFundMonths: number;
    monthlyEmiTotal: number;
  };
}

export interface NetWorthSummary {
  totalAssets: number;
  liquidAssets: number;
  fixedAssets: number;
  investmentAssets: number;
  totalLiabilities: number;
  loanLiabilities: number;
  creditCardDebt: number;
  netWorth: number;
  debtToAssetRatio: number;
  assetBreakdown: { label: string; value: number; color: string; icon: string }[];
  liabilityBreakdown: { label: string; value: number; color: string; icon: string }[];
}

export interface SpendingInsight {
  type: 'warning' | 'positive' | 'info';
  titleKey: string;
  descKey: string;
  value?: string;
  icon: string;
}

import { getAllAccounts } from './expenseStorage';
import { getAllLoans, LOAN_TYPE_META } from '../utils/loanStorage';
import type { BankAccount } from '../types/expense';
import type { SavedLoan } from '../utils/loanStorage';

export const calculateFinancialHealth = (
  summary: PeriodSummary,
  budget: Budget | undefined,
  accounts: BankAccount[],
  loans: SavedLoan[],
): FinancialHealthScore => {
  const { totalIncome, totalExpenses, totalInvestments, savingsRate, investmentRate } = summary;

  // 1. Savings Score (0–25) — target ≥20% savings rate
  const savingsScore = Math.min(25, Math.round((Math.max(0, savingsRate) / 30) * 25));

  // 2. Debt Score (0–25) — EMI-to-income ratio (lower = better)
  const monthlyEmiTotal = loans
    .filter(l => l.isActive)
    .reduce((s, l) => s + l.emiAmount, 0);
  const debtToIncomeRatio = totalIncome > 0 ? (monthlyEmiTotal / totalIncome) * 100 : 0;
  // <30% is ideal, >50% is dangerous
  const debtScore = debtToIncomeRatio <= 0
    ? 25
    : debtToIncomeRatio <= 30
    ? Math.round(25 - (debtToIncomeRatio / 30) * 8)
    : debtToIncomeRatio <= 50
    ? Math.round(17 - ((debtToIncomeRatio - 30) / 20) * 12)
    : Math.max(0, Math.round(5 - ((debtToIncomeRatio - 50) / 50) * 5));

  // 3. Investment Score (0–25) — target ≥15% of income
  const investmentScore = Math.min(25, Math.round((Math.max(0, investmentRate) / 20) * 25));

  // 4. Budget Adherence Score (0–25)
  let budgetScore = 12; // neutral default if no budget
  if (budget && budget.monthlyIncome > 0) {
    const budgetedExpenses = budget.categoryLimits.reduce((s, l) => s + l.monthlyLimit, 0)
      + budget.fixedExpenses.reduce((s, f) => s + f.amount, 0);
    if (budgetedExpenses > 0) {
      const adherence = totalExpenses <= budgetedExpenses
        ? 100
        : Math.max(0, 100 - ((totalExpenses - budgetedExpenses) / budgetedExpenses) * 100);
      budgetScore = Math.round((adherence / 100) * 25);
    }
  }

  const overall = savingsScore + debtScore + investmentScore + budgetScore;

  // Emergency fund = liquid assets / monthly expenses
  const liquidAssets = accounts
    .filter(a => a.isActive && a.accountType !== 'credit_card' && a.accountType !== 'fixed_deposit')
    .reduce((s, a) => s + a.manualBalance, 0);
  const emergencyFundMonths = totalExpenses > 0 ? liquidAssets / totalExpenses : 0;

  const grade: FinancialHealthScore['grade'] =
    overall >= 90 ? 'A+' :
    overall >= 80 ? 'A' :
    overall >= 70 ? 'B+' :
    overall >= 60 ? 'B' :
    overall >= 45 ? 'C' :
    overall >= 30 ? 'D' : 'F';

  return {
    overall,
    grade,
    breakdown: { savingsScore, debtScore, investmentScore, budgetScore },
    metrics: {
      savingsRate,
      debtToIncomeRatio,
      investmentRate,
      budgetAdherence: budgetScore * 4, // scale to 0-100
      emergencyFundMonths,
      monthlyEmiTotal,
    },
  };
};

// ─── NET WORTH CALCULATION ───────────────────────────────────

export const calculateNetWorth = (
  accounts: BankAccount[],
  loans: SavedLoan[],
  investmentEntries: Entry[],
): NetWorthSummary => {
  const activeAccounts = accounts.filter(a => a.isActive);
  const activeLoans = loans.filter(l => l.isActive);

  // Assets
  const liquidAssets = activeAccounts
    .filter(a => ['savings', 'current', 'salary', 'wallet', 'cash'].includes(a.accountType))
    .reduce((s, a) => s + a.manualBalance, 0);

  const fixedAssets = activeAccounts
    .filter(a => a.accountType === 'fixed_deposit')
    .reduce((s, a) => s + a.manualBalance, 0);

  // Investment entries (cumulative from all time)
  const investmentAssets = investmentEntries.reduce((s, e) => s + e.amount, 0);

  const totalAssets = liquidAssets + fixedAssets + investmentAssets;

  // Liabilities
  const creditCardDebt = activeAccounts
    .filter(a => a.accountType === 'credit_card')
    .reduce((s, a) => s + a.manualBalance, 0);

  // Outstanding loan amounts (simplified: original amount - estimated paid)
  const loanLiabilities = activeLoans.reduce((s, l) => {
    const monthsPaid = countEmisPaid(l.disbursementDate, l.emiDueDay, l.tenureMonths);
    const principalPaid = estimatePrincipalPaid(l.loanAmount, l.interestRate, l.tenureMonths, monthsPaid);
    return s + Math.max(0, l.loanAmount - principalPaid);
  }, 0);

  const totalLiabilities = creditCardDebt + loanLiabilities;
  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  // Breakdown for charts
  const assetBreakdown: NetWorthSummary['assetBreakdown'] = [];
  if (liquidAssets > 0) assetBreakdown.push({ label: 'expenses.liquidAssets', value: liquidAssets, color: '#3b82f6', icon: '💰' });
  if (fixedAssets > 0) assetBreakdown.push({ label: 'expenses.fixedDeposits', value: fixedAssets, color: '#8b5cf6', icon: '🏦' });
  if (investmentAssets > 0) assetBreakdown.push({ label: 'expenses.investments', value: investmentAssets, color: '#10b981', icon: '📈' });

  const liabilityBreakdown: NetWorthSummary['liabilityBreakdown'] = [];
  if (creditCardDebt > 0) liabilityBreakdown.push({ label: 'expenses.creditCardDebt', value: creditCardDebt, color: '#ef4444', icon: '💳' });

  activeLoans.forEach(l => {
    const meta = LOAN_TYPE_META[l.loanType];
    const monthsPaid = countEmisPaid(l.disbursementDate, l.emiDueDay, l.tenureMonths);
    const outstanding = Math.max(0, l.loanAmount - estimatePrincipalPaid(l.loanAmount, l.interestRate, l.tenureMonths, monthsPaid));
    if (outstanding > 0) {
      liabilityBreakdown.push({
        label: l.nickName,
        value: outstanding,
        color: meta.color,
        icon: meta.icon,
      });
    }
  });

  return {
    totalAssets, liquidAssets, fixedAssets, investmentAssets,
    totalLiabilities, loanLiabilities, creditCardDebt,
    netWorth, debtToAssetRatio,
    assetBreakdown, liabilityBreakdown,
  };
};

// Count EMIs whose due date has actually passed.
// More accurate than a flat year/month difference: skips EMIs where the due
// day this month hasn't come yet.
const countEmisPaid = (disbursementDate: string, emiDueDay: number, tenureMonths: number): number => {
  const disb = new Date(disbursementDate + 'T00:00:00');
  const now = new Date();
  if (now < disb) return 0;

  let count = 0;
  // First EMI is one month after disbursement, on emiDueDay (clamped to month length)
  const cursor = new Date(disb.getFullYear(), disb.getMonth() + 1, 1);
  for (let i = 0; i < tenureMonths; i++) {
    const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    cursor.setDate(Math.min(emiDueDay, lastDay));
    if (cursor <= now) {
      count++;
    } else {
      break;
    }
    // Advance to next month
    cursor.setMonth(cursor.getMonth() + 1);
    cursor.setDate(1);
  }
  return count;
};

// Estimate principal paid using reducing balance amortization
const estimatePrincipalPaid = (principal: number, annualRate: number, tenureMonths: number, monthsPaid: number): number => {
  if (monthsPaid <= 0 || annualRate <= 0 || tenureMonths <= 0) return 0;
  const r = annualRate / 12 / 100;
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  let balance = principal;
  const months = Math.min(monthsPaid, tenureMonths);
  for (let i = 0; i < months; i++) {
    const interest = balance * r;
    const principalPart = emi - interest;
    balance -= principalPart;
  }
  return principal - Math.max(0, balance);
};

// ─── SPENDING INSIGHTS ENGINE ────────────────────────────────

export const generateInsights = (
  currentSummary: PeriodSummary,
  previousSummary: PeriodSummary | null,
  budget: Budget | undefined,
  healthScore: FinancialHealthScore,
): SpendingInsight[] => {
  const insights: SpendingInsight[] = [];

  // 1. Expense spike detection
  if (previousSummary && previousSummary.totalExpenses > 0) {
    const expenseChange = calculatePercentChange(currentSummary.totalExpenses, previousSummary.totalExpenses);
    if (expenseChange > 20) {
      insights.push({
        type: 'warning',
        titleKey: 'expenses.insightExpenseSpike',
        descKey: 'expenses.insightExpenseSpikeDesc',
        value: `+${expenseChange.toFixed(0)}%`,
        icon: '📈',
      });
    } else if (expenseChange < -10) {
      insights.push({
        type: 'positive',
        titleKey: 'expenses.insightExpenseDrop',
        descKey: 'expenses.insightExpenseDropDesc',
        value: `${expenseChange.toFixed(0)}%`,
        icon: '📉',
      });
    }
  }

  // 2. Savings rate insight
  if (currentSummary.savingsRate < 10 && currentSummary.totalIncome > 0) {
    insights.push({
      type: 'warning',
      titleKey: 'expenses.insightLowSavings',
      descKey: 'expenses.insightLowSavingsDesc',
      value: fmtPct(currentSummary.savingsRate),
      icon: '⚠️',
    });
  } else if (currentSummary.savingsRate >= 30) {
    insights.push({
      type: 'positive',
      titleKey: 'expenses.insightGreatSavings',
      descKey: 'expenses.insightGreatSavingsDesc',
      value: fmtPct(currentSummary.savingsRate),
      icon: '🌟',
    });
  }

  // 3. Debt-to-income warning
  if (healthScore.metrics.debtToIncomeRatio > 40) {
    insights.push({
      type: 'warning',
      titleKey: 'expenses.insightHighDebt',
      descKey: 'expenses.insightHighDebtDesc',
      value: `${healthScore.metrics.debtToIncomeRatio.toFixed(0)}%`,
      icon: '🏦',
    });
  }

  // 4. Emergency fund
  if (healthScore.metrics.emergencyFundMonths < 3) {
    insights.push({
      type: 'warning',
      titleKey: 'expenses.insightLowEmergency',
      descKey: 'expenses.insightLowEmergencyDesc',
      value: `${healthScore.metrics.emergencyFundMonths.toFixed(1)} mo`,
      icon: '🛡️',
    });
  } else if (healthScore.metrics.emergencyFundMonths >= 6) {
    insights.push({
      type: 'positive',
      titleKey: 'expenses.insightStrongEmergency',
      descKey: 'expenses.insightStrongEmergencyDesc',
      value: `${healthScore.metrics.emergencyFundMonths.toFixed(1)} mo`,
      icon: '✅',
    });
  }

  // 5. Budget overrun
  if (budget && currentSummary.budgetVariance > 0) {
    insights.push({
      type: 'warning',
      titleKey: 'expenses.insightOverBudget',
      descKey: 'expenses.insightOverBudgetDesc',
      value: fmtINR(currentSummary.budgetVariance),
      icon: '💸',
    });
  }

  // 6. Top category change
  if (previousSummary && currentSummary.expenseByCategory.length > 0) {
    const topCat = currentSummary.expenseByCategory[0];
    const prevTopCat = previousSummary.expenseByCategory.find(c => c.categoryId === topCat.categoryId);
    if (prevTopCat && prevTopCat.amount > 0) {
      const catChange = calculatePercentChange(topCat.amount, prevTopCat.amount);
      if (catChange > 30) {
        insights.push({
          type: 'info',
          titleKey: 'expenses.insightTopCatSpike',
          descKey: 'expenses.insightTopCatSpikeDesc',
          value: `${topCat.categoryIcon} +${catChange.toFixed(0)}%`,
          icon: '🔥',
        });
      }
    }
  }

  // 7. Investment rate
  if (currentSummary.investmentRate > 0 && currentSummary.investmentRate < 10) {
    insights.push({
      type: 'info',
      titleKey: 'expenses.insightLowInvestment',
      descKey: 'expenses.insightLowInvestmentDesc',
      value: fmtPct(currentSummary.investmentRate),
      icon: '📊',
    });
  }

  return insights;
};
