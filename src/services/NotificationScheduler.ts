/**
 * FinCalix Notification Scheduler
 * Evaluates user financial data daily and triggers smart notifications.
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useNotificationStore } from '../store/useNotificationStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { dailyQuotes } from '../data/quotes';
import { RemoteConfigService } from './remoteConfig.service';
import { APP_VERSION } from '../config/app';
import { getAllCreditCards } from '../utils/creditCardStorage';
import { getDaysUntilDue } from '../utils/creditCardCalculations';
import { useBudgetTrackerStore } from '../store/useBudgetTrackerStore';
import { getAllLoans } from '../utils/loanStorage';

const LAST_RUN_KEY = 'fincalix_scheduler_last_run';
const MIN_INTERVAL_MS = 23 * 60 * 60 * 1000; // 23 hours

function addNotif(n: { type: string, title: string, body: string, icon: string, route?: string }) {
    useNotificationStore.getState().addNotification({
        type: n.type,
        category: n.type.includes('alert') ? 'alert' : n.type.includes('insight') ? 'insight' : 'reminder',
        title: n.title,
        body: n.body,
        icon: n.icon,
        isActionable: !!n.route,
        actionRoute: n.route,
        actionLabel: n.route ? 'Open' : undefined,
        metadata: {}
    });
}

function shouldRun(): boolean {
    const last = localStorage.getItem(LAST_RUN_KEY);
    if (!last) return true;
    return Date.now() - parseInt(last) > MIN_INTERVAL_MS;
}

function checkEMIReminders() {
    if (!useSettingsStore.getState().notifications.calcReminders) return;
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    // Check saved EMI calculations
    const saved = useCalculatorStore.getState().savedCalculations;
    const emiReminders = saved.filter(
        c => c.calculatorType === 'Loan EMI Calculator' && c.inputValues.enableReminder && c.inputValues.reminderDate === dayOfMonth
    );

    if (emiReminders.length > 0) {
        emiReminders.forEach((calc) => {
            const amount = Math.round(calc.resultValues?.emi || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
            addNotif({
                type: 'emi_reminder',
                title: `💳 EMI Due: ${calc.inputValues.name || 'Loan'}`,
                body: `Your EMI of ${amount} is due today. Make sure your account is funded.`,
                icon: '💳',
                route: '/calculator/loan-emi', // Or to saved items
            });
        });
    } else if ([1, 5, 15].includes(dayOfMonth)) {
        // Fallback generic reminder if no custom ones matched today
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
    if (!useSettingsStore.getState().notifications.calcReminders) return;
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
    if (!useSettingsStore.getState().notifications.calcReminders) return;
    const today = new Date();
    const month = today.getMonth() + 1; // 1-12
    const day = today.getDate();

    // Specific Annual Tax Filing Reminder (March 25th)
    if (month === 3 && day === 25) {
        addNotif({
            type: 'tax_alert',
            title: '⚠️ Annual Tax Reminder',
            body: 'Today is March 25th! Ensure your tax-saving investments (PPF, ELSS) are complete before year-end.',
            icon: '⚠️',
            route: '/calculator/income-tax',
        });
    } else if (month === 3 && day === 31) {
        addNotif({
            type: 'tax_alert',
            title: '⚠️ Tax Year Ending Today',
            body: 'Financial year ends today, March 31. Last chance for tax-saving investments.',
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
            body: 'ITR-1 & ITR-2 deadline: July 31. ITR-3 & ITR-4 (business/profession) deadline: August 31. File early to avoid penalties.',
            icon: '📁',
            route: '/calculator/income-tax',
        });
    } else if (month === 8) {
        addNotif({
            type: 'tax_alert',
            title: '📁 ITR-3 & ITR-4 Deadline',
            body: 'Last date to file ITR-3 & ITR-4 (business/profession income) is August 31. Avoid ₹5,000 late filing fee.',
            icon: '📁',
            route: '/calculator/income-tax',
        });
    } else if (month === 4 && day <= 7) {
        addNotif({
            type: 'tax_alert',
            title: '🎯 New Financial Year 2026-27',
            body: 'FY 2026-27 has begun! Key changes: New Income Tax Act 2025 in effect, zero tax up to ₹12L (New Regime), HRA 50% rule now covers 8 cities, NPS employer deduction 14% for all. Update your tax plan now.',
            icon: '🎯',
            route: '/calculator/income-tax',
        });
    }
}

function checkSavingsInsight() {
    if (!useSettingsStore.getState().notifications.priceAlerts) return;
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

async function checkDailyQuote() {
    const settings = useSettingsStore.getState();
    if (!settings.notifications.dailyQuotes) return;

    // Build a type-safe record to avoid indexing issues
    const langMap: Record<string, 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml'> = {
        'English': 'en', 'Hindi': 'hi', 'Telugu': 'te', 'Tamil': 'ta', 'Kannada': 'kn', 'Malayalam': 'ml'
    };
    const langKey = langMap[settings.language] || 'en';

    if (Capacitor.isNativePlatform()) {
        try {
            const hasPerms = await LocalNotifications.checkPermissions();
            if (hasPerms.display === 'granted') {
                const pending = await LocalNotifications.getPending();
                const quoteNotifIds = pending.notifications.filter(n => n.id >= 1000 && n.id < 1100).map(n => ({ id: n.id }));
                if (quoteNotifIds.length > 0) {
                    await LocalNotifications.cancel({ notifications: quoteNotifIds });
                }

                const notifications = [];
                const now = new Date();
                // Schedule next 14 days
                for (let i = 0; i < 14; i++) {
                    const targetDate = new Date(now);
                    targetDate.setDate(now.getDate() + i);
                    targetDate.setHours(8, 0, 0, 0);

                    if (i === 0 && now.getTime() > targetDate.getTime()) {
                        continue;
                    }

                    const dayOfYear = Math.floor((targetDate.getTime() - new Date(targetDate.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
                    const quoteIndex = dayOfYear % dailyQuotes.length;
                    const quote = dailyQuotes[quoteIndex];

                    notifications.push({
                        id: 1000 + quoteIndex,
                        title: '💡 FinCalix Daily Quote',
                        body: String(quote[langKey]),
                        schedule: { at: targetDate }
                    });
                }
                await LocalNotifications.schedule({ notifications });
            }
        } catch (e) {
            console.error('Failed to schedule local notifications', e);
        }
    } else {
        const todayStr = new Date().toDateString();
        const lastQuoteDate = localStorage.getItem('fincalix_last_quote_date');
        const now = new Date();

        if (now.getHours() >= 8 && lastQuoteDate !== todayStr) {
            const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
            const quoteIndex = dayOfYear % dailyQuotes.length;
            const quote = dailyQuotes[quoteIndex];

            addNotif({
                type: 'savings_insight',
                title: '💡 Daily Financial Quote',
                body: String(quote[langKey]),
                icon: '💡',
                route: '/',
            });

            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('💡 FinCalix Daily Quote', {
                    body: String(quote[langKey]),
                    icon: '/icon-192x192.png'
                });
            }
            localStorage.setItem('fincalix_last_quote_date', todayStr);
        }
    }
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
        body: 'Test: Financial year ends in 30 days. Complete your Sec 80C / 123 investments.',
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

function checkCreditCardBills() {
    if (!useSettingsStore.getState().notifications.calcReminders) return;
    try {
        const cards = getAllCreditCards();
        for (const card of cards) {
            if (card.currentBalance <= 0) continue;
            const daysUntil = getDaysUntilDue(card.dueDate);
            const name = card.cardName || card.bankName || 'Credit Card';
            const bal = card.currentBalance.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
            if (daysUntil <= 0) {
                addNotif({
                    type: 'cc_overdue',
                    title: `🔴 ${name} — Payment Overdue`,
                    body: `Outstanding: ${bal}. Pay immediately to avoid late fees and CIBIL impact.`,
                    icon: '🔴',
                    route: '/expenses',
                });
            } else if (daysUntil <= 3) {
                addNotif({
                    type: 'cc_due_urgent',
                    title: `⚠️ ${name} — Due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
                    body: `Outstanding: ${bal}. Pay full statement to avoid interest charges.`,
                    icon: '⚠️',
                    route: '/expenses',
                });
            } else if (daysUntil <= 7) {
                addNotif({
                    type: 'cc_due_soon',
                    title: `💳 ${name} — Due in ${daysUntil} days`,
                    body: `Outstanding: ${bal}. Plan your payment to maintain interest-free period.`,
                    icon: '💳',
                    route: '/expenses',
                });
            }
        }
    } catch { /* storage unavailable */ }
}

function checkSubscriptionRenewals() {
    if (!useSettingsStore.getState().notifications.calcReminders) return;
    try {
        const subs = useBudgetTrackerStore.getState().subscriptions;
        const today = new Date();
        for (const sub of subs) {
            if (!sub.isActive || !sub.nextDueDate) continue;
            const due = new Date(sub.nextDueDate);
            const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000);
            if (diffDays >= 0 && diffDays <= 3) {
                const amt = sub.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
                addNotif({
                    type: 'sub_renewal',
                    title: `🔁 ${sub.name} — Renews ${diffDays === 0 ? 'today' : `in ${diffDays} day${diffDays > 1 ? 's' : ''}`}`,
                    body: `${amt} (${sub.billingCycle}). Review or cancel before renewal.`,
                    icon: '🔁',
                    route: '/expenses',
                });
            }
        }
    } catch { /* store unavailable */ }
}

function checkLoanPayments() {
    if (!useSettingsStore.getState().notifications.calcReminders) return;
    try {
        const loans = getAllLoans().filter(l => l.isActive);
        const dayOfMonth = new Date().getDate();
        for (const loan of loans) {
            const dueDay = loan.emiDueDay || 1;
            const diff = dueDay - dayOfMonth;
            // Notify 3 days before, on due day, and 1 day after
            if (diff >= 0 && diff <= 3) {
                const emi = loan.emiAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
                const name = loan.nickName || loan.loanType || 'Loan';
                addNotif({
                    type: 'loan_payment',
                    title: `🏦 ${name} — EMI ${diff === 0 ? 'due today' : `in ${diff} day${diff > 1 ? 's' : ''}`}`,
                    body: `EMI: ${emi}. Ensure sufficient balance in your repayment account.`,
                    icon: '🏦',
                    route: '/my-loans',
                });
            } else if (diff === -1) {
                const emi = loan.emiAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
                const name = loan.nickName || loan.loanType || 'Loan';
                addNotif({
                    type: 'loan_overdue',
                    title: `🔴 ${name} — EMI was due yesterday`,
                    body: `EMI: ${emi}. Pay immediately to avoid late charges and CIBIL impact.`,
                    icon: '🔴',
                    route: '/my-loans',
                });
            }
        }
    } catch { /* storage unavailable */ }
}

async function checkAppUpdate() {
    if (!useSettingsStore.getState().notifications.appUpdates) return;
    try {
        const config = await RemoteConfigService.getConfig();
        if (!RemoteConfigService.isUpdateAvailable(APP_VERSION, config.latestVersion)) return;
        const LAST_KEY = 'fincalix_last_update_notif_version';
        if (localStorage.getItem(LAST_KEY) === config.latestVersion) return;
        addNotif({
            type: 'app_update',
            title: `🆕 FinCalix v${config.latestVersion} Available`,
            body: config.updateMessage.message || 'A new version of FinCalix is available with new features and improvements. Tap to update now!',
            icon: '🆕',
            route: '/__update',
        });
        localStorage.setItem(LAST_KEY, config.latestVersion);
    } catch {
        // Network unavailable — skip silently
    }
}

function seedInitialNotifications() {
    const SEED_KEY = 'fincalix_scheduler_first_seed';
    if (localStorage.getItem(SEED_KEY)) return;

    const notifs = useNotificationStore.getState().notifications;
    if (notifs.length > 0) {
        localStorage.setItem(SEED_KEY, 'done');
        return;
    }

    // Welcome notification
    addNotif({
        type: 'general',
        title: '🎉 Welcome to FinCalix!',
        body: 'Your personal finance super-app is ready. Explore 43+ calculators, budget tools, government schemes, and more!',
        icon: '🎉',
        route: '/',
    });

    // Daily quote
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const quoteIndex = dayOfYear % dailyQuotes.length;
    const quote = dailyQuotes[quoteIndex];

    addNotif({
        type: 'savings_insight',
        title: '💡 Daily Financial Quote',
        body: String(quote.en),
        icon: '💡',
        route: '/',
    });

    // Savings tip
    addNotif({
        type: 'savings_insight',
        title: '💡 Smart Savings Tip',
        body: 'Start with the 50-30-20 rule: 50% needs, 30% wants, 20% savings. Try our Budget Tracker to get started!',
        icon: '💡',
        route: '/expenses',
    });

    localStorage.setItem(SEED_KEY, 'done');
}

export const NotificationScheduler = {
    initialize() {
        // Always seed for first-time users
        seedInitialNotifications();

        if (!shouldRun()) return;
        localStorage.setItem(LAST_RUN_KEY, Date.now().toString());
        
        // Run all checks
        checkEMIReminders();
        checkSIPReminders();
        checkTaxAlerts();
        checkCreditCardBills();
        checkSubscriptionRenewals();
        checkLoanPayments();
        checkSavingsInsight();
        checkDailyQuote();
        checkAppUpdate(); // async, fire-and-forget
    },
};

