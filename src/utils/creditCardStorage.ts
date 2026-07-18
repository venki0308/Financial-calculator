/**
 * Credit Card Storage — localStorage CRUD for FinCalix Credit Card Manager
 */

import type { CCCard } from './creditCardCalculations';

const STORAGE_KEY = 'fincalix_credit_cards';
const STRATEGY_KEY = 'fincalix_cc_payoff_strategy';

// ─── Read ────────────────────────────────────────────────────────────────────

function getAllRaw(): CCCard[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as CCCard[];
  } catch { return []; }
}

export function getAllCreditCards(): CCCard[] {
  return getAllRaw().filter(c => !c.isDeleted);
}

export function getCreditCardById(id: string): CCCard | null {
  return getAllCreditCards().find(c => c.id === id) || null;
}

// ─── Write ───────────────────────────────────────────────────────────────────

/** Fire-and-forget native reminder re-sync so a just-saved card gets its
 *  due-date reminders NOW instead of on the next app launch. Dynamic import
 *  avoids a static cycle (NotificationScheduler imports getAllCreditCards). */
function refreshNativeReminders(): void {
  void import('../services/NotificationScheduler')
    .then(m => m.NotificationScheduler.refreshReminders())
    .catch(() => { /* scheduler unavailable — next launch covers it */ });
}

export function saveCreditCard(card: CCCard): void {
  const all = getAllRaw();
  const idx = all.findIndex(c => c.id === card.id);
  const now = new Date().toISOString();
  if (idx >= 0) {
    all[idx] = { ...card, updatedAt: now };
  } else {
    all.push({ ...card, createdAt: now, updatedAt: now });
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    console.warn('[CCStorage] localStorage full');
  }
  refreshNativeReminders();
}

export function deleteCreditCard(id: string): void {
  const all = getAllRaw();
  const idx = all.findIndex(c => c.id === id);
  if (idx >= 0) {
    all[idx].isDeleted = true;
    all[idx].updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      console.warn('[CCStorage] localStorage full');
    }
    refreshNativeReminders();
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function generateCardId(): string {
  return 'cc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

export function getLastPayoffStrategy(): string {
  return localStorage.getItem(STRATEGY_KEY) || 'avalanche';
}

export function savePayoffStrategy(strategy: string): void {
  try {
    localStorage.setItem(STRATEGY_KEY, strategy);
  } catch { /* ignore */ }
}

// ─── Default Card Template ───────────────────────────────────────────────────

export function createDefaultCard(partial?: Partial<CCCard>): CCCard {
  const now = new Date().toISOString();
  return {
    id: generateCardId(),
    cardName: '',
    bankName: '',
    cardNetwork: 'Visa',
    cardColor: '#3b82f6',
    last4Digits: '',
    creditLimit: 100000,
    currentBalance: 0,
    minimumDue: 0,
    statementBalance: 0,
    annualInterestRate: 42,
    annualFee: 0,
    annualFeeMonth: 1,
    feeWaiverSpend: 0,
    cashAdvanceFee: 2.5,
    forexMarkup: 3.5,
    latePaymentFee: 500,
    overLimitFee: 500,
    statementDate: 1,
    dueDate: 20,
    cardOpenedDate: now.slice(0, 10),
    rewardType: 'none',
    baseRewardRate: 0,
    rewardValuePerPoint: 0.25,
    pendingRewardPoints: 0,
    annualSpend: 0,
    isActive: true,
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

// ─── Card Color Presets ──────────────────────────────────────────────────────

export const CARD_COLORS = [
  '#1e3a5f', '#0f4c75', '#3282b8', '#2d6a4f', '#40916c',
  '#7b2cbf', '#9d4edd', '#e63946', '#457b9d', '#1d3557',
  '#2b2d42', '#8d99ae', '#ef476f', '#ffd166', '#06d6a0',
  '#118ab2', '#073b4c',
];

export const BANK_SUGGESTIONS = [
  'HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'IndusInd', 'IDFC First',
  'RBL', 'Yes Bank', 'BOB', 'PNB', 'Canara', 'Union', 'Federal',
  'Standard Chartered', 'HSBC', 'Citi', 'American Express', 'OneCard',
  'Scapia', 'Jupiter', 'Fi', 'Slice', 'Kiwi',
];
