import { BudgetEntry, FixedExpenses, CategoryBudgets, Subscription, Insight, EXPENSE_CATEGORIES } from '../store/useBudgetTrackerStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonthEntries(entries: BudgetEntry[], monthNum: number, year: number) {
    return entries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === monthNum && d.getFullYear() === year;
    });
}

function getCategoryTotals(entries: BudgetEntry[]): Record<string, number> {
    return entries.reduce((acc, e) => {
        const cat = e.category || e.categoryId || 'others';
        acc[cat] = (acc[cat] || 0) + e.amount;
        return acc;
    }, {} as Record<string, number>);
}

function calcFixedTotal(fixedExpenses: FixedExpenses): number {
    return Object.values(fixedExpenses).reduce((a, b) => {
        if (typeof b === 'number') return a + b;
        if (Array.isArray(b)) return a + b.reduce((s, o) => s + o.amount, 0);
        return a;
    }, 0);
}

// ─── Main Insight Generator ───────────────────────────────────────────────────

export function generateInsights(
    entries: BudgetEntry[],
    monthlyIncome: number,
    fixedExpenses: FixedExpenses,
    categoryBudgets: CategoryBudgets,
    currentMonthNum: number,
    currentYear: number,
    subscriptions: Subscription[]
): Insight[] {
    const insights: Insight[] = [];
    const nowStr = new Date().toISOString();

    if (monthlyIncome <= 0) return insights;

    const fixedTotal = calcFixedTotal(fixedExpenses);
    const currentEntries = getMonthEntries(entries, currentMonthNum, currentYear);
    const totalSpent = currentEntries.reduce((sum, e) => sum + e.amount, 0);
    const savings = monthlyIncome - (fixedTotal + totalSpent);
    const savingsRate = (savings / monthlyIncome) * 100;

    const categoryTotals = getCategoryTotals(currentEntries);

    // ── 1. Savings Rate Analysis ─────────────────────────────────────────────
    if (savingsRate < 0) {
        insights.push({
            id: `sav-danger-${currentMonthNum}-${currentYear}`,
            type: 'alert',
            title: '⚠️ Overspending This Month',
            message: `You've spent ₹${Math.abs(savings).toLocaleString('en-IN')} MORE than your income. Take immediate action to cut expenses.`,
            dismissed: false,
            generatedAt: nowStr
        });
    } else if (savingsRate < 10) {
        insights.push({
            id: `sav-alert-${currentMonthNum}-${currentYear}`,
            type: 'alert',
            title: '🚨 Savings Critical',
            message: `You are saving only ${savingsRate.toFixed(1)}% of income. Recommended minimum is 20%. Review fixed and variable expenses urgently.`,
            dismissed: false,
            generatedAt: nowStr
        });
    } else if (savingsRate < 20) {
        insights.push({
            id: `sav-warn-${currentMonthNum}-${currentYear}`,
            type: 'warning',
            title: '💡 Low Savings Rate',
            message: `You are saving ${savingsRate.toFixed(1)}%. Recommended: 30%+. Small cuts in Food or Shopping can unlock more savings.`,
            dismissed: false,
            generatedAt: nowStr
        });
    } else if (savingsRate > 30) {
        const investAmount = Math.floor(savings * 0.6);
        insights.push({
            id: `sav-succ-${currentMonthNum}-${currentYear}`,
            type: 'success',
            title: '🎉 Excellent Savings!',
            message: `You've saved ${savingsRate.toFixed(1)}% this month — above the 30% benchmark! Consider investing ₹${investAmount.toLocaleString('en-IN')} in a SIP or FD.`,
            dismissed: false,
            generatedAt: nowStr
        });
    }

    // ── 2. EMI Risk Check ────────────────────────────────────────────────────
    const emiAmount = typeof fixedExpenses.emi === 'number' ? fixedExpenses.emi : 0;
    if (emiAmount > 0) {
        const emiPct = (emiAmount / monthlyIncome) * 100;
        if (emiPct > 50) {
            insights.push({
                id: `emi-danger-${currentMonthNum}-${currentYear}`,
                type: 'alert',
                title: '🚨 EMI Danger Zone',
                message: `Your EMI is consuming ${emiPct.toFixed(0)}% of income. This is a critical risk. Consider prepaying or refinancing immediately.`,
                dismissed: false,
                generatedAt: nowStr
            });
        } else if (emiPct > 35) {
            insights.push({
                id: `emi-warn-${currentMonthNum}-${currentYear}`,
                type: 'warning',
                title: '⚠️ High EMI Burden',
                message: `Your EMI is consuming ${emiPct.toFixed(0)}% of income — risky level. The recommended safe limit is below 30%.`,
                dismissed: false,
                generatedAt: nowStr
            });
        }
    }

    // ── 3. Category Budget Alerts (80% warning, 100% alert) ──────────────────
    const budgetMap = categoryBudgets as unknown as Record<string, number>;
    Object.entries(budgetMap).forEach(([catId, limit]) => {
        const spent = categoryTotals[catId] || 0;
        if (limit <= 0) return;
        const catName = EXPENSE_CATEGORIES.find(c => c.id === catId)?.name || catId;
        const catIcon = EXPENSE_CATEGORIES.find(c => c.id === catId)?.icon || '📌';
        const pct = (spent / limit) * 100;

        if (pct >= 120) {
            insights.push({
                id: `cat-danger-${catId}-${currentMonthNum}-${currentYear}`,
                type: 'alert',
                title: `${catIcon} ${catName} Over Budget`,
                message: `You've exceeded your ${catName} budget by ₹${(spent - limit).toLocaleString('en-IN')} (${pct.toFixed(0)}% used). Limit was ₹${limit.toLocaleString('en-IN')}.`,
                dismissed: false,
                generatedAt: nowStr
            });
        } else if (pct >= 100) {
            insights.push({
                id: `cat-warn-${catId}-${currentMonthNum}-${currentYear}`,
                type: 'warning',
                title: `${catIcon} ${catName} Budget Reached`,
                message: `Your ${catName} budget of ₹${limit.toLocaleString('en-IN')} is fully used this month.`,
                dismissed: false,
                generatedAt: nowStr
            });
        } else if (pct >= 80) {
            insights.push({
                id: `cat-near-${catId}-${currentMonthNum}-${currentYear}`,
                type: 'tip',
                title: `${catIcon} ${catName} Near Limit`,
                message: `${catName} is at ${pct.toFixed(0)}% of budget (₹${spent.toLocaleString('en-IN')} of ₹${limit.toLocaleString('en-IN')}). Only ₹${(limit - spent).toLocaleString('en-IN')} remaining.`,
                dismissed: false,
                generatedAt: nowStr
            });
        }
    });

    // ── 4. Month-Over-Month Category Spike ───────────────────────────────────
    const lastMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
    const lastMonthYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;
    const lastEntries = getMonthEntries(entries, lastMonth, lastMonthYear);
    const lastCategoryTotals = getCategoryTotals(lastEntries);

    Object.keys(categoryTotals).forEach(catId => {
        const current = categoryTotals[catId];
        const last = lastCategoryTotals[catId] || 0;
        if (last < 500) return; // Not enough baseline
        const changePct = ((current - last) / last) * 100;
        if (changePct > 40) {
            const catName = EXPENSE_CATEGORIES.find(c => c.id === catId)?.name || catId;
            const catIcon = EXPENSE_CATEGORIES.find(c => c.id === catId)?.icon || '📌';
            insights.push({
                id: `spike-${catId}-${currentMonthNum}-${currentYear}`,
                type: 'tip',
                title: `${catIcon} ${catName} Spike Detected`,
                message: `Your ${catName} spending is ${changePct.toFixed(0)}% higher than last month (₹${last.toLocaleString('en-IN')} → ₹${current.toLocaleString('en-IN')}).`,
                dismissed: false,
                generatedAt: nowStr
            });
        }
    });

    // ── 5. Monthly Threshold Alert ────────────────────────────────────────────
    const today = new Date();
    const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
    const dayOfMonth = (currentMonthNum === today.getMonth() + 1 && currentYear === today.getFullYear()) 
        ? today.getDate() 
        : daysInMonth;
    const daysRemaining = daysInMonth - dayOfMonth;
    const spendPct = monthlyIncome > 0 ? ((fixedTotal + totalSpent) / monthlyIncome) * 100 : 0;

    if (spendPct > 80 && daysRemaining > 7) {
        insights.push({
            id: `monthly-thresh-${currentMonthNum}-${currentYear}`,
            type: 'warning',
            title: '📅 Monthly Budget Warning',
            message: `You've used ${spendPct.toFixed(0)}% of your monthly budget with ${daysRemaining} days remaining. Daily limit: ₹${(savings / daysRemaining).toFixed(0)}.`,
            dismissed: false,
            generatedAt: nowStr
        });
    }

    // ── 6. Daily Overspending Alert ───────────────────────────────────────────
    const todayStr = today.toISOString().split('T')[0];
    const todayEntries = currentEntries.filter(e => e.date.startsWith(todayStr));
    const todaySpent = todayEntries.reduce((s, e) => s + e.amount, 0);
    const avgDailyBudget = monthlyIncome > 0 ? (monthlyIncome - fixedTotal) / daysInMonth : 0;

    if (todaySpent > avgDailyBudget * 1.5 && avgDailyBudget > 0) {
        insights.push({
            id: `daily-over-${todayStr}`,
            type: 'warning',
            title: '📊 Overspending Today',
            message: `Today's spend is ₹${todaySpent.toLocaleString('en-IN')} — ${((todaySpent / avgDailyBudget - 1) * 100).toFixed(0)}% above your daily average of ₹${avgDailyBudget.toFixed(0)}.`,
            dismissed: false,
            generatedAt: nowStr
        });
    }

    // ── 7. Subscription Intelligence ─────────────────────────────────────────
    const activeSubs = subscriptions.filter(s => s.isActive);
    if (activeSubs.length > 0) {
        const subMonthlyTotal = activeSubs.reduce((sum, s) => {
            if (s.billingCycle === 'monthly') return sum + s.amount;
            if (s.billingCycle === 'quarterly') return sum + s.amount / 3;
            return sum + s.amount / 12;
        }, 0);
        const subPct = (subMonthlyTotal / monthlyIncome) * 100;

        // Upcoming renewals in next 7 days
        const renewalsThisWeek = activeSubs.filter(s => {
            const diff = (new Date(s.nextDueDate).getTime() - today.getTime()) / (1000 * 3600 * 24);
            return diff >= 0 && diff <= 7;
        });

        if (subPct > 10) {
            insights.push({
                id: `subs-high-${currentMonthNum}-${currentYear}`,
                type: 'tip',
                title: '💳 High Subscription Cost',
                message: `${activeSubs.length} subscriptions cost ₹${Math.round(subMonthlyTotal).toLocaleString('en-IN')}/mo (${subPct.toFixed(1)}% of income). Review and cancel unused ones.`,
                actionLabel: 'View Subs',
                actionRoute: 'subs',
                dismissed: false,
                generatedAt: nowStr
            });
        }

        if (renewalsThisWeek.length > 0) {
            const total = renewalsThisWeek.reduce((s, sub) => s + sub.amount, 0);
            insights.push({
                id: `sub-renewal-${todayStr}`,
                type: 'warning',
                title: '🔔 Subscriptions Renewing Soon',
                message: `${renewalsThisWeek.length} subscription${renewalsThisWeek.length > 1 ? 's' : ''} renewing this week: ${renewalsThisWeek.map(s => s.name).join(', ')} (₹${total.toLocaleString('en-IN')} total).`,
                actionLabel: 'View Subs',
                actionRoute: 'subs',
                dismissed: false,
                generatedAt: nowStr
            });
        }
    }

    return insights;
}

// ─── Daily Smart Nudges (for DailyTab empty state) ────────────────────────────

export function getDailyNudges(
    entries: BudgetEntry[],
    monthlyIncome: number,
    fixedExpenses: FixedExpenses
): string[] {
    const nudges: string[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const fixedTotal = calcFixedTotal(fixedExpenses);

    const todayEntries = entries.filter(e => e.date.startsWith(todayStr));

    if (todayEntries.length === 0) {
        nudges.push("📝 You haven't logged any expenses today. Stay consistent for accurate insights.");
    }

    // Yesterday's spend vs 7-day average
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const yesterdaySpent = entries
        .filter(e => e.date.startsWith(yesterdayStr))
        .reduce((s, e) => s + e.amount, 0);

    const last7 = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - i - 1);
        return d.toISOString().split('T')[0];
    });
    const avg7daySpend = last7.reduce((sum, dateStr) => {
        return sum + entries.filter(e => e.date.startsWith(dateStr)).reduce((s, e) => s + e.amount, 0);
    }, 0) / 7;

    if (yesterdaySpent > 0 && avg7daySpend > 0 && yesterdaySpent > avg7daySpend * 1.8) {
        nudges.push(`📈 Yesterday's spending (₹${yesterdaySpent.toLocaleString('en-IN')}) was ${((yesterdaySpent / avg7daySpend - 1) * 100).toFixed(0)}% above your 7-day average. Watch your pace today!`);
    } else if (yesterdaySpent > 0 && yesterdaySpent < avg7daySpend * 0.5 && avg7daySpend > 100) {
        nudges.push(`✅ Great discipline yesterday! You spent only ₹${yesterdaySpent.toLocaleString('en-IN')} — well below your average.`);
    }

    // Daily budget remaining
    if (monthlyIncome > 0) {
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const dailyBudget = (monthlyIncome - fixedTotal) / daysInMonth;
        const todaySpent = todayEntries.reduce((s, e) => s + e.amount, 0);
        const remaining = dailyBudget - todaySpent;
        if (remaining > 0 && todayEntries.length > 0) {
            nudges.push(`💰 Daily budget remaining: ₹${remaining.toFixed(0)} of ₹${dailyBudget.toFixed(0)}.`);
        }
    }

    return nudges.slice(0, 2);
}

// ─── Report-Level Insights Banner ────────────────────────────────────────────

export function getReportInsights(
    entries: BudgetEntry[],
    currentMonthNum: number,
    currentYear: number,
    monthlyIncome: number,
    fixedTotal: number
): string[] {
    const insights: string[] = [];
    const currentEntries = getMonthEntries(entries, currentMonthNum, currentYear);
    const totalSpent = currentEntries.reduce((s, e) => s + e.amount, 0);

    if (totalSpent === 0) return insights;

    // Top category
    const catTotals = getCategoryTotals(currentEntries);
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
        const [topCatId, topAmt] = sorted[0];
        const topCat = EXPENSE_CATEGORIES.find(c => c.id === topCatId);
        const pct = totalSpent > 0 ? ((topAmt / totalSpent) * 100).toFixed(0) : '0';
        insights.push(`${topCat?.icon || '📌'} ${topCat?.name || topCatId} is your top expense (${pct}% of total spend)`);
    }

    // MoM change
    const lastMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
    const lastMonthYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;
    const lastEntries = getMonthEntries(entries, lastMonth, lastMonthYear);
    const lastTotal = lastEntries.reduce((s, e) => s + e.amount, 0);

    if (lastTotal > 0 && totalSpent > 0) {
        const changePct = ((totalSpent - lastTotal) / lastTotal) * 100;
        if (changePct > 0) {
            insights.push(`📈 Spending increased ${changePct.toFixed(0)}% vs last month (₹${lastTotal.toLocaleString('en-IN')} → ₹${totalSpent.toLocaleString('en-IN')})`);
        } else {
            insights.push(`📉 Spending decreased ${Math.abs(changePct).toFixed(0)}% vs last month — great control!`);
        }
    }

    // Savings rate narrative
    if (monthlyIncome > 0) {
        const savings = monthlyIncome - fixedTotal - totalSpent;
        const rate = (savings / monthlyIncome) * 100;
        if (rate >= 20) {
            insights.push(`💚 Savings rate: ${rate.toFixed(0)}% — on track with financial goals`);
        } else if (rate > 0) {
            insights.push(`⚠️ Savings rate: ${rate.toFixed(0)}% — below the recommended 20% threshold`);
        } else {
            insights.push(`🔴 Overspending this month — expenses exceed income`);
        }
    }

    return insights.slice(0, 3);
}
