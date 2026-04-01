import { useNotificationStore, NotificationCategory, AppNotification } from '../store/useNotificationStore';

export type CalcNotifData =
    | { type: 'emi_saved'; metadata: { calcId: string; loanName: string; loanType: string; principal: number; rate: number; tenureYears: number; emi: number } }
    | { type: 'tax_reminder'; metadata: { monthYear: string } }
    | { type: 'budget_alert_80'; metadata: { monthYear: string; spent: number; budget: number; remaining: number } }
    | { type: 'budget_exceeded'; metadata: { month: string; overage: number; total: number } }
    | { type: 'goal_achieved'; metadata: { goalName: string; target: number } }
    | { type: 'goal_milestone'; metadata: { goalName: string; milestonePercent: number; saved: number; target: number } }
    | { type: 'sip_due'; metadata: { fundName: string; amount: number; isTomorrow: boolean } }
    | { type: 'fd_maturity'; metadata: { amount: number; rate: number; date: string } }
    | { type: 'od_saved'; metadata: { calcId: string; utilized: number; limit: number; rate: number; daily: number } }
    | { type: 'daily_quote'; metadata: { quote: string } }
    | { type: 'ppf_reminder'; metadata: {} }
    | { type: 'tax_opportunity'; metadata: { remaining80c: number } }
    // generic backward compatible
    | { type: 'general'; metadata: { calcId: string; summary: string; route: string; title: string; icon: string } };

function formatINR(amount: number): string {
    return amount.toLocaleString('en-IN');
}

export function triggerCalcNotification(data: CalcNotifData) {
    const store = useNotificationStore.getState();

    let title = '';
    let body = '';
    let icon = '🔔';
    let category: NotificationCategory = 'calculator';
    let actionRoute = '';
    let actionLabel = '';

    switch (data.type) {
        case 'emi_saved':
            title = `Loan Saved — ${data.metadata.loanName}`;
            body = `${data.metadata.loanType} of ₹${formatINR(data.metadata.principal)} @ ${data.metadata.rate}% for ${data.metadata.tenureYears} years | EMI: ₹${formatINR(data.metadata.emi)}/month`;
            icon = '🏦';
            category = 'calculator';
            actionRoute = '/calculator/loan-emi';
            actionLabel = 'View Calculation';
            break;
        case 'tax_reminder':
            title = `Tax Filing Season — ${data.metadata.monthYear}`;
            body = `FY 2026-27 ends March 31. Check your tax liability and complete Sec 80C / 123 investments.`;
            icon = '📋';
            category = 'reminder';
            actionRoute = '/calculator/income-tax';
            actionLabel = 'Open Tax Calculator';
            break;
        case 'budget_alert_80':
            title = `Budget Alert — ${data.metadata.monthYear}`;
            body = `You've used ₹${formatINR(data.metadata.spent)} of your ₹${formatINR(data.metadata.budget)} ${data.metadata.monthYear} budget. ₹${formatINR(data.metadata.remaining)} remaining.`;
            icon = '⚠️';
            category = 'alert';
            actionRoute = '/expenses';
            actionLabel = 'View Expenses';
            break;
        case 'budget_exceeded':
            title = `Budget Exceeded — ${data.metadata.month}`;
            body = `You've exceeded your ${data.metadata.month} budget by ₹${formatINR(data.metadata.overage)}. Total spent: ₹${formatINR(data.metadata.total)}.`;
            icon = '🚨';
            category = 'alert';
            actionRoute = '/expenses';
            actionLabel = 'View Expenses';
            break;
        case 'goal_achieved':
            title = `Goal Reached! 🎉 ${data.metadata.goalName}`;
            body = `Congratulations! You've successfully reached your goal: ${data.metadata.goalName} — ₹${formatINR(data.metadata.target)}`;
            icon = '🎯';
            category = 'insight';
            actionRoute = '/goal-planner';
            actionLabel = 'View Goals';
            break;
        case 'goal_milestone':
            title = `${data.metadata.goalName} — ${data.metadata.milestonePercent}% Complete!`;
            body = `You're halfway to ${data.metadata.goalName}. ₹${formatINR(data.metadata.saved)} saved of ₹${formatINR(data.metadata.target)} target. Keep going!`;
            icon = '🏆';
            category = 'insight';
            actionRoute = '/goal-planner';
            actionLabel = 'View Goals';
            break;
        case 'sip_due':
            title = `SIP Due — ${data.metadata.fundName}`;
            body = `Your monthly SIP of ₹${formatINR(data.metadata.amount)} is due ${data.metadata.isTomorrow ? 'tomorrow' : 'today'}. Ensure funds are available.`;
            icon = '📈';
            category = 'reminder';
            actionRoute = '/calculator/sip';
            actionLabel = 'Open SIP Calculator';
            break;
        case 'fd_maturity':
            title = `FD Matures in 7 Days`;
            body = `Your FD of ₹${formatINR(data.metadata.amount)} @ ${data.metadata.rate}% matures on ${data.metadata.date}. Plan your reinvestment.`;
            icon = '🏛️';
            category = 'reminder';
            actionRoute = '/calculator/fd';
            actionLabel = 'Open FD Calculator';
            break;
        case 'od_saved':
            title = `OD Calculation Saved`;
            body = `OD of ₹${formatINR(data.metadata.utilized)} against ₹${formatINR(data.metadata.limit)} limit @ ${data.metadata.rate}% | Daily cost: ₹${data.metadata.daily}/day`;
            icon = '💳';
            category = 'calculator';
            actionRoute = '/calculator/overdraft';
            actionLabel = 'View OD Calculation';
            break;
        case 'daily_quote':
            title = `FinCalix Daily Insight 💡`;
            body = data.metadata.quote;
            icon = '💡';
            category = 'insight';
            actionRoute = ''; // Cannot be actionable
            actionLabel = '';
            break;
        case 'ppf_reminder':
            title = `PPF Contribution Due`;
            body = `Invest in PPF before March 31 to claim Sec 80C / Sec 123 deduction. Maximum: ₹1,50,000/year.`;
            icon = '🛡️';
            category = 'reminder';
            actionRoute = '/calculator/ppf-advanced';
            actionLabel = 'Open PPF Calculator';
            break;
        case 'tax_opportunity':
            title = `Tax Saving Opportunity`;
            body = `You have ₹${formatINR(data.metadata.remaining80c)} left in Sec 80C / 123 limit. Invest in ELSS, PPF, or insurance before March 31.`;
            icon = '💰';
            category = 'insight';
            actionRoute = '/calculator/income-tax';
            actionLabel = 'Open Tax Calculator';
            break;
        case 'general':
            title = data.metadata.title || `Calculation Complete`;
            body = data.metadata.summary;
            icon = data.metadata.icon || '✅';
            category = 'calculator';
            actionRoute = data.metadata.route || '/';
            actionLabel = 'View Calculation';
            break;
    }

    store.addNotification({
        type: data.type,
        category,
        title,
        body,
        icon,
        isActionable: !!actionRoute,
        actionRoute: actionRoute || undefined,
        actionLabel: actionLabel || undefined,
        metadata: data.metadata,
    });
}
