import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Wallet, Trash2, TrendingUp, Banknote, ChevronRight, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import { formatINR } from '../utils/calculations';
import { useLiveStatusStore, type SavedLiveProfile } from '../store/useLiveStatusStore';
import { getAllLoans, type LoanType } from '../utils/loanStorage';
import { calculateLiveLoanStatus, type LoanProfile } from '../utils/loanStatusEngine';
import {
    calculateSipStatus, calculateFdStatus, calculateRdStatus,
    calculatePpfStatus, calculateSsyStatus, calculateNscStatus,
    calculateKvpStatus, calculatePomisStatus, calculateScssStatus,
} from '../utils/investmentStatusEngine';
import { AnalyticsService } from '../lib/analytics';
import { getAllCreditCards } from '../utils/creditCardStorage';
import { getUtilization, getUtilizationBarColor, getDaysUntilDue } from '../utils/creditCardCalculations';

const TYPE_META: Record<string, { icon: string; color: string; labelKey: string }> = {
    'Loan EMI': { icon: '🏠', color: '#8B5CF6', labelKey: 'myLoans.typeLabelLoanEmi' },
    'Mortgage': { icon: '🏗️', color: '#8B5CF6', labelKey: 'myLoans.typeLabelMortgage' },
    // Loan subtypes — distinct icons for each so the user can scan their portfolio quickly
    'Home Loan': { icon: '🏠', color: '#8B5CF6', labelKey: 'myLoans.typeLabelHomeLoan' },
    'Car Loan': { icon: '🚗', color: '#3B82F6', labelKey: 'myLoans.typeLabelCarLoan' },
    'Personal Loan': { icon: '💳', color: '#F59E0B', labelKey: 'myLoans.typeLabelPersonalLoan' },
    'Education Loan': { icon: '🎓', color: '#06B6D4', labelKey: 'myLoans.typeLabelEducationLoan' },
    'Gold Loan': { icon: '🥇', color: '#EAB308', labelKey: 'myLoans.typeLabelGoldLoan' },
    'Business Loan': { icon: '💼', color: '#10B981', labelKey: 'myLoans.typeLabelBusinessLoan' },
    'Two Wheeler Loan': { icon: '🛵', color: '#EC4899', labelKey: 'myLoans.typeLabelTwoWheelerLoan' },
    // Investments
    'SIP Calculator': { icon: '📈', color: '#3B82F6', labelKey: 'myLoans.typeLabelSip' },
    'FD Calculator': { icon: '🏦', color: '#F59E0B', labelKey: 'myLoans.typeLabelFd' },
    'RD': { icon: '💰', color: '#F59E0B', labelKey: 'myLoans.typeLabelRd' },
    'PPF Calculator': { icon: '🏛️', color: '#06B6D4', labelKey: 'myLoans.typeLabelPpf' },
    'SSY Calculator': { icon: '👧', color: '#EC4899', labelKey: 'myLoans.typeLabelSsy' },
    'NSC Calculator': { icon: '📜', color: '#14B8A6', labelKey: 'myLoans.typeLabelNsc' },
    'KVP Calculator': { icon: '📋', color: '#22C55E', labelKey: 'myLoans.typeLabelKvp' },
    'Post Office MIS': { icon: '📬', color: '#8B5CF6', labelKey: 'myLoans.typeLabelPomis' },
    'SCSS Calculator': { icon: '👴', color: '#EC4899', labelKey: 'myLoans.typeLabelScss' },
    'Post Office TD': { icon: '📮', color: '#F97316', labelKey: 'myLoans.typeLabelPotd' },
    'Goal Planner': { icon: '🎯', color: '#3B82F6', labelKey: 'myLoans.typeLabelGoal' },
    // Snapshot trackers — saved values are displayed as-is (no live recompute)
    'Compound Interest': { icon: '📊', color: '#8B5CF6', labelKey: 'myLoans.typeLabelCompoundInterest' },
    'Simple Interest': { icon: '🧮', color: '#06B6D4', labelKey: 'myLoans.typeLabelSimpleInterest' },
    'Property': { icon: '🏡', color: '#F59E0B', labelKey: 'myLoans.typeLabelProperty' },
    'Insurance': { icon: '🛡️', color: '#10B981', labelKey: 'myLoans.typeLabelInsurance' },
    'Overdraft': { icon: '💳', color: '#EF4444', labelKey: 'myLoans.typeLabelOverdraft' },
    // Investment / projection trackers — also snapshot mode
    'Lumpsum': { icon: '💎', color: '#3B82F6', labelKey: 'myLoans.typeLabelLumpsum' },
    'SWP': { icon: '💸', color: '#F59E0B', labelKey: 'myLoans.typeLabelSwp' },
    'CAGR': { icon: '📈', color: '#10B981', labelKey: 'myLoans.typeLabelCagr' },
    'EPF': { icon: '🏢', color: '#8B5CF6', labelKey: 'myLoans.typeLabelEpf' },
    'NPS': { icon: '🏛️', color: '#06B6D4', labelKey: 'myLoans.typeLabelNps' },
    'Gratuity': { icon: '🎁', color: '#EC4899', labelKey: 'myLoans.typeLabelGratuity' },
    'Insurance Compare': { icon: '⚖️', color: '#14B8A6', labelKey: 'myLoans.typeLabelInsuranceCompare' },
};

// Map LoanType (loanStorage) → calculatorType string used by TYPE_META + computeMetrics
const LOAN_TYPE_TO_CALC_TYPE: Record<LoanType, string> = {
    home_loan: 'Home Loan',
    car_loan: 'Car Loan',
    personal_loan: 'Personal Loan',
    education_loan: 'Education Loan',
    gold_loan: 'Gold Loan',
    business_loan: 'Business Loan',
    two_wheeler_loan: 'Two Wheeler Loan',
    other: 'Loan EMI',
};

function fmtDate(ts: number | string): string {
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Returns the elapsed years (decimal) since a YYYY-MM-DD date string,
 * clamped to [0, cap]. Used by snapshot-tracker handlers to compute the
 * "value as of today" rather than the projected value at maturity, so
 * cards reflect real elapsed time after the user saves with a start date.
 *
 * Returns 0 if the date is missing/invalid or in the future.
 */
function yearsSince(dateStr: string | undefined, capYears: number = 100): number {
    if (!dateStr) return 0;
    const start = new Date(dateStr).getTime();
    if (isNaN(start)) return 0;
    const diffMs = Date.now() - start;
    if (diffMs <= 0) return 0;
    const years = diffMs / (365.25 * 24 * 60 * 60 * 1000);
    return Math.min(capYears, years);
}

/**
 * Extract the actual start date of a saved profile, regardless of which
 * calculator saved it. Different calculators store the start date under
 * different field names — this normalises across all of them.
 *
 * Returns an ISO YYYY-MM-DD string, or '' if no start date was saved.
 */
function getProfileStartDate(d: any): string {
    if (!d) return '';
    return d.disbursementDate    // Loan calculators (EMI, Mortgage, TwoWheeler, GoldLoan, Overdraft)
        || d.startDate             // SIP, FD, RD, POMIS, SCSS, snapshot trackers
        || d.purchaseDate          // NSC, KVP
        || d.openingDate           // PPF, SSY
        || '';
}

interface LiveMetrics {
    label1: string; value1: string;
    label2: string; value2: string;
    label3: string; value3: string;
    progress: number;
    statusText: string;
}

// Normalize calculatorType: calculators save short names like "SIP", "SSY", "PPF"
// but some code expects "SIP Calculator", "SSY Calculator", etc.
function matchType(type: string, ...names: string[]): boolean {
    const t = type.toLowerCase().replace(/\s+calculator$/i, '').trim();
    return names.some(n => t === n.toLowerCase());
}

// Recognise any loan type — generic 'Loan EMI' / 'Mortgage' OR a specific subtype
function isAnyLoanType(type: string): boolean {
    const t = type.toLowerCase().replace(/\s+calculator$/i, '').trim();
    return t === 'loan emi'
        || t === 'mortgage'
        || t === 'home loan'
        || t === 'car loan'
        || t === 'personal loan'
        || t === 'education loan'
        || t === 'gold loan'
        || t === 'business loan'
        || t === 'two wheeler loan'
        || t === 'overdraft'
        || t === 'od';
}

function computeMetrics(p: SavedLiveProfile, t: (key: string, opts?: any) => string): LiveMetrics | null {
    const d = p.profileData;
    if (!d) return null;
    try {
        const type = p.calculatorType;

        // ── GOLD LOAN ──
        // Gold Loan has two repayment modes: EMI (uses the amortising engine
        // like a normal loan) and Bullet/Interest-Only (snapshot — only the
        // pre-computed totals are valid). Handle bullet first; for EMI fall
        // through to the standard loan branch below.
        if (matchType(type, 'gold loan') && d.isGoldLoan) {
            if (d.repaymentMode === 'bullet' || d.repaymentMode === 'interestOnly') {
                const principal = d.loanAmount || 0;
                const monthlyInt = d.monthlyPayment || 0;
                const totalInt = d.totalInterest || (monthlyInt * (d.tenureMonths || 0));
                return {
                    label1: t('myLoans.metricAmount'),
                    value1: formatINR(principal),
                    label2: t('myLoans.metricEmi'),
                    value2: formatINR(monthlyInt),
                    label3: t('myLoans.metricInterest'),
                    value3: formatINR(totalInt),
                    progress: 100,
                    statusText: `${d.goldWeight || 0}g ${d.purity || ''} · ${d.tierLtv || 75}% LTV`,
                };
            }
            // EMI mode falls through to the standard loan branch below.
        }

        // Overdraft is grouped with loans visually but uses snapshot data,
        // not the amortising loan engine. Handle it before the loan branch.
        if (matchType(type, 'overdraft', 'od')) {
            const utilized = d.utilized || d.loanAmount || 0;
            const totalInterest = d.totalInterest || 0;
            const totalPayable = d.totalPayable ?? (utilized + totalInterest);
            return {
                label1: t('myLoans.metricAmount'), value1: formatINR(utilized),
                label2: t('myLoans.metricInterest'), value2: formatINR(totalInterest),
                label3: t('myLoans.metricValue'), value3: formatINR(totalPayable),
                progress: 100, statusText: `${d.days || 0}d @ ${d.rate || 0}%`,
            };
        }
        if (isAnyLoanType(type)) {
            const lp: LoanProfile = { loanAmount: d.loanAmount, annualRate: d.annualRate, tenureMonths: d.tenureMonths, emiAmount: d.emiAmount, disbursementDate: d.disbursementDate, emiDueDay: d.emiDueDay || 5, loanType: d.loanType || 'floating' };
            const s = calculateLiveLoanStatus(lp);
            if (s.loanFullyPaid) return { label1: t('myLoans.metricTotalPaid'), value1: formatINR(s.totalPaidSoFar), label2: t('myLoans.metricInterest'), value2: formatINR(s.interestPaidSoFar), label3: t('myLoans.metricStatus'), value3: t('myLoans.metricPaidOff'), progress: 100, statusText: t('myLoans.metricComplete') };
            if (s.loanNotStarted) return { label1: t('myLoans.metricAmount'), value1: formatINR(d.loanAmount), label2: t('myLoans.metricEmi'), value2: formatINR(d.emiAmount), label3: t('myLoans.metricStarts'), value3: fmtDate(d.disbursementDate), progress: 0, statusText: t('myLoans.metricNotStarted') };
            return { label1: t('myLoans.metricOutstanding'), value1: formatINR(s.principalOutstanding), label2: t('myLoans.metricEmisPaid'), value2: `${s.emisPaid}/${lp.tenureMonths}`, label3: t('myLoans.metricNextEmi'), value3: fmtDate(s.nextEmiDate), progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}%` };
        }
        if (matchType(type, 'sip', 'sip calculator')) {
            const s = calculateSipStatus({ monthlySip: d.monthlySip || d.monthlyAmount || 0, annualReturn: d.annualReturn || 12, startDate: d.startDate });
            return { label1: t('myLoans.metricInvested'), value1: formatINR(s.totalInvested), label2: t('myLoans.metricValue'), value2: formatINR(s.currentValue), label3: t('myLoans.metricGain'), value3: formatINR(s.wealthGained), progress: Math.min(100, s.monthsInvested), statusText: `${s.sipRunningYears}Y ${s.sipRunningMonths}M` };
        }
        if (matchType(type, 'fd', 'fd calculator', 'potd', 'post office td')) {
            const s = calculateFdStatus({ principal: d.principal, annualRate: d.annualRate, tenureMonths: d.tenureMonths, startDate: d.startDate, compoundingFreq: d.compoundingFreq || 4 });
            return { label1: t('myLoans.metricDeposited'), value1: formatINR(d.principal), label2: t('myLoans.metricValue'), value2: formatINR(s.valueToday), label3: t('myLoans.metricInterest'), value3: formatINR(s.interestEarnedToday), progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}%` };
        }
        if (matchType(type, 'rd')) {
            const s = calculateRdStatus({ monthlyDeposit: d.monthlyDeposit || 0, annualRate: d.annualRate || 5.8, tenureMonths: d.tenureMonths || 60, startDate: d.startDate });
            return { label1: t('myLoans.metricDeposited'), value1: formatINR(s.totalDeposited), label2: t('myLoans.metricValue'), value2: formatINR(s.currentValue), label3: t('myLoans.metricInterest'), value3: formatINR(s.interestEarned), progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}%` };
        }
        if (matchType(type, 'ppf', 'ppf calculator')) {
            const s = calculatePpfStatus({ yearlyDeposit: d.yearlyDeposit || 0, rate: d.rate || d.annualRate || 7.1, openingDate: d.openingDate || d.startDate });
            return { label1: t('myLoans.metricDeposited'), value1: formatINR(s.totalDeposited), label2: t('myLoans.metricBalance'), value2: formatINR(s.balanceToday), label3: t('myLoans.metricInterest'), value3: formatINR(s.interestEarned), progress: Math.min(100, (s.yearsCompleted / 15) * 100), statusText: t('myLoans.metricYearOf15', { year: s.currentYear }) };
        }
        if (matchType(type, 'ssy', 'ssy calculator')) {
            const s = calculateSsyStatus({ yearlyDeposit: d.yearlyDeposit || 0, rate: d.rate || d.annualRate || 8.2, openingDate: d.openingDate || d.startDate, girlDob: d.girlDob || d.openingDate || d.startDate });
            return { label1: t('myLoans.metricDeposited'), value1: formatINR(s.totalDeposited), label2: t('myLoans.metricBalance'), value2: formatINR(s.balanceToday), label3: t('myLoans.metricInterest'), value3: formatINR(s.interestEarned), progress: Math.min(100, (s.accountAge / 21) * 100), statusText: t('myLoans.metricYearOf21', { year: s.accountAge }) };
        }
        if (matchType(type, 'nsc', 'nsc calculator')) {
            const s = calculateNscStatus({ principal: d.principal || 0, rate: d.rate || d.annualRate || 7.7, purchaseDate: d.purchaseDate || d.startDate });
            return { label1: t('myLoans.metricInvested'), value1: formatINR(d.principal), label2: t('myLoans.metricValue'), value2: formatINR(s.valueToday), label3: t('myLoans.metricInterest'), value3: formatINR(s.interestEarned), progress: Math.min(100, (s.yearsCompleted / 5) * 100), statusText: t('myLoans.metricPctOf5yr', { pct: (Math.min(1, s.yearsCompleted / 5) * 100).toFixed(0) }) };
        }
        if (matchType(type, 'kvp', 'kvp calculator')) {
            const s = calculateKvpStatus({ principal: d.principal || 0, rate: d.rate || d.annualRate || 7.5, purchaseDate: d.purchaseDate || d.startDate });
            return { label1: t('myLoans.metricInvested'), value1: formatINR(d.principal), label2: t('myLoans.metricValue'), value2: formatINR(s.valueToday), label3: t('myLoans.metricGain'), value3: formatINR(s.gainSoFar), progress: s.progressToDoubling, statusText: t('myLoans.metricPctTo2x', { pct: s.progressToDoubling.toFixed(0) }) };
        }
        if (matchType(type, 'pomis', 'post office mis')) {
            const s = calculatePomisStatus({ principal: d.principal || 0, rate: d.rate || d.annualRate || 7.4, startDate: d.startDate });
            return { label1: t('myLoans.metricInvested'), value1: formatINR(d.principal), label2: t('myLoans.metricMonthly'), value2: formatINR(s.monthlyIncome), label3: t('myLoans.metricEarned'), value3: formatINR(s.totalIncomeReceived), progress: Math.min(100, (s.monthsCompleted / 60) * 100), statusText: t('myLoans.metricOf60', { count: s.monthsCompleted }) };
        }
        if (matchType(type, 'scss', 'scss calculator')) {
            const s = calculateScssStatus({ principal: d.principal || 0, rate: d.rate || d.annualRate || 8.2, startDate: d.startDate, tenure: d.tenure || 5 });
            return { label1: t('myLoans.metricInvested'), value1: formatINR(d.principal), label2: t('myLoans.metricQuarterly'), value2: formatINR(s.quarterlyIncome), label3: t('myLoans.metricEarned'), value3: formatINR(s.totalIncomeReceived), progress: Math.min(100, (s.quartersCompleted / 20) * 100), statusText: t('myLoans.metricOf20Qtrs', { count: s.quartersCompleted }) };
        }
        if (matchType(type, 'goal planner', 'goal')) {
            const s = calculateSipStatus({ monthlySip: d.monthlySip || d.monthlyAmount || 0, annualReturn: d.annualReturn || 12, startDate: d.startDate, targetAmount: d.targetAmount });
            return { label1: t('myLoans.metricInvested'), value1: formatINR(s.totalInvested), label2: t('myLoans.metricValue'), value2: formatINR(s.currentValue), label3: t('myLoans.metricGoal'), value3: `${s.progressToGoal.toFixed(0)}%`, progress: s.progressToGoal, statusText: t('myLoans.metricPctToGoal', { pct: s.progressToGoal.toFixed(0) }) };
        }

        // ── SNAPSHOT TRACKERS ──
        // These calculators don't have live status engines (or aren't time-based),
        // so we display the values exactly as they were saved.

        if (matchType(type, 'compound interest', 'ci')) {
            // Compute LIVE current value using elapsed time from startDate.
            // Falls back to the saved snapshot if no startDate (older entries).
            const principal = d.principal || 0;
            const rate = d.rate || 0;
            const freq = d.freq || 12;
            const totalYears = d.years || 0;
            const elapsed = yearsSince(d.startDate, totalYears);
            let valueToday: number;
            let progress: number;
            let statusText: string;
            if (elapsed > 0 && rate > 0) {
                // Standard compound interest: P × (1 + r/n)^(n×t)
                valueToday = principal * Math.pow(1 + (rate / 100) / freq, freq * elapsed);
                progress = totalYears > 0 ? Math.min(100, (elapsed / totalYears) * 100) : 100;
                statusText = `${elapsed.toFixed(1)}Y of ${totalYears}Y`;
            } else {
                // Snapshot fallback (no start date or future date)
                valueToday = d.maturity || 0;
                progress = 100;
                statusText = `${totalYears}Y @ ${rate}%`;
            }
            const interest = valueToday - principal;
            return {
                label1: t('myLoans.metricInvested'), value1: formatINR(principal),
                label2: t('myLoans.metricValue'), value2: formatINR(valueToday),
                label3: t('myLoans.metricInterest'), value3: formatINR(interest),
                progress, statusText,
            };
        }
        if (matchType(type, 'simple interest', 'si')) {
            // Live: interest accrues linearly month-by-month from startDate.
            const principal = d.principal || 0;
            const rate = d.rate || 0;
            const totalMonths = d.tenureMonths || 0;
            const elapsedY = yearsSince(d.startDate, totalMonths / 12);
            const elapsedMonths = Math.floor(elapsedY * 12);
            let interestSoFar: number;
            let progress: number;
            let statusText: string;
            if (elapsedMonths > 0 && rate > 0) {
                // Simple interest: P × R × T (monthly)
                interestSoFar = (principal * rate * elapsedMonths) / (12 * 100);
                progress = totalMonths > 0 ? Math.min(100, (elapsedMonths / totalMonths) * 100) : 100;
                statusText = `${elapsedMonths}M of ${totalMonths}M`;
            } else {
                interestSoFar = d.interest || 0;
                progress = 100;
                statusText = `${totalMonths}M @ ${rate}%`;
            }
            const totalPayable = principal + interestSoFar;
            return {
                label1: t('myLoans.metricInvested'), value1: formatINR(principal),
                label2: t('myLoans.metricInterest'), value2: formatINR(interestSoFar),
                label3: t('myLoans.metricValue'), value3: formatINR(totalPayable),
                progress, statusText,
            };
        }
        if (matchType(type, 'property')) {
            const value = d.totalCost || d.propertyValue || 0;
            return {
                label1: t('myLoans.metricValue'), value1: formatINR(value),
                label2: t('myLoans.metricStatus'), value2: d.mode || '—',
                label3: t('myLoans.metricEarned'), value3: d.area ? `${d.area} sqft` : '—',
                progress: 100, statusText: d.mode || 'Property',
            };
        }
        if (matchType(type, 'insurance')) {
            const sumInsured = d.sumInsured || 0;
            const premiumMin = d.premiumMin || 0;
            const premiumMax = d.premiumMax || premiumMin;
            return {
                label1: t('myLoans.metricValue'), value1: formatINR(sumInsured),
                label2: t('myLoans.metricMonthly'), value2: `${formatINR(premiumMin)} – ${formatINR(premiumMax)}`,
                label3: t('myLoans.metricStatus'), value3: d.tab === 'life' ? 'Life' : 'Health',
                progress: 100, statusText: d.tab === 'life' ? t('liveStatus.lifeCoverStatus', 'Life Cover') : t('liveStatus.healthCoverStatus', 'Health Cover'),
            };
        }
        // ── LUMPSUM (one-time investment, live tracker) ──
        if (matchType(type, 'lumpsum')) {
            const principal = d.principal || 0;
            const rate = d.rate || 0;
            const totalYears = d.years || 0;
            const elapsed = yearsSince(d.startDate, totalYears);
            let valueToday: number;
            let progress: number;
            let statusText: string;
            if (elapsed > 0 && rate > 0) {
                // FV = P × (1 + r)^t (annual compounding)
                valueToday = principal * Math.pow(1 + rate / 100, elapsed);
                progress = totalYears > 0 ? Math.min(100, (elapsed / totalYears) * 100) : 100;
                statusText = `${elapsed.toFixed(1)}Y of ${totalYears}Y`;
            } else {
                valueToday = d.maturity || d.fv || 0;
                progress = 100;
                statusText = `${totalYears}Y @ ${rate}%`;
            }
            const gain = valueToday - principal;
            return {
                label1: t('myLoans.metricInvested'), value1: formatINR(principal),
                label2: t('myLoans.metricValue'), value2: formatINR(valueToday),
                label3: t('myLoans.metricGain'), value3: formatINR(gain),
                progress, statusText,
            };
        }
        // ── SWP (systematic withdrawal — live tracker) ──
        if (matchType(type, 'swp')) {
            const corpus = d.totalInvestment || d.principal || 0;
            const monthlyWithdrawal = d.monthlyWithdrawal || 0;
            const rate = d.rate || 0;
            const totalYears = d.years || 0;
            const elapsedY = yearsSince(d.startDate, totalYears);
            let withdrawnSoFar: number;
            let progress: number;
            let statusText: string;
            if (elapsedY > 0 && rate > 0 && monthlyWithdrawal > 0) {
                // Simulate month-by-month: balance × (1 + r/12) − withdrawal
                const elapsedMonths = Math.floor(elapsedY * 12);
                const r = rate / 12 / 100;
                let bal = corpus;
                let withdrawn = 0;
                for (let i = 0; i < elapsedMonths && bal > 0; i++) {
                    bal = bal * (1 + r);
                    if (bal >= monthlyWithdrawal) { bal -= monthlyWithdrawal; withdrawn += monthlyWithdrawal; }
                    else { withdrawn += bal; bal = 0; }
                }
                withdrawnSoFar = withdrawn;
                progress = totalYears > 0 ? Math.min(100, (elapsedY / totalYears) * 100) : 100;
                statusText = `${elapsedY.toFixed(1)}Y of ${totalYears}Y`;
            } else {
                withdrawnSoFar = d.totalWithdrawn || 0;
                progress = 100;
                statusText = `${totalYears}Y @ ${rate}%`;
            }
            return {
                label1: t('myLoans.metricInvested'), value1: formatINR(corpus),
                label2: t('myLoans.metricMonthly'), value2: formatINR(monthlyWithdrawal),
                label3: t('myLoans.metricEarned'), value3: formatINR(withdrawnSoFar),
                progress, statusText,
            };
        }
        // ── CAGR (compound annual growth — snapshot) ──
        if (matchType(type, 'cagr')) {
            const initial = d.initialValue || d.principal || 0;
            const final = d.finalValue || d.maturity || 0;
            const cagr = d.cagr ?? 0;
            return {
                label1: t('myLoans.metricInvested'), value1: formatINR(initial),
                label2: t('myLoans.metricValue'), value2: formatINR(final),
                label3: t('myLoans.metricGain'), value3: `${cagr.toFixed(2)}%`,
                progress: 100, statusText: `${d.years || 0}Y CAGR`,
            };
        }
        // ── EPF (employee provident fund — live tracker) ──
        if (matchType(type, 'epf')) {
            const basic = d.basic || 0;
            const empPct = d.empPct || 12;
            const rate = d.rate || 8.25;
            const totalYears = d.years || 0;
            const elapsedY = yearsSince(d.startDate, totalYears);
            let investedSoFar: number;
            let corpusToday: number;
            let progress: number;
            let statusText: string;
            if (elapsedY > 0 && basic > 0) {
                // Both employee and employer contribute (each 12% of basic by default)
                const monthlyContrib = basic * (empPct / 100) * 2;
                const elapsedMonths = Math.floor(elapsedY * 12);
                const r = rate / 12 / 100;
                let bal = 0;
                for (let i = 0; i < elapsedMonths; i++) {
                    bal = bal * (1 + r) + monthlyContrib;
                }
                investedSoFar = monthlyContrib * elapsedMonths;
                corpusToday = bal;
                progress = totalYears > 0 ? Math.min(100, (elapsedY / totalYears) * 100) : 100;
                statusText = `${elapsedY.toFixed(1)}Y of ${totalYears}Y`;
            } else {
                investedSoFar = d.totalInvested || 0;
                corpusToday = d.corpus || d.maturity || 0;
                progress = 100;
                statusText = `${totalYears}Y @ ${rate}%`;
            }
            const interest = corpusToday - investedSoFar;
            return {
                label1: t('myLoans.metricInvested'), value1: formatINR(investedSoFar),
                label2: t('myLoans.metricBalance'), value2: formatINR(corpusToday),
                label3: t('myLoans.metricInterest'), value3: formatINR(interest),
                progress, statusText,
            };
        }
        // ── NPS (national pension system — live tracker) ──
        if (matchType(type, 'nps')) {
            const monthly = d.monthly || 0;
            const rate = d.rate || 10;
            const totalYears = d.years || 0;
            const elapsedY = yearsSince(d.startDate, totalYears);
            let investedSoFar: number;
            let corpusToday: number;
            let progress: number;
            let statusText: string;
            if (elapsedY > 0 && monthly > 0) {
                const elapsedMonths = Math.floor(elapsedY * 12);
                const r = rate / 12 / 100;
                let bal = 0;
                for (let i = 0; i < elapsedMonths; i++) {
                    bal = bal * (1 + r) + monthly;
                }
                investedSoFar = monthly * elapsedMonths;
                corpusToday = bal;
                progress = totalYears > 0 ? Math.min(100, (elapsedY / totalYears) * 100) : 100;
                statusText = `${elapsedY.toFixed(1)}Y of ${totalYears}Y`;
            } else {
                investedSoFar = d.totalInvested || 0;
                corpusToday = d.corpus || d.maturity || 0;
                progress = 100;
                statusText = `${totalYears}Y @ ${rate}%`;
            }
            const monthlyPension = d.monthlyPension || 0;
            return {
                label1: t('myLoans.metricInvested'), value1: formatINR(investedSoFar),
                label2: t('myLoans.metricBalance'), value2: formatINR(corpusToday),
                label3: t('myLoans.metricMonthly'), value3: formatINR(monthlyPension),
                progress, statusText,
            };
        }
        // ── GRATUITY (one-time payout — snapshot) ──
        if (matchType(type, 'gratuity')) {
            const lastSalary = d.lastSalary || 0;
            const gratuity = d.gratuity || 0;
            const yearsOfService = d.yearsOfService || 0;
            return {
                label1: t('myLoans.metricMonthly'), value1: formatINR(lastSalary),
                label2: t('myLoans.metricValue'), value2: formatINR(gratuity),
                label3: t('myLoans.metricStatus'), value3: `${yearsOfService}Y`,
                progress: 100, statusText: `${yearsOfService}Y service`,
            };
        }
        // ── INSURANCE COMPARE (saved comparison snapshot) ──
        if (matchType(type, 'insurance compare', 'insurance comparison')) {
            const sumInsured = d.sumInsured || 0;
            const premiumA = d.premiumA || 0;
            const premiumB = d.premiumB || 0;
            return {
                label1: t('myLoans.metricValue'), value1: formatINR(sumInsured),
                label2: t('myLoans.metricMonthly'), value2: `${formatINR(premiumA)} vs ${formatINR(premiumB)}`,
                label3: t('myLoans.metricStatus'), value3: d.winner || '—',
                progress: 100, statusText: d.tab === 'life' ? t('liveStatus.lifeCompare', 'Life Compare') : t('liveStatus.healthCompare', 'Health Compare'),
            };
        }
    } catch { return null; }
    return null;
}

function isLoanType(type: string): boolean {
    return isAnyLoanType(type);
}

export default function MyLoans() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const c = useAppColors();
    const { savedProfiles, removeProfile } = useLiveStatusStore();
    const [menuProfile, setMenuProfile] = useState<SavedLiveProfile | null>(null);
    // Tick used to refresh the merged storedLoans list when this screen mounts
    // (useLiveStatusStore is reactive, but loanStorage is plain localStorage)
    const [storageTick, setStorageTick] = useState(0);

    useEffect(() => {
        AnalyticsService.trackScreen('My_Loans');
        // Refresh loanStorage merge whenever the screen comes back into focus.
        setStorageTick(t => t + 1);
    }, []);

    // Also merge any loans from loanStorage that aren't in useLiveStatusStore
    const allProfiles = useMemo(() => {
        const liveIds = new Set(savedProfiles.map(p => p.id));
        const storedLoans = getAllLoans();
        const extraFromStorage: SavedLiveProfile[] = storedLoans
            .filter(l => !liveIds.has(l.id))
            .map(l => ({
                id: l.id,
                name: l.nickName,
                // Preserve the loan subtype so the icon, label & metrics match
                // what the user saved (Home / Car / Personal / Two Wheeler / etc.)
                calculatorType: LOAN_TYPE_TO_CALC_TYPE[l.loanType] || 'Loan EMI',
                profileData: {
                    loanAmount: l.loanAmount,
                    annualRate: l.interestRate,
                    tenureMonths: l.tenureMonths,
                    emiAmount: l.emiAmount,
                    disbursementDate: l.disbursementDate,
                    emiDueDay: l.emiDueDay,
                    loanType: l.rateType,
                },
                createdAt: new Date(l.createdAt).getTime(),
                updatedAt: new Date(l.updatedAt).getTime(),
            }));
        return [...savedProfiles, ...extraFromStorage];
        // storageTick forces a re-merge after we delete a stored loan
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedProfiles, storageTick]);

    const loanProfiles = useMemo(() => allProfiles.filter(p => isLoanType(p.calculatorType)), [allProfiles]);
    const investmentProfiles = useMemo(() => allProfiles.filter(p => !isLoanType(p.calculatorType)), [allProfiles]);

    // Loan portfolio summary
    const loanSummary = useMemo(() => {
        let totalOutstanding = 0, totalEmi = 0, count = 0;
        loanProfiles.forEach(p => {
            const d = p.profileData;
            if (!d?.loanAmount) return;
            try {
                const s = calculateLiveLoanStatus({ loanAmount: d.loanAmount, annualRate: d.annualRate, tenureMonths: d.tenureMonths, emiAmount: d.emiAmount, disbursementDate: d.disbursementDate, emiDueDay: d.emiDueDay || 5, loanType: d.loanType || 'floating' });
                if (!s.loanNotStarted && !s.loanFullyPaid) {
                    totalOutstanding += s.principalOutstanding;
                    totalEmi += d.emiAmount;
                    count++;
                }
            } catch { /* skip */ }
        });
        return { totalOutstanding, totalEmi, count };
    }, [loanProfiles]);

    const handleDelete = (p: SavedLiveProfile) => {
        removeProfile(p.id);
        // Also remove from loanStorage if it exists there
        import('../utils/loanStorage').then(({ deleteLoan }) => {
            try { deleteLoan(p.id); } catch { /* ignore */ }
            // Force re-merge so the row disappears immediately
            setStorageTick(t => t + 1);
        }).catch(() => { setStorageTick(t => t + 1); });
        setMenuProfile(null);
    };

    const renderCard = (p: SavedLiveProfile, i: number) => {
        const meta = TYPE_META[p.calculatorType] || { icon: '📊', color: '#64748B', labelKey: '' };
        const metrics = computeMetrics(p, t);

        return (
            <motion.div key={p.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-2xl border shadow-sm"
                style={{ backgroundColor: c.card, borderColor: c.border }}
            >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: `${meta.color}15` }}>
                        {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate" style={{ color: c.text }}>{p.name}</h3>
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <p className="text-[10px]" style={{ color: c.textSecondary }}>{meta.labelKey ? t(meta.labelKey) : p.calculatorType}</p>
                            {(() => {
                                const startDate = getProfileStartDate(p.profileData);
                                if (!startDate) return null;
                                return (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold" style={{ backgroundColor: c.bg, color: c.textSecondary, border: `1px solid ${c.border}` }}>
                                        📅 {fmtDate(startDate)}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                    {metrics && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${meta.color}15`, color: meta.color }}>
                            {metrics.statusText}
                        </span>
                    )}
                </div>

                {/* Metrics */}
                {metrics && (
                    <>
                        <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: c.bg }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(metrics.progress, 100)}%`, backgroundColor: meta.color }} />
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {[
                                { label: metrics.label1, value: metrics.value1 },
                                { label: metrics.label2, value: metrics.value2 },
                                { label: metrics.label3, value: metrics.value3 },
                            ].map((m, j) => (
                                <div key={j} className="p-2 rounded-lg text-center" style={{ backgroundColor: c.bg }}>
                                    <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{m.label}</p>
                                    <p className="text-[11px] font-black" style={{ color: j === 0 ? c.text : meta.color }}>{m.value}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between">
                    <p className="text-[9px]" style={{ color: c.textSecondary }}>
                        {(() => {
                            const startDate = getProfileStartDate(p.profileData);
                            return startDate
                                ? t('myLoans.startedOn', { date: fmtDate(startDate) })
                                : t('liveStatus.savedOn', { date: fmtDate(p.createdAt) });
                        })()}
                    </p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/my-loans/${p.id}`)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
                            style={{ backgroundColor: meta.color }}
                        >
                            {t('myLoans.viewDetails')} <ChevronRight size={12} />
                        </button>
                        <button onClick={() => setMenuProfile(p)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    const totalTrackers = allProfiles.length;

    return (
        <div className="min-h-dvh" style={{ backgroundColor: c.bg }}>
            {/* Header */}
            <div className="sticky top-0 z-10 px-4 pt-14 pb-3 border-b" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <ArrowLeft size={18} style={{ color: c.textSecondary }} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold" style={{ color: c.text }}>{t('myLoans.title')}</h1>
                        <p className="text-[10px]" style={{ color: c.textSecondary }}>{totalTrackers} {t('myLoans.trackersActive')}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-28 pt-4 space-y-4">
                {/* Loan Portfolio Summary */}
                {loanSummary.count > 0 && (
                    <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Wallet className="w-5 h-5 text-violet-500" />
                            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>{t('myLoans.portfolioSummary')}</span>
                        </div>
                        <p className="text-2xl font-black mb-1" style={{ color: c.text }}>{formatINR(loanSummary.totalOutstanding)}</p>
                        <p className="text-[10px] mb-3" style={{ color: c.textSecondary }}>{t('myLoans.acrossLoans', { count: loanSummary.count })}</p>
                        <div className="p-3 rounded-xl" style={{ backgroundColor: c.bg }}>
                            <p className="text-[8px] uppercase font-bold" style={{ color: c.textSecondary }}>{t('myLoans.monthlyEmiBurden')}</p>
                            <p className="text-sm font-black text-violet-500">{formatINR(loanSummary.totalEmi)}<span className="text-[9px] font-normal" style={{ color: c.textSecondary }}> /{t('myLoans.perMonth')}</span></p>
                        </div>
                    </div>
                )}

                {/* Loan Trackers */}
                {loanProfiles.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <Banknote size={16} className="text-violet-500" />
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                                {t('liveStatus.myLoanTrackers')} ({loanProfiles.length})
                            </p>
                        </div>
                        <div className="space-y-3">
                            {loanProfiles.map((p, i) => renderCard(p, i))}
                        </div>
                    </div>
                )}

                {/* Credit Card Debt */}
                {(() => {
                    const ccCards = getAllCreditCards().filter(cc => cc.isActive && cc.currentBalance > 0);
                    if (ccCards.length === 0) return null;
                    const ccTotal = ccCards.reduce((s, cc) => s + cc.currentBalance, 0);
                    const ccLimit = ccCards.reduce((s, cc) => s + cc.creditLimit, 0);
                    return (
                        <div>
                            <div className="flex items-center justify-between mb-3 px-1">
                                <div className="flex items-center gap-2">
                                    <CreditCard size={16} className="text-rose-500" />
                                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                                        {t('myLoans.creditCardDebt', 'Credit Card Debt')} ({ccCards.length})
                                    </p>
                                </div>
                                <button onClick={() => navigate('/expenses')} className="text-[10px] font-bold text-brand-blue">
                                    {t('myLoans.manageCards', 'Manage')} →
                                </button>
                            </div>
                            {/* CC Summary */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="p-3 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                    <p className="text-[9px] uppercase font-bold" style={{ color: c.textMuted }}>{t('cc.totalOutstanding', 'Outstanding')}</p>
                                    <p className="text-sm font-black text-rose-500">{formatINR(ccTotal)}</p>
                                </div>
                                <div className="p-3 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                    <p className="text-[9px] uppercase font-bold" style={{ color: c.textMuted }}>{t('cc.utilization', 'Utilization')}</p>
                                    <p className="text-sm font-black" style={{ color: getUtilizationBarColor(getUtilization(ccTotal, ccLimit)) }}>
                                        {getUtilization(ccTotal, ccLimit)}%
                                    </p>
                                </div>
                            </div>
                            {/* CC Card List */}
                            <div className="space-y-2">
                                {ccCards.map(cc => {
                                    const util = getUtilization(cc.currentBalance, cc.creditLimit);
                                    const daysDue = getDaysUntilDue(cc.dueDate);
                                    return (
                                        <motion.div key={cc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            onClick={() => navigate(`/expenses/credit-cards/${cc.id}`)}
                                            className="p-3.5 rounded-xl border cursor-pointer"
                                            style={{ backgroundColor: c.card, borderColor: c.border }}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cc.cardColor || '#3b82f6' }} />
                                                    <span className="text-xs font-bold" style={{ color: c.text }}>{cc.cardName}</span>
                                                    <span className="text-[10px]" style={{ color: c.textMuted }}>{cc.bankName}</span>
                                                </div>
                                                <span className="text-[10px] font-bold" style={{ color: daysDue <= 3 ? '#ef4444' : daysDue <= 7 ? '#eab308' : '#22c55e' }}>
                                                    {daysDue <= 0 ? t('cc.dueToday', 'Due today') : `${daysDue}d`}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-rose-500">{formatINR(cc.currentBalance)}</span>
                                                <span className="text-[10px]" style={{ color: c.textSecondary }}>{cc.annualInterestRate}% APR</span>
                                            </div>
                                            <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: c.border }}>
                                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(util, 100)}%`, backgroundColor: getUtilizationBarColor(util) }} />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* Investment Trackers */}
                {investmentProfiles.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <TrendingUp size={16} className="text-emerald-500" />
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                                {t('liveStatus.myInvestmentTrackers')} ({investmentProfiles.length})
                            </p>
                        </div>
                        <div className="space-y-3">
                            {investmentProfiles.map((p, i) => renderCard(p, i))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {totalTrackers === 0 && (
                    <div className="text-center py-16">
                        <p className="text-5xl mb-4">💳</p>
                        <h3 className="text-base font-bold mb-2" style={{ color: c.text }}>{t('myLoans.emptyTitle')}</h3>
                        <p className="text-xs max-w-[260px] mx-auto mb-6" style={{ color: c.textSecondary }}>{t('myLoans.emptyDesc')}</p>
                        <button onClick={() => navigate('/calculators')}
                            className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-500 shadow-lg shadow-emerald-500/20"
                        >
                            {t('myLoans.goToCalc')}
                        </button>
                    </div>
                )}
            </div>

            {/* Delete Confirm — z-index must beat the bottom nav (z-[9999])
                otherwise the nav overlays the bottom of the sheet and the
                user ends up tapping Home/Calculate/etc. instead of Delete. */}
            <AnimatePresence>
                {menuProfile && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-[10000]" onClick={() => setMenuProfile(null)} />
                        <motion.div
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed inset-x-0 bottom-0 z-[10001] rounded-t-3xl p-5 space-y-2 mx-auto w-full max-w-[428px]"
                            style={{ backgroundColor: c.card, paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 24px)' }}
                        >
                            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto mb-3" />
                            <p className="text-sm font-bold mb-3" style={{ color: c.text }}>{menuProfile.name}</p>
                            <button onClick={() => handleDelete(menuProfile)}
                                className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-red-500/20 text-sm font-medium text-red-500 active:scale-95 transition-transform"
                            >
                                <Trash2 size={16} /> {t('myLoans.deleteTracker')}
                            </button>
                            <button onClick={() => setMenuProfile(null)}
                                className="w-full py-3 rounded-xl text-sm font-bold border mt-2 active:scale-95 transition-transform"
                                style={{ borderColor: c.border, color: c.textSecondary }}
                            >
                                {t('myLoans.cancel')}
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}