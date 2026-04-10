/**
 * STP Calculator — Systematic Transfer Plan Calculation Engine
 * Supports Fixed, Capital, and Flex STP types.
 */

export type STPType = 'fixed' | 'capital' | 'flex';
export type STPFrequency = 'weekly' | 'monthly' | 'quarterly';

export interface STPInputs {
    initialAmount: number;
    transferAmount: number;
    frequency: STPFrequency;
    sourceRate: number;
    targetRate: number;
    durationMonths: number;
    stpType: STPType;
    exitLoadPercent: number;
    exitLoadFreeMonths: number;
    taxSlabPercent: number;
    flexBaseAmount?: number;
    flexMultiplier?: number;
    capitalMinThreshold?: number;
}

export interface STPMonthlyRow {
    month: number;
    sourceOpening: number;
    sourceInterest: number;
    transferAmount: number;
    exitLoadPaid: number;
    taxPaid: number;
    netTransfer: number;
    sourceClosing: number;
    targetUnitsApprox: number;
    targetValueAccumulated: number;
    assumedNAV: number;
}

export interface STPResults {
    schedule: STPMonthlyRow[];
    totalTransferred: number;
    finalSourceBalance: number;
    finalTargetValue: number;
    totalPortfolioValue: number;
    lumpsumDirectComparison: number;
    totalSourceInterestEarned: number;
    totalExitLoadPaid: number;
    totalTaxPaid: number;
    averagePurchasePrice: number;
    numberOfInstallments: number;
    isSourceExhausted: boolean;
    exhaustionMonth?: number;
    totalUnits: number;
    finalNAV: number;
    netEffectiveSourceReturn: number;
}

function frequencyToMonths(freq: STPFrequency): number {
    if (freq === 'weekly') return 1 / 4.33;
    if (freq === 'quarterly') return 3;
    return 1;
}

function getInstallmentCount(durationMonths: number, freq: STPFrequency): number {
    const interval = frequencyToMonths(freq);
    return Math.floor(durationMonths / interval);
}

export function calculateSTP(inputs: STPInputs): STPResults {
    const {
        initialAmount, transferAmount, frequency, sourceRate, targetRate,
        durationMonths, stpType, exitLoadPercent, exitLoadFreeMonths,
        taxSlabPercent, flexBaseAmount, flexMultiplier, capitalMinThreshold,
    } = inputs;

    const intervalMonths = frequencyToMonths(frequency);
    const n = getInstallmentCount(durationMonths, frequency);
    const rs = sourceRate / 100 / (12 / intervalMonths);
    const re = targetRate / 100 / (12 / intervalMonths);

    const schedule: STPMonthlyRow[] = [];
    let sourceBalance = initialAmount;
    let totalTransferred = 0;
    let totalExitLoad = 0;
    let totalTax = 0;
    let totalUnits = 0;
    let targetAccumulated = 0;
    let isExhausted = false;
    let exhaustionMonth: number | undefined;
    let totalSourceInterest = 0;
    const baseNAV = 100;

    for (let i = 1; i <= n; i++) {
        if (sourceBalance <= 0) break;

        // Source earns interest before transfer
        const interest = sourceBalance * rs;
        totalSourceInterest += interest;
        const sourceAfterInterest = sourceBalance + interest;

        // Determine transfer amount based on STP type
        let transfer: number;
        if (stpType === 'capital') {
            transfer = Math.max(0, interest);
            if (capitalMinThreshold && transfer < capitalMinThreshold) transfer = 0;
        } else if (stpType === 'flex') {
            const base = flexBaseAmount || transferAmount;
            const mult = flexMultiplier || 1.5;
            // Simulate: if target NAV dropped, transfer more
            const navChange = Math.sin(i * 0.5) * 0.1; // simulated volatility
            transfer = navChange < 0 ? base * mult : base;
        } else {
            transfer = transferAmount;
        }

        // Cap transfer to available balance
        transfer = Math.min(transfer, sourceAfterInterest);
        if (transfer <= 0 && stpType !== 'capital') break;

        // Exit load (applied only before exit load free period)
        const monthFromStart = i * intervalMonths;
        let exitLoad = 0;
        if (exitLoadPercent > 0 && monthFromStart <= exitLoadFreeMonths) {
            exitLoad = transfer * exitLoadPercent / 100;
        }

        // Tax on source fund gains (debt fund — slab rate on all gains)
        const gainsRatio = totalSourceInterest / Math.max(sourceAfterInterest, 1);
        const gainsInTransfer = transfer * gainsRatio;
        const tax = gainsInTransfer * taxSlabPercent / 100;

        const netTransfer = transfer - exitLoad - tax;

        // Update source balance
        sourceBalance = sourceAfterInterest - transfer;
        if (sourceBalance < 1) {
            sourceBalance = 0;
            if (!isExhausted) {
                isExhausted = true;
                exhaustionMonth = i;
            }
        }

        totalTransferred += transfer;
        totalExitLoad += exitLoad;
        totalTax += tax;

        // Target fund: assumed NAV with slight growth trajectory
        const assumedNAV = baseNAV * Math.pow(1 + re, i);
        const unitsBought = netTransfer > 0 ? netTransfer / assumedNAV : 0;
        totalUnits += unitsBought;

        // Target value = all units × current NAV
        targetAccumulated = totalUnits * assumedNAV;

        schedule.push({
            month: Math.round(i * intervalMonths),
            sourceOpening: sourceAfterInterest - interest,
            sourceInterest: interest,
            transferAmount: transfer,
            exitLoadPaid: exitLoad,
            taxPaid: tax,
            netTransfer,
            sourceClosing: sourceBalance,
            targetUnitsApprox: Math.round(totalUnits * 100) / 100,
            targetValueAccumulated: targetAccumulated,
            assumedNAV: Math.round(assumedNAV * 100) / 100,
        });
    }

    const finalNAV = baseNAV * Math.pow(1 + re, n);
    const finalTargetValue = totalUnits * finalNAV;
    const avgPurchasePrice = totalUnits > 0 ? (totalTransferred - totalExitLoad - totalTax) / totalUnits : 0;

    // Lumpsum comparison: entire initialAmount in target fund from day 1
    const totalMonths = n * intervalMonths;
    const lumpsumValue = initialAmount * Math.pow(1 + targetRate / 100 / 12, totalMonths);

    // Net effective source return (post-tax)
    const sourceGrossReturn = sourceRate;
    const netSourceReturn = sourceGrossReturn * (1 - taxSlabPercent / 100);

    return {
        schedule,
        totalTransferred,
        finalSourceBalance: sourceBalance,
        finalTargetValue: Math.round(finalTargetValue),
        totalPortfolioValue: Math.round(sourceBalance + finalTargetValue),
        lumpsumDirectComparison: Math.round(lumpsumValue),
        totalSourceInterestEarned: Math.round(totalSourceInterest),
        totalExitLoadPaid: Math.round(totalExitLoad),
        totalTaxPaid: Math.round(totalTax),
        averagePurchasePrice: Math.round(avgPurchasePrice * 100) / 100,
        numberOfInstallments: schedule.length,
        isSourceExhausted: isExhausted,
        exhaustionMonth,
        totalUnits: Math.round(totalUnits * 100) / 100,
        finalNAV: Math.round(finalNAV * 100) / 100,
        netEffectiveSourceReturn: Math.round(netSourceReturn * 100) / 100,
    };
}

/** Generate smart insights based on STP inputs and results */
export function getSTPInsights(inputs: STPInputs, results: STPResults): Array<{ text: string; tone: 'info' | 'warning' | 'success'; key: string }> {
    const insights: Array<{ text: string; tone: 'info' | 'warning' | 'success'; key: string }> = [];

    if (inputs.durationMonths < 6) {
        insights.push({ key: 'stp.insightShortDuration', text: 'Very short STP. Consider 12 months for better rupee cost averaging.', tone: 'warning' });
    }
    if (inputs.sourceRate > 8) {
        insights.push({ key: 'stp.insightHighSource', text: 'Excellent source fund return. Debt funds are currently offering 7–7.5% p.a.', tone: 'info' });
    }
    if (results.isSourceExhausted) {
        insights.push({ key: 'stp.insightExhausted', text: `Source fund exhausted in month ${results.exhaustionMonth}. Consider reducing transfer amount.`, tone: 'warning' });
    }
    if (inputs.targetRate < 10) {
        insights.push({ key: 'stp.insightLowTarget', text: 'Assumed return is conservative. Large cap equity has historically delivered 11–13% over 10-year periods.', tone: 'info' });
    }
    if (results.totalPortfolioValue > results.lumpsumDirectComparison) {
        insights.push({ key: 'stp.insightBeatLumpsum', text: 'STP outperformed direct lumpsum investment in this scenario!', tone: 'success' });
    } else {
        insights.push({ key: 'stp.insightLumpsumBetter', text: 'STP gives lower returns vs lumpsum in bull markets BUT protects against 20-30% market downside risk.', tone: 'info' });
    }
    return insights;
}
