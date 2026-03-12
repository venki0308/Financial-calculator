import { BudgetEntry, FixedExpenses, CategoryBudgets, Subscription, Insight, EXPENSE_CATEGORIES } from '../store/useBudgetTrackerStore';

export function generateInsights(
 entries: BudgetEntry[],
 monthlyIncome: number,
 fixedExpenses: FixedExpenses,
 categoryBudgets: CategoryBudgets,
 currentMonthNum: number, // 1-12
 currentYear: number,
 subscriptions: Subscription[]
): Insight[] {
 const insights: Insight[] = [];
 const nowStr = new Date().toISOString();

 if (monthlyIncome <= 0) return insights;

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
 const savingsRate = (savings / monthlyIncome) * 100;

 const categoryTotals = currentEntries.reduce((acc, e) => {
 acc[e.categoryId] = (acc[e.categoryId] || 0) + e.amount;
 return acc;
 }, {} as Record<string, number>);

 // 1. Savings Rate Analysis
 if (savingsRate < 10) {
 insights.push({
 id: `sav-alert-${currentMonthNum}-${currentYear}`,
 type: 'alert',
 title: 'Savings Critical',
 message: `Your savings rate is very low (${savingsRate.toFixed(1)}%). Review your fixed expenses to free up cash.`,
 dismissed: false,
 generatedAt: nowStr
 });
 } else if (savingsRate > 25) {
 let msg = `Excellent! You've saved ${savingsRate.toFixed(1)}% this month. `;
 if (savings > 5000) {
 msg += `Consider investing ₹${Math.floor(savings * 0.5)} in an SIP.`;
 }
 insights.push({
 id: `sav-succ-${currentMonthNum}-${currentYear}`,
 type: 'success',
 title: 'Great Savings!',
 message: msg,
 dismissed: false,
 generatedAt: nowStr
 });
 }

 // 2. Budget Overspending (check top keys in CategoryBudgets vs totals)
 const budgetMap = categoryBudgets as unknown as Record<string, number>;
 Object.entries(budgetMap).forEach(([catId, limit]) => {
 const spent = categoryTotals[catId] || 0;
 if (limit > 0 && spent > limit * 1.2) {
 const catName = EXPENSE_CATEGORIES.find(c => c.id === catId)?.name || catId;
 insights.push({
 id: `cat-warn-${catId}-${currentMonthNum}-${currentYear}`,
 type: 'warning',
 title: `${catName} Over budget`,
 message: `You've spent ₹${spent} on ${catName}, which is >120% of your target (₹${limit}).`,
 dismissed: false,
 generatedAt: nowStr
 });
 }
 });

 // 3. Month over Month Spike
 const lastMonth = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
 const lastMonthYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;
 const lastEntries = entries.filter(e => {
 const d = new Date(e.date);
 return d.getMonth() + 1 === lastMonth && d.getFullYear() === lastMonthYear;
 });
 const lastCategoryTotals = lastEntries.reduce((acc, e) => {
 acc[e.categoryId] = (acc[e.categoryId] || 0) + e.amount;
 return acc;
 }, {} as Record<string, number>);

 const spikeCandidate = Object.keys(categoryTotals).find(catId => {
 const current = categoryTotals[catId];
 const last = lastCategoryTotals[catId];
 if (!last || last < 1000) return false;
 return current > last * 1.3;
 });

 if (spikeCandidate) {
 const catName = EXPENSE_CATEGORIES.find(c => c.id === spikeCandidate)?.name || spikeCandidate;
 insights.push({
 id: `spike-tip-${spikeCandidate}-${currentMonthNum}-${currentYear}`,
 type: 'tip',
 title: 'Spending Spike',
 message: `Your ${catName} spending is up by > 30% compared to last month.`,
 dismissed: false,
 generatedAt: nowStr
 });
 }

 // 4. Subscriptions
 const activeSubs = subscriptions.filter(s => s.isActive);
 const subMonthlyTotal = activeSubs.reduce((sum, s) => sum + Math.round(s.billingCycle === 'monthly' ? s.amount : s.amount / 12), 0);
 if (activeSubs.length > 0 && monthlyIncome > 0) {
 const pct = ((subMonthlyTotal / monthlyIncome) * 100).toFixed(1);
 if (subMonthlyTotal > monthlyIncome * 0.05) {
 insights.push({
 id: `subs-tip-${currentMonthNum}-${currentYear}`,
 type: 'tip',
 title: 'High Subscription Costs',
 message: `You have ${activeSubs.length} active subscriptions costing ₹${subMonthlyTotal.toLocaleString('en-IN')}/mo (${pct}% of income). Review them to save money.`,
 actionLabel: 'View Subs',
 actionRoute: 'subs',
 dismissed: false,
 generatedAt: nowStr
 });
 }
 }

 return insights;
}
