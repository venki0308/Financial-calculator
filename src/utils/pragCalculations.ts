/**
 * PRAG Calculator — Portfolio Rebalancing & Allocation Guide
 * Calculation engine for asset rebalancing.
 */

import { ASSET_CLASSES, DIVERSIFICATION_FACTOR, type AssetKey } from '../constants/assetAllocation';

export interface PortfolioAsset {
    key: AssetKey;
    name: string;
    currentValue: number;
    targetPercent: number;
    expectedReturn: number;
    volatility: number;
    color: string;
}

export interface RebalancingAction {
    asset: string;
    key: AssetKey;
    currentValue: number;
    currentPercent: number;
    targetPercent: number;
    targetValue: number;
    action: 'BUY' | 'SELL' | 'HOLD';
    amount: number;
    estimatedTax?: number;
    color: string;
}

export interface PRAGResults {
    totalPortfolioValue: number;
    currentAllocation: Record<AssetKey, number>;
    targetAllocation: Record<AssetKey, number>;
    rebalancingActions: RebalancingAction[];
    portfolioHealthScore: number;
    healthGrade: string;
    currentExpectedReturn: number;
    targetExpectedReturn: number;
    currentVolatility: number;
    targetVolatility: number;
    projections: Array<{ year: number; currentValue: number; targetValue: number }>;
    smartInsights: Array<{ text: string; tone: 'info' | 'warning' | 'success'; key: string }>;
    newInvestmentPlan?: {
        monthlyAmount: number;
        monthsToRebalance: number;
        allocationPerMonth: Record<AssetKey, number>;
    };
}

export interface PRAGInputs {
    holdings: Record<AssetKey, number>;
    targetAllocation: Record<AssetKey, number>;
    rebalanceMode: 'full' | 'newInvestment' | 'partial';
    newMonthlyInvestment?: number;
    deviationThreshold?: number; // for partial mode
    projectionYears?: number;
}

function getAssetConfig(key: AssetKey) {
    return ASSET_CLASSES.find(a => a.key === key)!;
}

export function calculatePRAG(inputs: PRAGInputs): PRAGResults {
    const { holdings, targetAllocation, rebalanceMode, newMonthlyInvestment, deviationThreshold = 5, projectionYears = 10 } = inputs;

    const totalValue = Object.values(holdings).reduce((s, v) => s + v, 0);
    if (totalValue === 0) {
        return emptyResults();
    }

    // Current allocation percentages
    const currentAllocation: Record<AssetKey, number> = {} as Record<AssetKey, number>;
    for (const key of Object.keys(holdings) as AssetKey[]) {
        currentAllocation[key] = Math.round((holdings[key] / totalValue) * 1000) / 10;
    }

    // Rebalancing actions
    const actions: RebalancingAction[] = ASSET_CLASSES.map(asset => {
        const currentVal = holdings[asset.key] || 0;
        const currentPct = totalValue > 0 ? (currentVal / totalValue) * 100 : 0;
        const targetPct = targetAllocation[asset.key] || 0;
        const targetVal = totalValue * targetPct / 100;
        const diff = targetVal - currentVal;

        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        let amount = 0;

        if (rebalanceMode === 'partial') {
            if (Math.abs(currentPct - targetPct) > deviationThreshold) {
                action = diff > 0 ? 'BUY' : 'SELL';
                amount = Math.abs(diff);
            }
        } else if (rebalanceMode === 'full') {
            if (Math.abs(diff) > 100) {
                action = diff > 0 ? 'BUY' : 'SELL';
                amount = Math.abs(diff);
            }
        }

        return {
            asset: asset.fallbackLabel,
            key: asset.key,
            currentValue: currentVal,
            currentPercent: Math.round(currentPct * 10) / 10,
            targetPercent: targetPct,
            targetValue: Math.round(targetVal),
            action,
            amount: Math.round(amount),
            color: asset.color,
        };
    });

    // Portfolio risk/return
    const calcWeightedMetrics = (allocation: Record<AssetKey, number>) => {
        let ret = 0, vol = 0;
        for (const asset of ASSET_CLASSES) {
            const w = (allocation[asset.key] || 0) / 100;
            ret += w * asset.expectedReturn;
            vol += w * asset.volatility;
        }
        return { ret: Math.round(ret * 100) / 100, vol: Math.round(vol * DIVERSIFICATION_FACTOR * 100) / 100 };
    };

    const currentMetrics = calcWeightedMetrics(currentAllocation);
    const targetMetrics = calcWeightedMetrics(targetAllocation);

    // Portfolio health score
    const healthScore = calculateHealthScore(currentAllocation, targetAllocation, holdings);
    const healthGrade = healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Poor';

    // 10-year projections
    const projections = [];
    for (let y = 1; y <= projectionYears; y++) {
        projections.push({
            year: y,
            currentValue: Math.round(totalValue * Math.pow(1 + currentMetrics.ret / 100, y)),
            targetValue: Math.round(totalValue * Math.pow(1 + targetMetrics.ret / 100, y)),
        });
    }

    // New investment plan (no-sell rebalancing)
    let newInvestmentPlan: PRAGResults['newInvestmentPlan'];
    if (rebalanceMode === 'newInvestment' && newMonthlyInvestment && newMonthlyInvestment > 0) {
        const deficits: Record<AssetKey, number> = {} as Record<AssetKey, number>;
        let totalDeficit = 0;
        for (const asset of ASSET_CLASSES) {
            const targetVal = totalValue * (targetAllocation[asset.key] || 0) / 100;
            const deficit = Math.max(0, targetVal - (holdings[asset.key] || 0));
            deficits[asset.key] = deficit;
            totalDeficit += deficit;
        }

        const allocationPerMonth: Record<AssetKey, number> = {} as Record<AssetKey, number>;
        for (const asset of ASSET_CLASSES) {
            allocationPerMonth[asset.key] = totalDeficit > 0
                ? Math.round(newMonthlyInvestment * deficits[asset.key] / totalDeficit)
                : 0;
        }

        const monthsToRebalance = totalDeficit > 0 ? Math.ceil(totalDeficit / newMonthlyInvestment) : 0;

        newInvestmentPlan = { monthlyAmount: newMonthlyInvestment, monthsToRebalance, allocationPerMonth };
    }

    // Smart insights
    const smartInsights = generateInsights(currentAllocation, targetAllocation, holdings, totalValue);

    return {
        totalPortfolioValue: totalValue,
        currentAllocation,
        targetAllocation,
        rebalancingActions: actions,
        portfolioHealthScore: healthScore,
        healthGrade,
        currentExpectedReturn: currentMetrics.ret,
        targetExpectedReturn: targetMetrics.ret,
        currentVolatility: currentMetrics.vol,
        targetVolatility: targetMetrics.vol,
        projections,
        smartInsights,
        newInvestmentPlan,
    };
}

function calculateHealthScore(
    current: Record<AssetKey, number>,
    target: Record<AssetKey, number>,
    holdings: Record<AssetKey, number>,
): number {
    let score = 0;
    const totalValue = Object.values(holdings).reduce((s, v) => s + v, 0);

    // Diversification: +20 for having 3+ asset classes > 5%
    const diversified = Object.values(current).filter(v => v > 5).length;
    score += Math.min(20, diversified * 5);

    // Alignment: +40 max, deduct 2 per % point deviation
    let totalDeviation = 0;
    for (const key of Object.keys(current) as AssetKey[]) {
        totalDeviation += Math.abs((current[key] || 0) - (target[key] || 0));
    }
    score += Math.max(0, 40 - totalDeviation * 2);

    // Rebalancing freshness: +20 (simulated — always give partial credit)
    score += 15;

    // Liquidity ratio: cash + debt >= 20% → +20
    const liquidityRatio = ((current.cash || 0) + (current.debt || 0));
    score += liquidityRatio >= 20 ? 20 : Math.round(liquidityRatio);

    return Math.min(100, Math.max(0, score));
}

function generateInsights(
    current: Record<AssetKey, number>,
    target: Record<AssetKey, number>,
    holdings: Record<AssetKey, number>,
    totalValue: number,
): Array<{ text: string; tone: 'info' | 'warning' | 'success'; key: string }> {
    const insights: Array<{ text: string; tone: 'info' | 'warning' | 'success'; key: string }> = [];

    const equityDiff = (current.equity || 0) - (target.equity || 0);
    if (equityDiff > 10) {
        insights.push({ key: 'prag.insightEquityHigh', text: 'Your equity has grown significantly. Consider using STP to shift equity gains to debt gradually.', tone: 'warning' });
    }
    if ((current.international || 0) < 1) {
        insights.push({ key: 'prag.insightNoIntl', text: 'Adding 5-10% international allocation improves diversification. Consider Nifty Global indices or US equity funds.', tone: 'info' });
    }
    if ((current.cash || 0) > 15) {
        insights.push({ key: 'prag.insightHighCash', text: `You have idle cash. Consider deploying via SIP or STP into equity for better long-term returns.`, tone: 'warning' });
    }
    if ((current.debt || 0) < 5 && totalValue > 100000) {
        insights.push({ key: 'prag.insightNoDebt', text: 'No debt allocation found. A minimum 10-15% in debt (liquid fund, PPF, FD) provides stability.', tone: 'warning' });
    }

    const totalDeviation = Object.keys(current).reduce((s, k) => s + Math.abs((current[k as AssetKey] || 0) - (target[k as AssetKey] || 0)), 0);
    if (totalDeviation < 10) {
        insights.push({ key: 'prag.insightWellBalanced', text: 'Your portfolio is well-aligned with your target allocation. Keep monitoring quarterly.', tone: 'success' });
    }

    return insights;
}

function emptyResults(): PRAGResults {
    const empty: Record<AssetKey, number> = { equity: 0, debt: 0, gold: 0, realEstate: 0, international: 0, cash: 0 };
    return {
        totalPortfolioValue: 0,
        currentAllocation: { ...empty },
        targetAllocation: { ...empty },
        rebalancingActions: [],
        portfolioHealthScore: 0,
        healthGrade: 'Poor',
        currentExpectedReturn: 0,
        targetExpectedReturn: 0,
        currentVolatility: 0,
        targetVolatility: 0,
        projections: [],
        smartInsights: [],
    };
}
