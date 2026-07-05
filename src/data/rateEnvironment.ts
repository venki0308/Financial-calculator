/**
 * Current market interest rate context — update quarterly.
 * Last updated: July 2026 (Q2 FY2026-27). Repo held at 5.25% in the Jun 2026 MPC (unanimous, neutral stance).
 */
export const RATE_ENVIRONMENT = {
    quarter: 'Q2 FY2026-27',
    quarterLabel: 'Jul–Sep 2026',
    repoRate: 5.25,
    direction: 'hold' as const,
    lastAction: 'cut' as const,
    lastActionDate: 'Dec 2025',
    nextMeeting: 'August 2026',
    loanDepositRatio: 83, // percent
};

export type RateDirection = 'cut' | 'hike' | 'hold';

/** Market context tooltips for each loan type — i18n keys with English fallbacks */
export const RATE_CONTEXT = {
    homeLoan: {
        titleKey: 'rateCtx.homeLoanTitle',
        titleFallback: 'Home Loan Rates — July 2026',
        bodyKey: 'rateCtx.homeLoanBody',
        bodyFallback: 'RBI held the repo rate at 5.25% in the June 2026 MPC meeting.\n\nRepo-linked (EBLR) loans: top banks now start around 7.25–8.7% (SBI from 7.25% w.e.f. Apr 2026)\nMCLR-linked loans: transmission is slower — compare with repo-linked offers\n\nTip: If you have an MCLR-linked loan, consider switching to a repo-linked loan for better rate transmission when RBI cuts rates.',
    },
    personalLoan: {
        titleKey: 'rateCtx.personalLoanTitle',
        titleFallback: 'Personal Loan Rates — July 2026',
        bodyKey: 'rateCtx.personalLoanBody',
        bodyFallback: 'Personal loan rates range roughly 10–24% as banks stay cautious on unsecured lending.\n\nYour CIBIL score has the biggest impact.\nScore 750+ can get rates near 10%.',
    },
    fd: {
        titleKey: 'rateCtx.fdTitle',
        titleFallback: 'FD Rates — July 2026',
        bodyKey: 'rateCtx.fdBody',
        bodyFallback: 'FD rates have eased after RBI\'s 2025 rate cuts (repo now 5.25%).\n\nMajor banks offer about 6.0–6.5% on 1–3 year FDs (SBI peak 6.45%).\nSenior citizens get an additional 0.50%.\n\nPost Office schemes (NSC 7.7%, SCSS 8.2%) offer higher guaranteed rates.',
    },
    carLoan: {
        titleKey: 'rateCtx.carLoanTitle',
        titleFallback: 'Car Loan Rates — July 2026',
        bodyKey: 'rateCtx.carLoanBody',
        bodyFallback: 'Car loan rates range from about 8.5–10.5% for new vehicles at top banks.\n\nUsed car loans typically carry 2–4% higher rates.\nDealer finance rates may be higher — compare with bank rates.',
    },
    twoWheeler: {
        titleKey: 'rateCtx.twoWheelerTitle',
        titleFallback: 'Two Wheeler Loan Rates — July 2026',
        bodyKey: 'rateCtx.twoWheelerBody',
        bodyFallback: 'Two wheeler loan rates range from 10–14% at banks.\n\nEV two wheelers may get 0.5–1% lower rates at select banks.\nNBFC rates can go up to 18–20%.',
    },
    goldLoan: {
        titleKey: 'rateCtx.goldLoanTitle',
        titleFallback: 'Gold Loan Rates — July 2026',
        bodyKey: 'rateCtx.goldLoanBody',
        bodyFallback: 'Banks: 8.5–14% | NBFCs: 8–27%\n\nGold loans are collateral-backed so rates are lower than personal loans.\nRBI tiered LTV caps (from Apr 2026): 85% up to ₹2.5L, 80% for ₹2.5–5L, 75% above ₹5L.',
    },
};

/** Smart insight for loan tracker based on user's rate */
export function getLoanRateInsight(rate: number, loanType: string): { key: string; fallback: string; tone: 'warning' | 'info' } {
    if (loanType.toLowerCase().includes('home') || loanType.toLowerCase().includes('mortgage')) {
        if (rate > 9.5) {
            return {
                key: 'rateCtx.mclrWarning',
                fallback: `Your rate (${rate}%) may be MCLR-linked. Banks may raise MCLR due to funding pressure despite RBI's rate hold. Consider switching to a repo-linked loan.`,
                tone: 'warning',
            };
        }
        return {
            key: 'rateCtx.repoStable',
            fallback: `Your loan is likely on a repo-linked rate. With RBI holding at 5.25%, your EMI is stable. Next RBI meeting: August 2026.`,
            tone: 'info',
        };
    }
    return {
        key: 'rateCtx.rateHoldGeneral',
        fallback: `RBI held repo rate at 5.25% (Jun 2026). No immediate rate changes expected. Next meeting: August 2026.`,
        tone: 'info',
    };
}
