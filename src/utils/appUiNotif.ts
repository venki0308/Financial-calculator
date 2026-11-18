/**
 * In-app notification (bell) texts in the user's language.
 *
 * Entries are saved once in the notification store, so their text used to stay in the language
 * of the moment they were created (mostly English). New entries carry an i18n description in
 * `metadata.i18n` (keys + params) and the Notifications screen renders them with t() at display
 * time. Entries saved before this (plain English text) are matched against the fixed English
 * texts below; anything unknown is shown as saved.
 */
import { formatDateUI } from './uiLocale';

type T = (key: string, opts?: Record<string, unknown>) => string;

/** Returned by t() when a key is not in the loaded bundles yet (keeps the saved text). */
const MISSING = '\u0001';

/** A param value: plain text/number, a translatable text, or a month number (1-12) shown as a short month name. */
export type NotifParam = string | number | { k: string; d?: string } | { month: number };

export interface NotifI18n {
    /** i18n key of the title (without the emoji prefix). */
    title: string;
    /** i18n key of the body; omitted = keep the saved body. */
    body?: string;
    params?: Record<string, NotifParam>;
    /** Emoji shown before the title. */
    pre?: string;
    /** Daily quote entries: day number (1-366, see quoteDay in src/data/quotes.ts). */
    quoteDay?: number;
}

function resolveParams(params: Record<string, NotifParam> | undefined, t: T): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (!params) return out;
    for (const [name, v] of Object.entries(params)) {
        if (v && typeof v === 'object') {
            if ('month' in v) out[name] = formatDateUI(new Date(2024, v.month - 1, 1), { month: 'short' });
            else out[name] = t(v.k, { defaultValue: v.d ?? '' });
        } else {
            out[name] = v;
        }
    }
    return out;
}

// Fixed English texts of entries saved before keys were stored (seeded welcome/tip entries,
// budget alerts from the budget store). Title/body text → key.
const LEGACY_TITLES: Record<string, { key: string; pre: string }> = {
    '🎉 Welcome to FinCalix!': { key: 'appUi.notif.welcomeTitle', pre: '🎉' },
    '💡 Smart Savings Tip': { key: 'appUi.notif.smartTipTitle', pre: '💡' },
    '💡 Daily Financial Quote': { key: 'appUi.notif.dailyQuoteTitle', pre: '💡' },
    '💳 EMI Reminder': { key: 'appUi.notif.emiReminderTitle', pre: '💳' },
    '📈 SIP Investment Due': { key: 'appUi.notif.sipDueTitle', pre: '📈' },
    '💡 Savings Tip': { key: 'appUi.notif.tipSavingsTitle', pre: '💡' },
    '💡 PPF Tip': { key: 'appUi.notif.tipPpfTitle', pre: '💡' },
    '💡 Rule of 72': { key: 'cagr.ruleOf72', pre: '💡' },
    '💡 Budget Tip': { key: 'appUi.notif.tipBudgetTitle', pre: '💡' },
    '💡 Emergency Fund': { key: 'expenses.emergencyFund', pre: '💡' },
    '💡 Home Loan Tip': { key: 'appUi.notif.tipHomeLoanTitle', pre: '💡' },
    '🚨 Budget Exceeded': { key: 'appUi.notif.budgetExceededTitle', pre: '🚨' },
    '⚠️ Budget Alert': { key: 'appUi.notif.budget80Title', pre: '⚠️' },
};
const LEGACY_BODIES: Record<string, string> = {
    'Your personal finance super-app is ready. Explore 45+ calculators, budget tools, government schemes, and more!': 'appUi.notif.welcomeBody',
    'Start with the 50-30-20 rule: 50% needs, 30% wants, 20% savings. Try our Budget Tracker to get started!': 'appUi.notif.smartTipBody',
    'Your EMI may be due this month. Check your loan schedule and ensure funds are ready.': 'appUi.notif.emiReminderBody',
    'Your monthly SIP may be due. Ensure your bank account has sufficient balance for auto-debit.': 'appUi.notif.sipDueBody',
    'Did you know? Investing ₹5,000/month in a SIP at an assumed 12% for 10 years can grow to about ₹11.6 lakh.': 'appUi.notif.tipSavingsBody',
    'Divide 72 by the interest rate to see how many years your money takes to double — at 8% it is about 9 years.': 'appUi.notif.tipRule72Body',
    'Try the 50-30-20 rule: 50% of income for needs, 30% for wants, 20% for savings. The Budget Tracker shows where you stand.': 'appUi.notif.tipBudgetBody',
    'Keep about 6 months of expenses in an easily accessible emergency fund before investing for long-term goals.': 'appUi.notif.tipEmergencyBody',
    'Paying one extra EMI every year on a 20-year home loan at 8.5% can close it about 3 years early.': 'appUi.notif.tipHomeLoanBody',
    'You have exceeded your overall monthly budget!': 'appUi.notif.budgetExceededBody',
    'You have used 80% of your monthly budget.': 'appUi.notif.budget80Body',
};

export interface LocalizedNotif { title: string; body: string; quoteDay?: number }

/** Title and body of a bell entry in the current language (quote bodies are filled in by the screen). */
export function localizeNotif(
    n: { type: string; title: string; body: string; metadata?: Record<string, unknown> },
    t: T,
): LocalizedNotif {
    const m = n.metadata?.i18n as NotifI18n | undefined;
    if (m && typeof m.title === 'string') {
        const p = resolveParams(m.params, t);
        const title = t(m.title, { ...p, defaultValue: MISSING });
        return {
            title: title !== MISSING ? `${m.pre ? `${m.pre} ` : ''}${title}` : n.title,
            body: m.body ? t(m.body, { ...p, defaultValue: n.body }) : n.body,
            quoteDay: typeof m.quoteDay === 'number' ? m.quoteDay : undefined,
        };
    }
    const lt = LEGACY_TITLES[n.title];
    const lb = LEGACY_BODIES[n.body];
    const title = lt ? t(lt.key, { defaultValue: MISSING }) : MISSING;
    return {
        title: title !== MISSING ? `${lt!.pre} ${title}` : n.title,
        body: lb ? t(lb, { defaultValue: n.body }) : n.body,
    };
}
