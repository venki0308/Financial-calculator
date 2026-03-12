import { BudgetEntry, CategoryBudgets, FixedExpenses, HealthScore, NetWorthEntry } from '../store/useBudgetTrackerStore';

export function calculateHealthScore(
    entries: BudgetEntry[],
    monthlyIncome: number,
    fixedExpenses: FixedExpenses,
    categoryBudgets: CategoryBudgets,
    currentMonthNum: number, // 1-12
    currentYear: number,
    netWorthHistory: NetWorthEntry[] // Optional for future trend logic
): HealthScore {
    const nowStr = new Date().toISOString();
    
    if (monthlyIncome <= 0) {
        return {
            total: 0,
            savingsScore: 0,
            adherenceScore: 0,
            consistencyScore: 0,
            tips: ["Set up your monthly income to get a Financial Health Score."],
            calculatedAt: nowStr
        };
    }

    const fixedTotal = Object.values(fixedExpenses).reduce((a, b) => {
        if (typeof b === 'number') return a + b;
        if (Array.isArray(b)) return a + b.reduce((s, o) => s + o.amount, 0);
        return a;
    }, 0);

    const currentEntries = entries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === currentMonthNum && d.getFullYear() === currentYear;
    });

    const totalSpent = currentEntries.reduce((sum, e) => sum + e.amount, 0);
    const savings = monthlyIncome - (fixedTotal + totalSpent);
    const savingsRate = (savings / monthlyIncome);
    
    let savingsScore = savingsRate * 200;
    if (savingsScore > 40) savingsScore = 40;
    if (savingsScore < 0) savingsScore = 0;

    let adherenceScore = 35; 
    const budgetMap = categoryBudgets as unknown as Record<string, number>;
    if (Object.keys(budgetMap).length > 0) {
        const categoryTotals = currentEntries.reduce((acc, e) => {
            acc[e.categoryId] = (acc[e.categoryId] || 0) + e.amount;
            return acc;
        }, {} as Record<string, number>);

        let totalTracked = 0;
        let withinBudget = 0;

        Object.entries(budgetMap).forEach(([catId, limit]) => {
            if (limit > 0) {
                totalTracked++;
                const spent = categoryTotals[catId] || 0;
                if (spent <= limit) {
                    withinBudget++;
                }
            }
        });

        if (totalTracked > 0) {
            adherenceScore = (withinBudget / totalTracked) * 35;
        }
    }

    const lastMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
    const lastMonthYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;
    const lastMonthEntries = entries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === lastMonth && d.getFullYear() === lastMonthYear;
    });
    
    let consistencyScore = 15; 
    if (lastMonthEntries.length > 0) {
        const lastTotal = lastMonthEntries.reduce((sum, e) => sum + e.amount, 0);
        if (lastTotal > 0) {
            const variance = Math.abs(totalSpent - lastTotal) / lastTotal;
            if (variance <= 0.15) consistencyScore = 25;
            else if (variance <= 0.30) consistencyScore = 10;
            else consistencyScore = 0;
        }
    }

    const total = Math.round(savingsScore + adherenceScore + consistencyScore);

    const tips: string[] = [];
    if (savingsScore < 20) {
        tips.push(`Increase your savings rate to 20% by cutting variable expenses.`);
    } else {
        tips.push(`Great savings rate! Keep emergency funds topped up.`);
    }

    if (adherenceScore < 20) {
        tips.push(`You overspent in several budgeted categories. Try tracking daily.`);
    } else {
        tips.push(`Excellent budget adherence this month.`);
    }

    if (consistencyScore < 15) {
        tips.push(`Your spending fluctuates heavily month-to-month. Avoid impulsive buys.`);
    }

    return {
        total,
        savingsScore: Math.round(savingsScore),
        adherenceScore: Math.round(adherenceScore),
        consistencyScore: Math.round(consistencyScore),
        tips,
        calculatedAt: nowStr
    };
}
