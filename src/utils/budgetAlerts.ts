// Budget overspend alerts for the LIVE expense model (fincalix_* storage).
//
// History: 80%/100% budget alerts existed only in useBudgetTrackerStore.addEntry,
// which nothing calls — so users never received the alert the app promised.
// This util is the working replacement, invoked from AddEntrySheet after a
// successful expense save. Crossing-based (prev < threshold ≤ now), so each
// threshold fires at most once per cycle; useNotificationStore additionally
// dedupes same-type notifications within a day.
import type { Entry } from '../types/expense';
import { getBudgetForMonth, getEntriesForDateRange, getAllCategories } from './expenseStorage';
import { getCycleRangeForMonth, getMonthStartDay } from './expenseCalculations';
import { useNotificationStore } from '../store/useNotificationStore';

const fmtINR = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/** Salary-cycle-aware: which budget month ('YYYY-MM') does this date fall in? */
const budgetMonthForDate = (dateStr: string): { monthStr: string; start: string; end: string } => {
    const startDay = getMonthStartDay();
    const d = new Date(dateStr + 'T00:00:00');
    let year = d.getFullYear();
    let month = d.getMonth() + 1; // 1-based
    let range = getCycleRangeForMonth(year, month, startDay);
    if (dateStr < range.start) {
        month -= 1;
        if (month === 0) { month = 12; year -= 1; }
        range = getCycleRangeForMonth(year, month, startDay);
    } else if (dateStr > range.end) {
        month += 1;
        if (month === 13) { month = 1; year += 1; }
        range = getCycleRangeForMonth(year, month, startDay);
    }
    return { monthStr: `${year}-${String(month).padStart(2, '0')}`, start: range.start, end: range.end };
};

/**
 * Fire in-app notifications when this newly saved EXPENSE entry crosses
 * 80% / 100% of the overall monthly budget, or 100% of its category limit.
 * No-op for income/investment/transfer entries and months without a budget.
 */
export const checkBudgetAlerts = (entry: Entry): void => {
    try {
        if (entry.type !== 'expense' || entry.amount <= 0) return;

        const { monthStr, start, end } = budgetMonthForDate(entry.date);
        const budget = getBudgetForMonth(monthStr);
        if (!budget) return;

        const cycleEntries = getEntriesForDateRange(start, end).filter(e => e.type === 'expense');
        const spent = cycleEntries.reduce((s, e) => s + e.amount, 0);
        const prevSpent = spent - entry.amount;
        const notify = useNotificationStore.getState().addNotification;

        // Overall budget = monthly income set in the Budget tab.
        const overall = budget.monthlyIncome;
        if (overall > 0) {
            if (spent >= overall && prevSpent < overall) {
                notify({
                    type: 'budget_exceeded', category: 'alert', icon: '🚨', isActionable: true, actionRoute: '/expenses',
                    title: `Budget Exceeded — ${monthStr}`,
                    body: `You've spent ${fmtINR(spent)}, ${fmtINR(spent - overall)} over your ${fmtINR(overall)} monthly budget.`,
                    metadata: { month: monthStr, overage: spent - overall, total: spent },
                });
            } else if (spent >= overall * 0.8 && prevSpent < overall * 0.8) {
                notify({
                    type: 'budget_alert_80', category: 'alert', icon: '⚠️', isActionable: true, actionRoute: '/expenses',
                    title: 'Budget Alert — 80% used',
                    body: `You've used ${fmtINR(spent)} of your ${fmtINR(overall)} monthly budget. ${fmtINR(overall - spent)} remaining.`,
                    metadata: { monthYear: monthStr, spent, budget: overall, remaining: overall - spent },
                });
            }
        }

        // Category limit crossing (100% only — keeps noise low).
        const limit = budget.categoryLimits.find(cl => cl.categoryId === entry.category);
        if (limit && limit.monthlyLimit > 0) {
            const catSpent = cycleEntries.filter(e => e.category === entry.category).reduce((s, e) => s + e.amount, 0);
            const catPrev = catSpent - entry.amount;
            if (catSpent >= limit.monthlyLimit && catPrev < limit.monthlyLimit) {
                const catName = getAllCategories().find(c => c.id === entry.category)?.name ?? entry.category;
                notify({
                    type: 'budget_exceeded', category: 'alert', icon: '🚨', isActionable: true, actionRoute: '/expenses',
                    title: `${catName} budget crossed`,
                    body: `${catName} spending is ${fmtINR(catSpent)} — past its ${fmtINR(limit.monthlyLimit)} limit for ${monthStr}.`,
                    metadata: { month: monthStr, overage: catSpent - limit.monthlyLimit, total: catSpent, calcId: `cat-${entry.category}-${monthStr}` },
                });
            }
        }
    } catch {
        // Alerts are best-effort — never let them break the save flow.
    }
};
