// ═══════════════════════════════════════════════════════════════
// FINCALIX EXPENSE TRACKER — "WARM WEALTH" DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════════

import { useSettingsStore } from '../store/useSettingsStore';

export const expenseTheme = {
  light: {
    bgPrimary: '#F7F4EF',
    bgCard: '#FFFFFF',
    bgCardElevated: '#FEFCF8',
    bgIncome: '#F0FDF4',
    bgExpense: '#FFF5F5',
    bgInvestment: '#F5F3FF',
    accentIncome: '#16A34A',
    accentExpense: '#DC2626',
    accentInvestment: '#7C3AED',
    accentPrimary: '#1B3A2D',
    accentGold: '#D97706',
    textPrimary: '#1C1917',
    textSecondary: '#78716C',
    textMuted: '#A8A29E',
    shadowSoft: '0 2px 12px rgba(0,0,0,0.06)',
    shadowCard: '0 4px 24px rgba(0,0,0,0.08)',
    borderSubtle: 'rgba(0,0,0,0.06)',
    isDark: false,
  },
  dark: {
    bgPrimary: '#0F1923',
    bgCard: '#1E2D3D',
    bgCardElevated: '#243040',
    bgIncome: '#052e16',
    bgExpense: '#450a0a',
    bgInvestment: '#1e1b4b',
    accentIncome: '#4ade80',
    accentExpense: '#f87171',
    accentInvestment: '#a78bfa',
    accentPrimary: '#4ade80',
    accentGold: '#fbbf24',
    textPrimary: '#F1F0EE',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    shadowSoft: '0 2px 12px rgba(0,0,0,0.2)',
    shadowCard: '0 4px 24px rgba(0,0,0,0.3)',
    borderSubtle: 'rgba(255,255,255,0.08)',
    isDark: true,
  },
};

export type ExpenseThemeMode = typeof expenseTheme.light;

export function useExpenseTheme(): ExpenseThemeMode {
  // Use the app's actual dark mode setting from Zustand store
  const darkMode = useSettingsStore(s => s.darkMode);
  return darkMode ? expenseTheme.dark : expenseTheme.light;
}

// Entry type colors
export const TYPE_COLORS = {
  expense: { light: '#DC2626', dark: '#f87171', bg: { light: '#FFF5F5', dark: '#450a0a' } },
  income: { light: '#16A34A', dark: '#4ade80', bg: { light: '#F0FDF4', dark: '#052e16' } },
  investment: { light: '#7C3AED', dark: '#a78bfa', bg: { light: '#F5F3FF', dark: '#1e1b4b' } },
  transfer: { light: '#0284c7', dark: '#38bdf8', bg: { light: '#f0f9ff', dark: '#0c4a6e' } },
};

// Greeting keys (return i18n keys, not hardcoded text)
export function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'expenses.greetingMorning';
  if (h >= 12 && h < 18) return 'expenses.greetingAfternoon';
  if (h >= 18 && h < 22) return 'expenses.greetingEvening';
  return 'expenses.greetingNight';
}

// Savings rate rating (return keys, not hardcoded labels)
export function getSavingsRating(rate: number): { labelKey: string; emoji: string; color: string } {
  if (rate >= 30) return { labelKey: 'expenses.ratingExcellent', emoji: '🌟', color: '#16A34A' };
  if (rate >= 20) return { labelKey: 'expenses.ratingGood', emoji: '✅', color: '#22c55e' };
  if (rate >= 10) return { labelKey: 'expenses.ratingModerate', emoji: '🟡', color: '#D97706' };
  return { labelKey: 'expenses.ratingNeedsWork', emoji: '⚠️', color: '#DC2626' };
}

// Budget status (return keys)
export function getBudgetStatus(pct: number): { labelKey: string; color: string; bgColor: string } {
  if (pct > 100) return { labelKey: 'expenses.statusOverBudget', color: '#DC2626', bgColor: '#FEE2E2' };
  if (pct >= 90) return { labelKey: 'expenses.statusAlmostReached', color: '#EA580C', bgColor: '#FFF7ED' };
  if (pct >= 70) return { labelKey: 'expenses.statusWatchOut', color: '#D97706', bgColor: '#FFFBEB' };
  return { labelKey: 'expenses.statusOnTrack', color: '#16A34A', bgColor: '#F0FDF4' };
}

// Percent change with zero handling
export function formatChange(current: number, previous: number): { display: string; color: string; isNew: boolean } {
  if (previous === 0) return { display: 'new', color: '#3b82f6', isNew: true };
  const pct = ((current - previous) / previous) * 100;
  const isDown = pct < 0;
  return {
    display: `${isDown ? '' : '+'}${pct.toFixed(0)}%`,
    color: isDown ? '#16A34A' : '#DC2626',
    isNew: false,
  };
}

// Tracking streak
export function calculateStreak(entries: { date: string }[]): number {
  if (entries.length === 0) return 0;
  const dates = new Set(entries.map(e => e.date));
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (dates.has(ds)) streak++;
    else if (i > 0) break;
  }
  return streak;
}
