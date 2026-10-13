/**
 * Current market interest rate context — update quarterly.
 * Last updated: 12 Oct 2026 (Q3 FY2026-27).
 *  - RBI MPC 5–7 Oct 2026: repo HIKED 25 bps to 5.50% (unanimous), stance changed
 *    from neutral to "calibrated tightening". Next MPC: 2–4 Dec 2026.
 *  - Small-savings rates for Oct–Dec 2026 re-notified unchanged on 30 Sep 2026
 *    (DEA OM F.No.1/4/2019-NS) — 10th straight quarter without change.
 */
export const RATE_ENVIRONMENT = {
    quarter: 'Q3 FY2026-27',
    quarterLabel: 'Oct–Dec 2026',
    repoRate: 5.50,
    direction: 'hike' as const,
    lastAction: 'hike' as const,
    lastActionDate: '7 Oct 2026',
    nextMeeting: '2–4 Dec 2026',
    loanDepositRatio: 83, // percent
};

export type RateDirection = 'cut' | 'hike' | 'hold';

/**
 * Government small-savings (Post Office) rates — notified quarterly by the
 * Ministry of Finance. Single source of truth for calculator defaults and the
 * "current rate" helper strings (pages interpolate `rate` + `quarter`).
 * Q3 FY2026-27 (1 Oct – 31 Dec 2026), notified 30 Sep 2026 — all unchanged.
 */
export const SMALL_SAVINGS = {
    quarter: 'Q3 2026-27',
    months: 'Oct–Dec 2026',
    /** Human label used in helper text, e.g. "Q3 2026-27 (Oct–Dec 2026)" */
    label: 'Q3 2026-27 (Oct–Dec 2026)',
    notifiedOn: '2026-09-30',
    validTill: '2026-12-31',
    rates: {
        ppf: 7.1,
        nsc: 7.7,
        ssy: 8.2,
        scss: 8.2,
        kvp: 7.5,
        kvpMaturityMonths: 115,
        pomis: 7.4,
        td1y: 6.9,
        td2y: 7.0,
        td3y: 7.1,
        td5y: 7.5,
        rd5y: 6.7,
        savings: 4.0,
    },
} as const;

/** Market context tooltips for each loan type — i18n keys with English fallbacks */
export const RATE_CONTEXT = {
    homeLoan: {
        titleKey: 'rateCtx.homeLoanTitle',
        titleFallback: 'Home Loan Rates — October 2026',
        bodyKey: 'rateCtx.homeLoanBody',
        bodyFallback: 'RBI raised the repo rate by 25 bps to 5.50% on 7 Oct 2026 (stance: calibrated tightening).\n\nRepo-linked (EBLR) loans: top banks started around 7.25–8.7% before the hike (SBI from 7.25%) — expect a ~0.25% upward reset on your next rate-review date\nMCLR-linked loans: transmission is slower — compare with repo-linked offers\n\nTip: If your EMI is fixed, the bank usually extends tenure instead. Ask for an EMI increase to avoid paying extra interest.',
    },
    personalLoan: {
        titleKey: 'rateCtx.personalLoanTitle',
        titleFallback: 'Personal Loan Rates — October 2026',
        bodyKey: 'rateCtx.personalLoanBody',
        bodyFallback: 'Personal loan rates range roughly 10–24% as banks stay cautious on unsecured lending (SBI 10–15%, ICICI from 9.99%).\n\nYour CIBIL score has the biggest impact.\nScore 750+ can get rates near 10%.',
    },
    fd: {
        titleKey: 'rateCtx.fdTitle',
        titleFallback: 'FD Rates — October 2026',
        bodyKey: 'rateCtx.fdBody',
        bodyFallback: 'FD rates bottomed after RBI\'s 2025 cuts; the Oct 2026 repo hike (now 5.50%) may nudge them up.\n\nMajor banks offer about 6.0–6.5% on 1–3 year FDs (SBI peak 6.40%, HDFC/ICICI 6.50%).\nSenior citizens get an additional 0.50% (peak ~7.05–7.10%).\n\nPost Office schemes (NSC 7.7%, SCSS 8.2%) offer higher guaranteed rates.',
    },
    carLoan: {
        titleKey: 'rateCtx.carLoanTitle',
        titleFallback: 'Car Loan Rates — October 2026',
        bodyKey: 'rateCtx.carLoanBody',
        bodyFallback: 'Car loan rates range from about 8.4–10.5% for new vehicles at top banks (SBI 8.40–9.35%).\n\nUsed car loans typically carry 2–4% higher rates.\nDealer finance rates may be higher — compare with bank rates.',
    },
    twoWheeler: {
        titleKey: 'rateCtx.twoWheelerTitle',
        titleFallback: 'Two Wheeler Loan Rates — October 2026',
        bodyKey: 'rateCtx.twoWheelerBody',
        bodyFallback: 'Two wheeler loan rates range from 10–14% at banks.\n\nEV two wheelers may get 0.5–1% lower rates at select banks.\nNBFC rates can go up to 18–20%.',
    },
    goldLoan: {
        titleKey: 'rateCtx.goldLoanTitle',
        titleFallback: 'Gold Loan Rates — October 2026',
        bodyKey: 'rateCtx.goldLoanBody',
        bodyFallback: 'Banks: 8.5–14% (SBI 9.15% bullet / 10.10% EMI) | NBFCs: 8–27%\n\nGold loans are collateral-backed so rates are lower than personal loans.\nRBI tiered LTV caps (from Apr 2026): 85% up to ₹2.5L, 80% for ₹2.5–5L, 75% above ₹5L.',
    },
};

/** Smart insight for loan tracker based on user's rate */
export function getLoanRateInsight(rate: number, loanType: string): { key: string; fallback: string; tone: 'warning' | 'info' } {
    if (loanType.toLowerCase().includes('home') || loanType.toLowerCase().includes('mortgage')) {
        if (rate > 9.5) {
            return {
                key: 'rateCtx.mclrWarning',
                fallback: `Your rate (${rate}%) may be MCLR-linked. With RBI now hiking (repo 5.50%), MCLR resets can lag and then jump. Consider switching to a repo-linked loan.`,
                tone: 'warning',
            };
        }
        return {
            key: 'rateCtx.repoStable',
            fallback: `Your loan is likely on a repo-linked rate. RBI raised the repo rate to 5.50% on 7 Oct 2026 — expect your rate to reset up by ~0.25% (higher EMI or longer tenure). Next RBI meeting: 2–4 Dec 2026.`,
            tone: 'warning',
        };
    }
    return {
        key: 'rateCtx.rateHoldGeneral',
        fallback: `RBI raised the repo rate by 25 bps to 5.50% (7 Oct 2026, calibrated tightening). Floating-rate loans will reprice upward; cuts are unlikely near term. Next meeting: 2–4 Dec 2026.`,
        tone: 'info',
    };
}
