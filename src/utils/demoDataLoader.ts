// ═══════════════════════════════════════════════════════════════
// FINCALIX — DEMO DATA LOADER (for QA / first-time users)
// Injects 12 sample entries spanning daily/weekly/monthly/yearly
// so users can see all calculations and reports working.
// ═══════════════════════════════════════════════════════════════

import type { Entry, EntryType, PaymentMethod } from '../types/expense';
import { saveEntry, createEntry, getAllEntries } from './expenseStorage';
import { toLocalDateStr } from './dateUtils';
import i18n from '../i18n';

function shiftDate(base: Date, deltaDays: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + deltaDays);
  return toLocalDateStr(d);
}

interface SampleEntry {
  type: EntryType;
  amount: number;
  daysAgo: number;
  category: string;
  /** i18n key for the description (e.g. 'demo.salary') */
  descKey: string;
  paymentMethod: PaymentMethod;
}

const SAMPLE_ENTRIES: SampleEntry[] = [
  // ── DAILY (today) ──
  { type: 'income',     amount: 80000, daysAgo: 0,  category: 'salary',          descKey: 'demo.salary',           paymentMethod: 'net_banking' },
  { type: 'expense',    amount: 450,   daysAgo: 0,  category: 'food_dining',     descKey: 'demo.lunch',            paymentMethod: 'upi' },
  { type: 'expense',    amount: 1200,  daysAgo: 0,  category: 'groceries',       descKey: 'demo.grocery',          paymentMethod: 'debit_card' },
  // ── THIS WEEK ──
  { type: 'expense',    amount: 350,   daysAgo: 1,  category: 'transport',       descKey: 'demo.transport',        paymentMethod: 'upi' },
  { type: 'investment', amount: 5000,  daysAgo: 2,  category: 'inv_mutual_fund', descKey: 'demo.sip',              paymentMethod: 'auto_debit' },
  { type: 'expense',    amount: 2500,  daysAgo: 3,  category: 'shopping',        descKey: 'demo.shopping',         paymentMethod: 'credit_card' },
  // ── EARLIER THIS MONTH ──
  { type: 'expense',    amount: 15000, daysAgo: 5,  category: 'rent_housing',    descKey: 'demo.rent',             paymentMethod: 'net_banking' },
  { type: 'expense',    amount: 1800,  daysAgo: 6,  category: 'utilities',       descKey: 'demo.electricity',      paymentMethod: 'auto_debit' },
  { type: 'investment', amount: 3000,  daysAgo: 6,  category: 'inv_ppf',         descKey: 'demo.ppf',              paymentMethod: 'net_banking' },
  // ── PREVIOUS MONTH ──
  { type: 'income',     amount: 78000, daysAgo: 33, category: 'salary',          descKey: 'demo.lastSalary',       paymentMethod: 'net_banking' },
  { type: 'expense',    amount: 22000, daysAgo: 23, category: 'rent_housing',    descKey: 'demo.lastRent',         paymentMethod: 'net_banking' },
  { type: 'investment', amount: 5000,  daysAgo: 28, category: 'inv_mutual_fund', descKey: 'demo.lastSip',          paymentMethod: 'auto_debit' },
];

export interface DemoLoadResult {
  added: number;
  alreadyExisted: number;
}

/**
 * Inject 12 sample entries into localStorage for QA / demo purposes.
 * Idempotent: skips entries that already exist (matched by descKey + date + amount).
 * Description text is translated using the user's current locale at insert time.
 */
export const loadDemoData = (): DemoLoadResult => {
  const today = new Date();
  const existing = getAllEntries();
  let added = 0;
  let alreadyExisted = 0;

  SAMPLE_ENTRIES.forEach(sample => {
    const date = shiftDate(today, -sample.daysAgo);
    // Translate at insert time using the active language
    const description = i18n.t(sample.descKey, { defaultValue: sample.descKey.replace('demo.', '') });

    // Match on date + amount + category to remain idempotent across languages
    const duplicate = existing.find(e =>
      e.date === date
      && e.amount === sample.amount
      && e.category === sample.category,
    );

    if (duplicate) {
      alreadyExisted++;
      return;
    }

    const entry: Entry = createEntry({
      type: sample.type,
      amount: sample.amount,
      date,
      category: sample.category,
      description,
      paymentMethod: sample.paymentMethod,
      accountId: undefined,
      recurrence: 'none',
    });
    saveEntry(entry);
    added++;
  });

  return { added, alreadyExisted };
};

/**
 * Get the count of sample entries that would be added.
 */
export const getDemoEntryCount = (): number => SAMPLE_ENTRIES.length;
