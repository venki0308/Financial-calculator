/**
 * FinCalix Notification Scheduler
 * Evaluates user financial data daily and triggers smart notifications.
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { LocalNotificationSchema } from '@capacitor/local-notifications';
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
import { parseLocalDate } from '../utils/dateUtils';

const LAST_RUN_KEY = 'fincalix_scheduler_last_run';
const MIN_INTERVAL_MS = 23 * 60 * 60 * 1000; // 23 hours

// ── Native (background) reminder scheduling ────────────────────────────
// Android 8+ requires a channel; importance 4 (HIGH) gives heads-up banners.
const REMINDER_CHANNEL_ID = 'fincalix_reminders';
// Ask for POST_NOTIFICATIONS at most once from the default flow (Android 13+).
const PERM_REQUESTED_KEY = 'fincalix_notif_perm_requested';
// Route handoff from a tapped native notification → App.tsx router.
const PENDING_NAV_KEY = 'fincalix_pending_nav';
export const NOTIFICATION_NAV_EVENT = 'fincalix:notification-nav';
// Id ranges: 1000–1099 = daily quotes (see checkDailyQuote). Scheduled
// reminders live at >= REMINDER_ID_BASE so reconciliation never touches quotes.
const REMINDER_ID_BASE = 10000;

function addNotif(n: { type: string, title: string, body: string, icon: string, route?: string, itemId?: string }) {
    useNotificationStore.getState().addNotification({
        type: n.type,
        category: n.type.includes('alert') ? 'alert' : n.type.includes('insight') ? 'insight' : 'reminder',
        title: n.title,
        body: n.body,
        icon: n.icon,
        isActionable: !!n.route,
        actionRoute: n.route,
        actionLabel: n.route ? 'Open' : undefined,
        // calcId makes the store's same-day dedup per-item, so two cards/
        // subs/loans due on the same day don't overwrite each other.
        metadata: n.itemId ? { calcId: n.itemId } : {}
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
    
    // Check saved EMI calculations. Match on enableReminder flag rather than
    // calculatorType string, because calculatorType is i18n-translated and
    // won't match 'Loan EMI Calculator' for Hindi/Telugu/Tamil/Kannada/Malayalam users.
    const saved = useCalculatorStore.getState().savedCalculations;
    const emiReminders = saved.filter(
        c => c.inputValues?.enableReminder && c.inputValues.reminderDate === dayOfMonth
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
    if (!useSettingsStore.getState().notifications.calcReminders) return;
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

    // Accept both locale codes ('en','hi') and legacy display names ('English','Hindi')
    const langMap: Record<string, 'en' | 'hi' | 'te' | 'ta' | 'kn' | 'ml'> = {
        'en': 'en', 'hi': 'hi', 'te': 'te', 'ta': 'ta', 'kn': 'kn', 'ml': 'ml',
        'English': 'en', 'Hindi': 'hi', 'Telugu': 'te', 'Tamil': 'ta', 'Kannada': 'kn', 'Malayalam': 'ml',
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
                    itemId: card.id,
                });
            } else if (daysUntil <= 3) {
                addNotif({
                    type: 'cc_due_urgent',
                    title: `⚠️ ${name} — Due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
                    body: `Outstanding: ${bal}. Pay full statement to avoid interest charges.`,
                    icon: '⚠️',
                    route: '/expenses',
                    itemId: card.id,
                });
            } else if (daysUntil <= 7) {
                addNotif({
                    type: 'cc_due_soon',
                    title: `💳 ${name} — Due in ${daysUntil} days`,
                    body: `Outstanding: ${bal}. Plan your payment to maintain interest-free period.`,
                    icon: '💳',
                    route: '/expenses',
                    itemId: card.id,
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
            const due = parseLocalDate(sub.nextDueDate);
            const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000);
            if (diffDays >= 0 && diffDays <= 3) {
                const amt = sub.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
                addNotif({
                    type: 'sub_renewal',
                    title: `🔁 ${sub.name} — Renews ${diffDays === 0 ? 'today' : `in ${diffDays} day${diffDays > 1 ? 's' : ''}`}`,
                    body: `${amt} (${sub.billingCycle}). Review or cancel before renewal.`,
                    icon: '🔁',
                    route: '/expenses',
                    itemId: sub.id,
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
                    itemId: loan.id,
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
                    itemId: loan.id,
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

// ─── Native scheduled reminders (delivered while the app is closed) ─────────

/** Stable numeric id from (kind, itemId, date) so re-scheduling replaces, never duplicates. */
function stableNotifId(kind: string, itemId: string, dateStr: string): number {
    const s = `${kind}|${itemId}|${dateStr}`;
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; // djb2
    return REMINDER_ID_BASE + (Math.abs(h) % 2000000000);
}

/** Next occurrence of a day-of-month due day, clamped to short months (mirrors getDaysUntilDue). */
function nextDueOccurrence(dueDay: number, today: Date): Date {
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const thisMonthLastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), Math.min(dueDay, thisMonthLastDay));
    if (thisMonth.getTime() >= startOfToday.getTime()) return thisMonth;
    const nextMonthLastDay = new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate();
    return new Date(today.getFullYear(), today.getMonth() + 1, Math.min(dueDay, nextMonthLastDay));
}

function at9AM(d: Date): Date {
    const t = new Date(d);
    t.setHours(9, 0, 0, 0);
    return t;
}

function addDays(d: Date, days: number): Date {
    const t = new Date(d);
    t.setDate(t.getDate() + days);
    return t;
}

let tapListenerRegistered = false;

/**
 * Route the user when they tap a native notification. Uses `retained`
 * delivery from the plugin, so cold-start taps fire once this listener
 * attaches. The route is handed to App.tsx via localStorage + a window
 * event (see PENDING_NAV_KEY consumer in App.tsx).
 */
function registerTapListener() {
    if (tapListenerRegistered) return;
    tapListenerRegistered = true;
    LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
        const route = event.notification?.extra?.route;
        if (typeof route === 'string' && route.startsWith('/')) {
            localStorage.setItem(PENDING_NAV_KEY, route);
            window.dispatchEvent(new Event(NOTIFICATION_NAV_EVENT));
        }
    }).catch(() => { tapListenerRegistered = false; });
}

/**
 * Native-only init: create the HIGH-importance channel (idempotent) and make
 * sure POST_NOTIFICATIONS is granted. If the OS reports 'prompt', request it
 * once and remember that we asked; if denied, return false and skip silently.
 */
async function ensureNativeNotificationsReady(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    registerTapListener();
    try {
        await LocalNotifications.createChannel({
            id: REMINDER_CHANNEL_ID,
            name: 'Payment & Scheme Reminders',
            description: 'EMI, credit card, and subscription due-date reminders',
            importance: 4, // HIGH — heads-up banner + sound
            visibility: 1, // PUBLIC
        });
    } catch { /* iOS / channel API unavailable — safe to ignore */ }
    try {
        let perm = await LocalNotifications.checkPermissions();
        if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
            if (!localStorage.getItem(PERM_REQUESTED_KEY)) {
                localStorage.setItem(PERM_REQUESTED_KEY, '1');
                perm = await LocalNotifications.requestPermissions();
            }
        }
        return perm.display === 'granted';
    } catch {
        return false;
    }
}

/** Build the next-7-days reminder batch from cards, subscriptions, and loans. */
function buildUpcomingReminders(): LocalNotificationSchema[] {
    const out: LocalNotificationSchema[] = [];
    if (!useSettingsStore.getState().notifications.calcReminders) return out;

    const now = new Date();
    const windowEnd = addDays(now, 7).getTime();
    const push = (kind: string, itemId: string, when: Date, title: string, body: string, route: string) => {
        if (when.getTime() <= now.getTime() || when.getTime() > windowEnd) return;
        out.push({
            id: stableNotifId(kind, itemId, `${when.getFullYear()}-${when.getMonth() + 1}-${when.getDate()}`),
            title,
            body,
            schedule: { at: when, allowWhileIdle: true },
            channelId: REMINDER_CHANNEL_ID,
            extra: { route },
        });
    };

    // Credit cards: 3 days before + on due date (same copy as in-app checks)
    try {
        for (const card of getAllCreditCards()) {
            if (card.currentBalance <= 0) continue;
            const name = card.cardName || card.bankName || 'Credit Card';
            const bal = card.currentBalance.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
            const due = nextDueOccurrence(card.dueDate, now);
            push('cc_pre', card.id, at9AM(addDays(due, -3)),
                `💳 ${name} — Due in 3 days`,
                `Outstanding: ${bal}. Plan your payment to maintain interest-free period.`, '/expenses');
            push('cc_due', card.id, at9AM(due),
                `⚠️ ${name} — Payment due today`,
                `Outstanding: ${bal}. Pay full statement to avoid interest charges.`, '/expenses');
        }
    } catch { /* storage unavailable */ }

    // Subscriptions: 1 day before renewal
    try {
        for (const sub of useBudgetTrackerStore.getState().subscriptions) {
            if (!sub.isActive || !sub.nextDueDate) continue;
            const due = parseLocalDate(sub.nextDueDate);
            const amt = sub.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
            push('sub_pre', sub.id, at9AM(addDays(due, -1)),
                `🔁 ${sub.name} — Renews tomorrow`,
                `${amt} (${sub.billingCycle}). Review or cancel before renewal.`, '/expenses');
        }
    } catch { /* store unavailable */ }

    // Loans: 2 days before + on EMI due day
    try {
        for (const loan of getAllLoans().filter(l => l.isActive)) {
            const due = nextDueOccurrence(loan.emiDueDay || 1, now);
            const emi = loan.emiAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
            const name = loan.nickName || loan.loanType || 'Loan';
            push('loan_pre', loan.id, at9AM(addDays(due, -2)),
                `🏦 ${name} — EMI in 2 days`,
                `EMI: ${emi}. Ensure sufficient balance in your repayment account.`, '/my-loans');
            push('loan_due', loan.id, at9AM(due),
                `🏦 ${name} — EMI due today`,
                `EMI: ${emi}. Ensure sufficient balance in your repayment account.`, '/my-loans');
        }
    } catch { /* storage unavailable */ }

    return out;
}

/**
 * Reconcile + schedule the 7-day native reminder window. Cancels only our
 * reminder ids (>= REMINDER_ID_BASE) so the daily-quote series (1000–1099)
 * is untouched, then schedules the fresh batch. Idempotent per launch.
 */
async function scheduleUpcomingNativeReminders(): Promise<void> {
    try {
        const pending = await LocalNotifications.getPending();
        const stale = pending.notifications
            .filter(n => n.id >= REMINDER_ID_BASE)
            .map(n => ({ id: n.id }));
        if (stale.length > 0) {
            await LocalNotifications.cancel({ notifications: stale });
        }
        const notifications = buildUpcomingReminders();
        if (notifications.length > 0) {
            await LocalNotifications.schedule({ notifications });
        }
    } catch (e) {
        console.error('Failed to schedule native reminders', e);
    }
}

export const NotificationScheduler = {
    initialize() {
        // Always seed for first-time users
        seedInitialNotifications();

        void (async () => {
            // Kick off channel + POST_NOTIFICATIONS settlement WITHOUT awaiting:
            // the in-app (bell) checks below need no OS permission and must not
            // be blocked (or killed) by native permission plumbing.
            const readyPromise = ensureNativeNotificationsReady();

            const gated = shouldRun(); // capture once — LAST_RUN_KEY is set next
            if (gated) {
                localStorage.setItem(LAST_RUN_KEY, Date.now().toString());

                // Run all in-app (bell) checks — each isolated so one failure
                // can't skip the rest (or the native scheduling further down).
                const bellChecks: Array<[string, () => void]> = [
                    ['EMI', checkEMIReminders],
                    ['SIP', checkSIPReminders],
                    ['tax', checkTaxAlerts],
                    ['creditCard', checkCreditCardBills],
                    ['subscription', checkSubscriptionRenewals],
                    ['loan', checkLoanPayments],
                    ['savings', checkSavingsInsight],
                    ['appUpdate', checkAppUpdate], // async, fire-and-forget
                ];
                for (const [name, fn] of bellChecks) {
                    try { fn(); } catch (e) { console.error(`Bell check failed: ${name}`, e); }
                }
            }

            // Channel + POST_NOTIFICATIONS must be settled before any native
            // scheduling (incl. checkDailyQuote, which relies on permission).
            const granted = await readyPromise.catch(() => false);

            // ensureNativeNotificationsReady() is always false on web, but the
            // web branch of checkDailyQuote only adds an in-app bell entry
            // (no OS permission needed) — so web stays eligible.
            if (gated && (granted || !Capacitor.isNativePlatform())) {
                // Still 23h-gated; isolated so a quote failure can't
                // block the native reminder refresh below.
                try { await checkDailyQuote(); } catch (e) { console.error('Daily quote check failed', e); }
            }
            if (granted) {
                // Refresh the 7-day native reminder window on EVERY launch (not
                // 23h-gated) so newly added cards/subs/loans and permission grants
                // take effect immediately. Safe: stable ids + cancel-before-schedule.
                try { await scheduleUpcomingNativeReminders(); } catch (e) { console.error('Native reminder refresh failed', e); }
            }
        })();
    },
};

