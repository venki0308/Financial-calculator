/**
 * Current market interest rate context — update quarterly.
 * Last updated: April 2026 (Q1 FY2026-27)
 */
export const RATE_ENVIRONMENT = {
    quarter: 'Q1 FY2026-27',
    quarterLabel: 'Apr–Jun 2026',
    repoRate: 5.25,
    direction: 'hold' as const,
    lastAction: 'cut' as const,
    lastActionDate: 'Dec 2025',
    nextMeeting: 'June 2026',
    liquidityDeficit: 65900, // crore
    loanDepositRatio: 83, // percent
};

export type RateDirection = 'cut' | 'hike' | 'hold';

/** Market context tooltips for each loan type — i18n keys with English fallbacks */
export const RATE_CONTEXT = {
    homeLoan: {
        titleKey: 'rateCtx.homeLoanTitle',
        titleFallback: 'Home Loan Rates — April 2026',
        bodyKey: 'rateCtx.homeLoanBody',
        bodyFallback: 'RBI kept repo rate at 5.25% on Apr 8, 2026.\n\nRepo-linked (EBLR) loans: rates stable at 8.5–9.5%\nMCLR-linked loans: may rise as banks face fund shortage\n\nTip: If you have an MCLR-linked loan, consider switching to a repo-linked loan for better rate transmission when RBI cuts rates.',
    },
    personalLoan: {
        titleKey: 'rateCtx.personalLoanTitle',
        titleFallback: 'Personal Loan Rates — April 2026',
        bodyKey: 'rateCtx.personalLoanBody',
        bodyFallback: 'Personal loan rates remain elevated at 11–22% as banks tighten unsecured lending norms.\n\nYour CIBIL score has the biggest impact.\nScore 750+ can get rates as low as 10.5%.',
    },
    fd: {
        titleKey: 'rateCtx.fdTitle',
        titleFallback: 'FD Rates — April 2026',
        bodyKey: 'rateCtx.fdBody',
        bodyFallback: 'Banks are competing for deposits due to a liquidity shortage of ₹65,900 crore.\n\nMany banks now offering 7.0–7.5% on 1–3 year FDs.\nSenior citizens get an additional 0.25–0.50%.\n\nPost Office schemes (NSC 7.7%, SCSS 8.2%) offer higher guaranteed rates.',
    },
    carLoan: {
        titleKey: 'rateCtx.carLoanTitle',
        titleFallback: 'Car Loan Rates — April 2026',
        bodyKey: 'rateCtx.carLoanBody',
        bodyFallback: 'Car loan rates range from 9.0–10.5% for new vehicles at top banks.\n\nUsed car loans typically carry 2–4% higher rates.\nDealer finance rates may be higher — compare with bank rates.',
    },
    twoWheeler: {
        titleKey: 'rateCtx.twoWheelerTitle',
        titleFallback: 'Two Wheeler Loan Rates — April 2026',
        bodyKey: 'rateCtx.twoWheelerBody',
        bodyFallback: 'Two wheeler loan rates range from 10–14% at banks.\n\nEV two wheelers may get 0.5–1% lower rates at select banks.\nNBFC rates can go up to 18–20%.',
    },
    goldLoan: {
        titleKey: 'rateCtx.goldLoanTitle',
        titleFallback: 'Gold Loan Rates — April 2026',
        bodyKey: 'rateCtx.goldLoanBody',
        bodyFallback: 'Banks: 8.75–14% | NBFCs: 8–27%\n\nGold loans are collateral-backed so rates are lower than personal loans.\nRBI LTV cap: 75% (banks), tiered by amount.',
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
            fallback: `Your loan is likely on a repo-linked rate. With RBI holding at 5.25%, your EMI is stable. Next RBI meeting: June 2026.`,
            tone: 'info',
        };
    }
    return {
        key: 'rateCtx.rateHoldGeneral',
        fallback: `RBI held repo rate at 5.25% (Apr 2026). No immediate rate changes expected. Next meeting: June 2026.`,
        tone: 'info',
    };
}
