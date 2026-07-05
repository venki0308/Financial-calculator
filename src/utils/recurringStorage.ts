// ═══════════════════════════════════════════════════════════════
// FINCALIX — RECURRING TRANSACTIONS STORAGE ENGINE
// Raw CRUD on localStorage for recurring transaction RULES (rent,
// EMIs, salary, school fees…) + the materializer that converts due
// rules into REAL entries in expenseStorage. Mirrors the soft-delete
// + try/catch-read pattern of expenseStorage.ts / businessStorage.ts.
//
// Storage key (also validated in dataIntegrity.ts and wired into
// Settings export/import + clear-data):
//   'fincalix_recurring' → RecurringRule[]
//
// ADDITIVE-ONLY GUARANTEE: if the key is absent (all existing users),
// every function here is a no-op that returns [] / {created: 0}.
// ═══════════════════════════════════════════════════════════════

import type { PaymentMethod } from '../types/expense';
import { getAllEntries, saveEntry, createEntry, getCategoryById } from './expenseStorage';
import { todayStr, shiftLocalDate } from './dateUtils';

export type RecurringFrequency = 'monthly' | 'weekly' | 'yearly';

export interface RecurringRule {
  id: string;
  type: 'expense' | 'income';
  amount: number;               // always positive
  category: string;             // category id (types/expense.ts defaults)
  paymentMethod: PaymentMethod;
  note?: string;
  frequency: RecurringFrequency;
  /** monthly → 1-31 day-of-month (31 doubles as "last day": clamped);
   *  weekly  → 0-6 day-of-week (Sun=0);
   *  yearly  → 'MM-DD' string. */
  anchorDay: number | string;
  nextDueDate: string;          // 'YYYY-MM-DD' — next occurrence to materialize
  isActive: boolean;
  isDeleted?: boolean;
  createdAt: string;            // ISO timestamp
  updatedAt: string;            // ISO timestamp
}

const RECURRING_KEY = 'fincalix_recurring';

/** Safety cap: max occurrences materialized/advanced per rule per app open. */
const MAX_CATCHUP_ITERATIONS = 24;
/** Occurrences older than this many days are skipped (advanced without
 *  creating entries) so an old rule doesn't spam history on first run. */
const LOOKBACK_DAYS = 90;

// ─── CRUD (expenseStorage style) ──────────────────────────────

export const getAllRules = (): RecurringRule[] => {
  try {
    const data = localStorage.getItem(RECURRING_KEY);
    if (!data) return [];
    const raw: RecurringRule[] = JSON.parse(data);
    return raw.filter(r => !r.isDeleted);
  } catch { return []; }
};

const getAllRulesRaw = (): RecurringRule[] => {
  try {
    const data = localStorage.getItem(RECURRING_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const saveRule = (rule: RecurringRule): void => {
  const all = getAllRulesRaw();
  const idx = all.findIndex(r => r.id === rule.id);
  if (idx >= 0) {
    all[idx] = { ...rule, updatedAt: new Date().toISOString() };
  } else {
    all.push(rule);
  }
  localStorage.setItem(RECURRING_KEY, JSON.stringify(all));
};

export const deleteRule = (id: string): void => {
  const all = getAllRulesRaw();
  const idx = all.findIndex(r => r.id === id);
  if (idx >= 0) {
    all[idx].isDeleted = true;
    all[idx].updatedAt = new Date().toISOString();
    localStorage.setItem(RECURRING_KEY, JSON.stringify(all));
  }
};

export const generateRuleId = (): string => {
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const createRule = (
  partial: Omit<RecurringRule, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt'>,
): RecurringRule => {
  const now = new Date().toISOString();
  return {
    ...partial,
    id: generateRuleId(),
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
};

/** Count of active (non-deleted, isActive) rules — used by the BudgetTab badge. */
export const getActiveRulesCount = (): number =>
  getAllRules().filter(r => r.isActive).length;

// ─── DATE MATH (mirrors addMonthsISO in expenseCalculations.ts) ──

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** Last day of month; month is 1-12. */
const lastDayOfMonth = (year: number, month: number): number =>
  new Date(year, month, 0).getDate();

/** Add N months to 'YYYY-MM-DD', re-anchoring on `anchorDay` with
 *  month-end clamping. Anchoring matters: a day-31 rule must go
 *  Jan 31 → Feb 28 → Mar 31 (plain addMonthsISO would drift to Mar 28). */
export const addMonthsAnchoredISO = (iso: string, months: number, anchorDay?: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const base = new Date(y, m - 1 + months, 1);
  const wantDay = typeof anchorDay === 'number' && anchorDay >= 1 && anchorDay <= 31 ? anchorDay : d;
  const day = Math.min(wantDay, lastDayOfMonth(base.getFullYear(), base.getMonth() + 1));
  return `${base.getFullYear()}-${pad2(base.getMonth() + 1)}-${pad2(day)}`;
};

/** Advance a due date by one cycle of the rule's frequency. Pure. */
export const advanceRuleDate = (
  dueISO: string,
  frequency: RecurringFrequency,
  anchorDay: number | string,
): string => {
  if (frequency === 'weekly') return shiftLocalDate(dueISO, 7);
  if (frequency === 'yearly') {
    const year = Number(dueISO.slice(0, 4)) + 1;
    const anchor = typeof anchorDay === 'string' && /^\d{2}-\d{2}$/.test(anchorDay)
      ? anchorDay
      : dueISO.slice(5);
    const [mm, dd] = anchor.split('-').map(Number);
    // Feb-29 anchors clamp to Feb-28 in non-leap years.
    const day = Math.min(dd, lastDayOfMonth(year, mm));
    return `${year}-${pad2(mm)}-${pad2(day)}`;
  }
  // monthly
  return addMonthsAnchoredISO(dueISO, 1, typeof anchorDay === 'number' ? anchorDay : undefined);
};

// ─── MATERIALIZER ─────────────────────────────────────────────
// Called once per app open (App.tsx AppContent init effect, after the
// data-integrity check). For every active rule whose nextDueDate has
// arrived, creates a REAL entry in expenseStorage dated on the due
// date, then advances nextDueDate — looping to catch up after the app
// was closed for a while.
//
// NOTE on UI refresh: if entries are created while the expense tracker
// is already visible, the tabs pick them up on their next mount via
// their existing refreshKey / re-mount pattern — the materializer runs
// before the lazy-loaded tab pages mount on a normal app open, so in
// practice the entries are there when the user lands on the tracker.

export interface MaterializeResult {
  created: number;
}

export const materializeDueRecurring = (): MaterializeResult => {
  let created = 0;
  try {
    const rules = getAllRulesRaw();
    if (rules.length === 0) return { created };

    const today = todayStr();
    const lookbackFloor = shiftLocalDate(today, -LOOKBACK_DAYS);

    // Idempotency index: every non-deleted entry already materialized
    // from a rule carries recurringId — never create the same
    // (recurringId, date) pair twice.
    const existingKeys = new Set(
      getAllEntries()
        .filter(e => e.recurringId)
        .map(e => `${e.recurringId}|${e.date}`),
    );

    let rulesMutated = false;

    for (const rule of rules) {
      if (rule.isDeleted || !rule.isActive) continue;
      if (typeof rule.nextDueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(rule.nextDueDate)) continue;

      let iterations = 0;
      while (rule.nextDueDate <= today && iterations < MAX_CATCHUP_ITERATIONS) {
        const due = rule.nextDueDate;

        // Lookback floor: very old occurrences are skipped (date is
        // advanced but no entry is written) so history isn't spammed.
        if (due >= lookbackFloor) {
          const key = `${rule.id}|${due}`;
          if (!existingKeys.has(key)) {
            const entry = createEntry({
              type: rule.type,
              amount: rule.amount,
              date: due,
              category: rule.category,
              description: rule.note || getCategoryById(rule.category)?.name || '',
              paymentMethod: rule.paymentMethod,
              accountId: undefined,
              recurrence: 'none',
              recurringId: rule.id,
            });
            saveEntry(entry);
            existingKeys.add(key);
            created++;
          }
        }

        const next = advanceRuleDate(due, rule.frequency, rule.anchorDay);
        // Defensive: a non-advancing date would loop forever without the cap.
        if (next <= due) break;
        rule.nextDueDate = next;
        rule.updatedAt = new Date().toISOString();
        rulesMutated = true;
        iterations++;
      }
    }

    if (rulesMutated) {
      localStorage.setItem(RECURRING_KEY, JSON.stringify(rules));
    }
  } catch {
    // Storage unavailable / corrupt — never crash app startup.
  }
  return { created };
};
