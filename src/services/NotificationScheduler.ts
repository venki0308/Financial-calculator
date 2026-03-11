/**
 * FinCalix Notification Scheduler
 * Evaluates user financial data daily and triggers smart notifications.
 */

import { useNotificationStore, AppNotification } from '../store/useNotificationStore';

const LAST_RUN_KEY = 'fincalix_scheduler_last_run';
const MIN_INTERVAL_MS = 23 * 60 * 60 * 1000; // 23 hours

function addNotif(n: Omit<AppNotification, 'id' | 'createdAt'>) {
    useNotificationStore.getState().addNotification(n);
}

function shouldRun(): boolean {
    const last = localStorage.getItem(LAST_RUN_KEY);
    if (!last) return true;
    return Date.now() - parseInt(last) > MIN_INTERVAL_MS;
}

function checkEMIReminders() {
    const today = new Date();
    const dayOfMonth = today.getDate();
    // EMI reminders on 1st, 5th, and 15th
    if ([1, 5, 15].includes(dayOfMonth)) {
        addNotif({
            type: 'emi_reminder',
            title: '💳 EMI Reminder',
            body: 'Your EMI may be due this month. Check your loan schedule and ensure funds are ready.',
            icon: '💳',
            route: '/calculator/loan-emi',
        });
    }
}

function checkSIPReminders() {
    const today = new Date();
    const dayOfMonth = today.getDate();
    // SIP reminder on 1st week
    if (dayOfMonth <= 7) {
        addNotif({
            type: 'sip_reminder',
            title: '📈 SIP Investment Due',
            body: 'Your monthly SIP may be due. Ensure your bank account has sufficient balance for auto-debit.',
            icon: '📈',
            route: '/calculator/sip',
        });
    }
}

function checkTaxAlerts() {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-12

    // Advance tax deadlines
    if (month === 3) {
        addNotif({
            type: 'tax_alert',
            title: '⚠️ Tax Year Ending',
            body: 'Financial year ends March 31. Ensure your tax-saving investments (PPF, ELSS) are complete.',
            icon: '⚠️',
            route: '/calculator/income-tax',
        });
    } else if (month === 9) {
        addNotif({
            type: 'tax_alert',
            title: '📋 Advance Tax (Sep)',
            body: '2nd installment of advance tax is due by September 15. Use our Income Tax calculator to estimate.',
            icon: '📋',
            route: '/calculator/income-tax',
        });
    } else if (month === 12) {
        addNotif({
            type: 'tax_alert',
            title: '📋 Advance Tax (Dec)',
            body: '3rd installment of advance tax is due by December 15. Check your liability now.',
            icon: '📋',
            route: '/calculator/income-tax',
        });
    } else if (month === 7) {
        addNotif({
            type: 'tax_alert',
            title: '📁 ITR Filing Reminder',
            body: 'Income Tax Return (ITR) deadline is typically July 31. File early to avoid penalties.',
            icon: '📁',
            route: '/calculator/income-tax',
        });
    }
}

function checkSavingsInsight() {
    const savedCalcs = localStorage.getItem('fincalix-calculator-store');
    if (!savedCalcs) return;

    addNotif({
        type: 'savings_insight',
        title: '💡 Savings Tip',
        body: 'Did you know? Investing ₹5,000/month in SIP at 12% for 10 years can grow to ₹11.6 Lakhs!',
        icon: '💡',
        route: '/calculator/sip',
    });
}

/** DEV MODE: Simulate all notification types for testing */
export function simulateAllNotifications() {
    addNotif({
        type: 'emi_reminder',
        title: '💳 [TEST] EMI Reminder',
        body: 'Test: Your home loan EMI of ₹24,500 is due on the 5th.',
        icon: '💳',
        route: '/calculator/loan-emi',
    });
    addNotif({
        type: 'sip_reminder',
        title: '📈 [TEST] SIP Due This Week',
        body: 'Test: Your SIP auto-debit of ₹10,000 is scheduled for the 1st.',
        icon: '📈',
        route: '/calculator/sip',
    });
    addNotif({
        type: 'tax_alert',
        title: '⚠️ [TEST] Tax Alert',
        body: 'Test: Financial year ends in 30 days. Complete your 80C investments.',
        icon: '⚠️',
        route: '/calculator/income-tax',
    });
    addNotif({
        type: 'savings_insight',
        title: '💡 [TEST] Savings Insight',
        body: 'Test: Your savings rate is 30% this month — excellent! Consider increasing your SIP.',
        icon: '💡',
        route: '/calculator/sip',
    });
    addNotif({
        type: 'bill_payment',
        title: '🧾 [TEST] Bill Reminder',
        body: 'Test: Your electricity bill is due in 3 days.',
        icon: '🧾',
        route: '/expenses',
    });
}

export const NotificationScheduler = {
    initialize() {
        if (!shouldRun()) return;
        localStorage.setItem(LAST_RUN_KEY, Date.now().toString());
        
        // Run all checks
        checkEMIReminders();
        checkSIPReminders();
        checkTaxAlerts();
        checkSavingsInsight();
    },
};
