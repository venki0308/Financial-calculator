/**
 * Asset Allocation Configuration — PRAG Calculator
 * Based on Indian financial planning best practices.
 */

export type AssetKey = 'equity' | 'debt' | 'gold' | 'realEstate' | 'international' | 'cash';
export type RiskAppetite = 'conservative' | 'moderate' | 'aggressive';
export type InvestmentGoal = 'wealth' | 'retirement' | 'childEducation' | 'homePurchase' | 'emergency';

export interface AssetClassConfig {
    key: AssetKey;
    labelKey: string;
    fallbackLabel: string;
    icon: string;
    color: string;
    expectedReturn: number;
    volatility: number;
}

export const ASSET_CLASSES: AssetClassConfig[] = [
    { key: 'equity', labelKey: 'prag.equity', fallbackLabel: 'Equity', icon: '📈', color: '#22c55e', expectedReturn: 12, volatility: 18 },
    { key: 'debt', labelKey: 'prag.debt', fallbackLabel: 'Debt', icon: '🏦', color: '#3b82f6', expectedReturn: 7, volatility: 5 },
    { key: 'gold', labelKey: 'prag.gold', fallbackLabel: 'Gold', icon: '🥇', color: '#eab308', expectedReturn: 8, volatility: 12 },
    { key: 'realEstate', labelKey: 'prag.realEstate', fallbackLabel: 'Real Estate', icon: '🏠', color: '#8b5cf6', expectedReturn: 10, volatility: 8 },
    { key: 'international', labelKey: 'prag.international', fallbackLabel: 'International', icon: '🌍', color: '#06b6d4', expectedReturn: 11, volatility: 20 },
    { key: 'cash', labelKey: 'prag.cash', fallbackLabel: 'Cash/Liquid', icon: '💰', color: '#6b7280', expectedReturn: 5, volatility: 1 },
];

export const RISK_ADJUSTMENTS: Record<RiskAppetite, number> = {
    conservative: -15,
    moderate: 0,
    aggressive: 10,
};

export const GOAL_ADJUSTMENTS: Record<InvestmentGoal, Record<AssetKey, number>> = {
    wealth: { equity: 5, debt: -5, gold: 0, realEstate: 0, international: 0, cash: 0 },
    retirement: { equity: 0, debt: 5, gold: 0, realEstate: 0, international: 0, cash: -5 },
    childEducation: { equity: -10, debt: 10, gold: 0, realEstate: 0, international: 0, cash: 0 },
    homePurchase: { equity: -20, debt: 15, gold: 0, realEstate: 0, international: 0, cash: 5 },
    emergency: { equity: -10, debt: 0, gold: 0, realEstate: 0, international: 0, cash: 10 },
};

/** Calculate ideal allocation based on age, risk, goal, horizon */
export function suggestAllocation(
    age: number,
    risk: RiskAppetite,
    goal: InvestmentGoal,
    horizonYears: number,
    totalPortfolio: number,
): Record<AssetKey, number> {
    // Age-based equity
    let equity = Math.max(20, Math.min(80, 100 - age + RISK_ADJUSTMENTS[risk]));

    // Goal adjustments
    const goalAdj = GOAL_ADJUSTMENTS[goal];
    if (goal === 'retirement' && horizonYears < 10) {
        equity -= 10;
    }
    if (goal === 'childEducation' && horizonYears < 5) {
        equity -= 15;
    }
    equity += goalAdj.equity;
    equity = Math.max(20, Math.min(80, equity));

    // Fixed allocations
    const gold = 10;
    const international = totalPortfolio >= 500000 ? (risk === 'aggressive' ? 10 : 5) : 0;
    const cash = Math.max(5, Math.min(10, 5 + (goalAdj.cash || 0)));
    const realEstate = totalPortfolio >= 5000000 ? 0 : 0; // Not recommended below 50L

    // Debt = remainder
    const debt = Math.max(0, 100 - equity - gold - international - cash - realEstate);

    // Normalize to 100%
    const total = equity + debt + gold + international + cash + realEstate;
    const factor = 100 / total;

    return {
        equity: Math.round(equity * factor),
        debt: Math.round(debt * factor),
        gold: Math.round(gold * factor),
        realEstate: Math.round(realEstate * factor),
        international: Math.round(international * factor),
        cash: Math.round(cash * factor),
    };
}

/** Diversification factor for portfolio volatility calculation */
export const DIVERSIFICATION_FACTOR = 0.7;
