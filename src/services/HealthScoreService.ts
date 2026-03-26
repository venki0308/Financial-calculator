import { BudgetEntry, CategoryBudgets, FixedExpenses, HealthScore, NetWorthEntry } from '../store/useBudgetTrackerStore';

function calcFixedTotal(fixedExpenses: FixedExpenses): number {
    return Object.values(fixedExpenses).reduce((a, b) => {
        if (typeof b === 'number') return a + b;
        if (Array.isArray(b)) return a + b.reduce((s: number, o: { amount: number }) => s + o.amount, 0);
        return a;
    }, 0);
}

export function calculateHealthScore(
    entries: BudgetEntry[],
    monthlyIncome: number,
    fixedExpenses: FixedExpenses,
    categoryBudgets: CategoryBudgets,
    currentMonthNum: number,
    currentYear: number,
    netWorthHistory: NetWorthEntry[],
    savingsGoal?: number,
    monthlyBalances?: Record<string, { manual?: number; auto?: number }>
): HealthScore {
    const nowStr = new Date().toISOString();

    if (monthlyIncome <= 0) {
        return {
            total: 0,
            savingsScore: 0,
            adherenceScore: 0,
            consistencyScore: 0,
            tips: ['Set up your monthly income to get a Financial Health Score.'],
            calculatedAt: nowStr,
        };
    }

    const currentMonthKey = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
    const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
    const prevMonthYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;
    const prevMonthKey = `${prevMonthYear}-${String(prevMonthNum).padStart(2, '0')}`;

    const currentEntries = entries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === currentMonthNum && d.getFullYear() === currentYear;
    });

    const prevEntries = entries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === prevMonthNum && d.getFullYear() === prevMonthYear;
    });

    const hasCurrentData = currentEntries.length > 0 || (monthlyBalances?.[currentMonthKey]?.manual ?? 0) > 0;
    const hasPrevData = prevEntries.length > 0 || (monthlyBalances?.[prevMonthKey]?.manual ?? 0) > 0;

    if (!hasCurrentData) {
        return {
            total: -1,
            savingsScore: 0, adherenceScore: 0, consistencyScore: 0,
            tips: ['No data for this month', 'Add income or expenses to see insights'],
            calculatedAt: nowStr,
        };
    }

    if (!hasPrevData) {
        return {
            total: -2,
            savingsScore: 0, adherenceScore: 0, consistencyScore: 0,
            tips: ['Track at least 2 consecutive months to unlock Financial Health insights'],
            calculatedAt: nowStr,
        };
    }

    const fixedTotal = calcFixedTotal(fixedExpenses);
    const emiAmount = typeof fixedExpenses.emi === 'number' ? fixedExpenses.emi : 0;

    const totalSpent = currentEntries.reduce((sum, e) => sum + e.amount, 0);
    const savings = monthlyIncome - (fixedTotal + totalSpent);
    const savingsRate = savings / monthlyIncome;

    // ── Score 1: Savings Rate (0–40 pts) ─────────────────────────────────────
    // 40 pts for 30%+ savings, scales linearly
    let savingsScore = Math.min(40, Math.max(0, savingsRate * 133));

    // ── Score 2: Budget Adherence (0–30 pts) ──────────────────────────────────
    let adherenceScore = 25; // base if no budgets set
    const budgetMap = categoryBudgets as unknown as Record<string, number>;
    const budgetKeys = Object.entries(budgetMap).filter(([, v]) => v > 0);

    if (budgetKeys.length > 0) {
        const categoryTotals = currentEntries.reduce((acc, e) => {
            const cat = e.category || e.categoryId || 'others';
            acc[cat] = (acc[cat] || 0) + e.amount;
            return acc;
        }, {} as Record<string, number>);

        let withinBudget = 0;
        budgetKeys.forEach(([catId, limit]) => {
            const spent = categoryTotals[catId] || 0;
            if (spent <= limit) withinBudget++;
        });
        adherenceScore = (withinBudget / budgetKeys.length) * 30;
    }

    // ── Score 3: Spending Consistency (0–20 pts) ──────────────────────────────
    const lastMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
    const lastMonthYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;
    const lastMonthEntries = entries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === lastMonth && d.getFullYear() === lastMonthYear;
    });

    let consistencyScore = 10;
    if (lastMonthEntries.length > 0) {
        const lastTotal = lastMonthEntries.reduce((sum, e) => sum + e.amount, 0);
        if (lastTotal > 0) {
            const variance = Math.abs(totalSpent - lastTotal) / lastTotal;
            if (variance <= 0.10) consistencyScore = 20;
            else if (variance <= 0.20) consistencyScore = 15;
            else if (variance <= 0.35) consistencyScore = 8;
            else consistencyScore = 0;
        }
    }

    // ── Score 4: EMI Health (0–10 pts) ────────────────────────────────────────
    let emiScore = 10; // Perfect if no EMI
    if (emiAmount > 0) {
        const emiPct = emiAmount / monthlyIncome;
        if (emiPct <= 0.25) emiScore = 10;
        else if (emiPct <= 0.35) emiScore = 6;
        else if (emiPct <= 0.50) emiScore = 3;
        else emiScore = 0;
    }

    const total = Math.min(100, Math.round(savingsScore + adherenceScore + consistencyScore + emiScore));

    // ── Future Projection ─────────────────────────────────────────────────────
    // Auto-calculated (Option B): cumulative savings from all months with data
    const monthsWithData = new Set(entries.map(e => {
        const d = new Date(e.date);
        return `${d.getFullYear()}-${d.getMonth() + 1}`;
    }));

    let totalAutoSavings = 0;
    monthsWithData.forEach(key => {
        const [y, m] = key.split('-').map(Number);
        const monthEntries = entries.filter(e => {
            const d = new Date(e.date);
            return d.getFullYear() === y && d.getMonth() + 1 === m;
        });
        const monthSpent = monthEntries.reduce((s, e) => s + e.amount, 0);
        totalAutoSavings += monthlyIncome - fixedTotal - monthSpent;
    });

    // 12-month forward projection
    const monthlySavings = savings; // current month's savings rate applied forward
    const annualSavings = Math.max(0, monthlySavings * 12);

    // Months to reach goal
    let monthsToGoal: number | null = null;
    if (savingsGoal && savingsGoal > 0 && monthlySavings > 0) {
        monthsToGoal = Math.ceil(savingsGoal / monthlySavings);
    }

    // ── Build Tips ────────────────────────────────────────────────────────────
    const tips: string[] = [];
    const scoreLabel = total >= 80 ? 'Great' : total >= 60 ? 'Good' : total >= 40 ? 'Fair' : 'Poor';
    tips.push(`Financial Health: ${total}/100 (${scoreLabel})`);

    if (savingsScore < 20) {
        tips.push('Increase savings rate to 20%+ by reducing variable expenses.');
    } else {
        tips.push(`Savings rate: ${(savingsRate * 100).toFixed(0)}% — keep building your emergency fund.`);
    }

    if (adherenceScore < 15 && budgetKeys.length > 0) {
        tips.push('You overspent in several budgeted categories. Track daily to stay on target.');
    } else if (budgetKeys.length > 0) {
        tips.push('Excellent budget adherence this month. Keep it consistent!');
    }

    if (emiScore < 6) {
        tips.push(`EMI is ${((emiAmount / monthlyIncome) * 100).toFixed(0)}% of income — risky. Consider prepaying to reduce debt load.`);
    }

    if (consistencyScore < 8) {
        tips.push('Spending varies heavily month-to-month. Try setting category limits in Budget tab.');
    }

    return {
        total,
        savingsScore: Math.round(savingsScore),
        adherenceScore: Math.round(adherenceScore),
        consistencyScore: Math.round(consistencyScore),
        tips,
        calculatedAt: nowStr,
        futureProjection: {
            annualSavings,
            monthsToGoal,
            autoCalculatedSavings: Math.max(0, totalAutoSavings),
        },
    };
}
