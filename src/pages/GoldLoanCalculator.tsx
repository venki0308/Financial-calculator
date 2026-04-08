/**
 * GoldLoanCalculator.tsx — FinCalix Gold Loan Calculator
 *
 * Implements RBI Master Directions on Gold Loans (June 2025, effective April 1, 2026):
 *   - Tiered LTV: ≤ ₹2.5L → 85% | ₹2.5L–₹5L → 80% | > ₹5L → 75%
 *   - Bullet repayment max tenure: 12 months
 *   - Loans ≤ ₹2.5L: no credit check required
 *
 * Two modes:
 *   - By Gold Weight: enter weight + purity → see eligible loan
 *   - By Loan Amount: enter required loan → see grams of gold needed
 *
 * No bank/NBFC names. No live price API. No data transmission.
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, ChevronDown, ChevronUp, Lightbulb, Info, Save, Check, Share2, Gem, Coins, ShieldCheck, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { useAppColors } from '../theme/useAppColors';
import NumberInput from '../components/NumberInput';
import DateInput from '../components/DateInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import CibilBadge from '../components/CibilBadge';
import CibilAdvisoryCard from '../components/CibilAdvisoryCard';
import LiveLoanStatus from '../components/LiveLoanStatus';
import type { LoanProfile } from '../utils/loanStatusEngine';
import { calculateReducingEMI, formatINR, formatINRShort } from '../utils/calculations';
import { exportToPDF, exportToExcel, type ExportConfig } from '../utils/exportReport';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { AnalyticsService } from '../lib/analytics';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { nativeShare } from '../utils/nativeShare';
import { saveLoan as saveLoanToStorage, generateLoanId, type SavedLoan } from '../utils/loanStorage';
import { todayStr } from '../utils/dateUtils';
import { useCibil } from '../context/CibilContext';
import { useLiveStatusStore } from '../store/useLiveStatusStore';

ChartJS.register(ArcElement, Tooltip, Legend);

// ─── Constants ───────────────────────────────────────────────────────────────

type Purity = '24K' | '22K' | '20K' | '18K';
type Mode = 'byWeight' | 'byAmount';
type RepaymentMode = 'emi' | 'bullet' | 'interestOnly';

const PURITY_FACTOR: Record<Purity, number> = {
    '24K': 1.000,
    '22K': 0.916,
    '20K': 0.833,
    '18K': 0.750,
};

const PURITY_OPTIONS: { id: Purity; label: string; factorText: string }[] = [
    { id: '24K', label: '24K', factorText: '100%' },
    { id: '22K', label: '22K', factorText: '91.6%' },
    { id: '20K', label: '20K', factorText: '83.3%' },
    { id: '18K', label: '18K', factorText: '75.0%' },
];

// Default 24K rate (₹/g) — April 2026 IBJA reference (~₹14,983/g on Apr 8 2026).
// User-editable, no live API. Update this constant periodically as the floor
// drifts; users can override per-calculation in the input field.
const DEFAULT_GOLD_RATE_24K = 14983;

// RBI 2026 tier thresholds (in ₹) — effective April 1, 2026
const TIER_85_MAX = 250000;   // ≤ ₹2.5L → 85% LTV, no credit check required
const TIER_80_MAX = 500000;   // ₹2.5L–₹5L → 80% LTV
// > ₹5L → 75% LTV

// Bullet repayment max tenure per RBI Master Directions 2026
const BULLET_MAX_MONTHS = 12;
// EMI repayment max tenure (industry standard, no RBI cap for EMI loans)
const EMI_MAX_MONTHS = 36;

// ─── Real-world market limits (verified from public sources, April 2026) ──
// Sources: Muthoot, IIFL, ICICI, SBI public schedules + RBI Master Directions.
// Min: Muthoot floors at ₹1,500. Max: ICICI/HDFC/Axis cap at ₹1Cr–₹1.5Cr;
// large NBFCs effectively have no cap subject to LTV. We use ₹1.5Cr as the
// slider ceiling — beyond that the user can still type a custom amount.
const MIN_LOAN_AMOUNT = 1500;
const MAX_LOAN_AMOUNT = 15000000;       // ₹1.5 Cr

// Per RBI 2026: max 1 kg jewellery + 50g coins per borrower
const MIN_GOLD_WEIGHT = 1;
const MAX_GOLD_WEIGHT = 1000;            // 1 kg jewellery cap

// Interest rate floor: lowest market rate (Kotak ~8% / SBI ~8.25%) — set
// floor at 8% so the slider doesn't promise impossible rates.
// Ceiling 26% reflects highest mainstream NBFC rates.
const MIN_INTEREST_RATE = 8;
const MAX_INTEREST_RATE = 26;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Apply RBI 2026 tiered LTV iteratively. The LTV depends on the resulting
 * loan amount, so we test 85% first; if the loan exceeds the ₹2.5L tier, drop
 * to 80%; if still > ₹5L, drop to 75%.
 */
function computeTieredLTV(goldValue: number): { ltv: number; maxLoan: number } {
    if (goldValue <= 0) return { ltv: 85, maxLoan: 0 };

    const at85 = goldValue * 0.85;
    if (at85 <= TIER_85_MAX) return { ltv: 85, maxLoan: Math.round(at85) };

    const at80 = goldValue * 0.80;
    if (at80 <= TIER_80_MAX) return { ltv: 80, maxLoan: Math.round(at80) };

    return { ltv: 75, maxLoan: Math.round(goldValue * 0.75) };
}

interface BulletResult {
    monthlyInterest: number;
    totalInterest: number;
    totalPayment: number;
    finalMonthPayment: number;
    schedule: { month: number; openingBalance: number; payment: number; principal: number; interest: number; closingBalance: number }[];
}

/**
 * Bullet / interest-only repayment: borrower pays only interest each month
 * and the full principal at the end of the tenure.
 */
function computeBullet(principal: number, annualRate: number, months: number): BulletResult {
    if (principal <= 0 || months <= 0 || annualRate < 0) {
        return { monthlyInterest: 0, totalInterest: 0, totalPayment: 0, finalMonthPayment: 0, schedule: [] };
    }
    const monthlyInterest = Math.round(principal * (annualRate / 12 / 100));
    const totalInterest = monthlyInterest * months;
    const totalPayment = principal + totalInterest;
    const finalMonthPayment = monthlyInterest + principal;

    const schedule = [];
    for (let m = 1; m <= months; m++) {
        const isLast = m === months;
        schedule.push({
            month: m,
            openingBalance: principal,
            payment: isLast ? finalMonthPayment : monthlyInterest,
            principal: isLast ? principal : 0,
            interest: monthlyInterest,
            closingBalance: isLast ? 0 : principal,
        });
    }
    return { monthlyInterest, totalInterest, totalPayment, finalMonthPayment, schedule };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GoldLoanCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const c = useAppColors();
    useTrackCalculator();
    const { addHistory } = useCalculatorStore();
    const { profile: cibilProfile, rateFor } = useCibil();
    const addLiveProfile = useLiveStatusStore(s => s.addProfile);

    useEffect(() => { AnalyticsService.trackScreen('Gold_Loan'); }, []);

    // ── State ──
    // Defaults chosen to (a) reflect typical Indian household pledges (~50g 22K
    // jewellery → ₹6L gold value → ~₹4.8L loan at 80% LTV) and (b) land in the
    // > ₹2.5L tier so first-time users see the CIBIL badge + tiered LTV in
    // action. ₹3L loan-amount default in Mode B does the same.
    const [mode, setMode] = useState<Mode>('byWeight');
    const [goldWeight, setGoldWeight] = useState(50);
    const [purity, setPurity] = useState<Purity>('22K');
    const [goldRate24K, setGoldRate24K] = useState(DEFAULT_GOLD_RATE_24K);
    const [loanAmountNeeded, setLoanAmountNeeded] = useState(300000);
    const [interestRate, setInterestRate] = useState(11);
    const [tenureMonths, setTenureMonths] = useState(12);
    const [repaymentMode, setRepaymentMode] = useState<RepaymentMode>('emi');

    // Live loan tracker (EMI mode only — bullet/interest-only have no
    // amortising schedule for the live engine to track).
    // Empty by default so the LiveLoanStatus widget stays hidden until the
    // user actually has a disbursement date in mind.
    const [loanStartDate, setLoanStartDate] = useState('');
    const [emiDueDay, setEmiDueDay] = useState(5);

    // Charges (collapsible)
    const [showCharges, setShowCharges] = useState(false);
    const [processingFeePct, setProcessingFeePct] = useState(0.5);
    const [valuationCharges, setValuationCharges] = useState(200);
    const [storageMonthly, setStorageMonthly] = useState(100);

    // UI toggles
    const [showAmort, setShowAmort] = useState(false);
    const [showRBIRules, setShowRBIRules] = useState(false);
    const [showSensitivity, setShowSensitivity] = useState(true);
    const [calculated, setCalculated] = useState(false);
    const [loanSaved, setLoanSaved] = useState(false);

    const chartRef = useRef<any>(null);

    // ── Auto-suggest rate from CIBIL when score is present ──
    // Single source of truth: pull suggested rate from the central CIBIL
    // context (which reads LOAN_CIBIL_RATES['gold_loan']). This guarantees
    // the input field's auto-filled rate matches what the CibilBadge above
    // displays — previously they used two different hard-coded tables and
    // disagreed by 1-3 pp.
    useEffect(() => {
        if (!cibilProfile?.score || cibilProfile.isNTC) return;
        const r = rateFor('gold_loan');
        if (r && r.suggested > 0) setInterestRate(r.suggested);
    }, [cibilProfile?.score, cibilProfile?.isNTC, rateFor]);

    // ── Cap bullet/interest-only tenure at 12 months ──
    useEffect(() => {
        if ((repaymentMode === 'bullet' || repaymentMode === 'interestOnly') && tenureMonths > BULLET_MAX_MONTHS) {
            setTenureMonths(BULLET_MAX_MONTHS);
        }
    }, [repaymentMode, tenureMonths]);

    const purityFactor = PURITY_FACTOR[purity];

    // ── Computed values ──

    /** Gold market value based on inputs (mode A primary, mode B reverse) */
    const goldValue = useMemo(() => {
        if (mode === 'byWeight') {
            return Math.round(goldWeight * goldRate24K * purityFactor);
        }
        // Mode B: reverse calculation needs the user's loan need
        // We'll compute required gold below; for "valuation" display we still
        // need the gold needed to match loanAmountNeeded at max LTV.
        // First-pass: assume 85% LTV to find required value, then settle tier.
        const requiredValueAt85 = loanAmountNeeded / 0.85;
        const tier = computeTieredLTV(requiredValueAt85);
        // Use the LTV of the tier the loan falls into to compute exact value needed
        const requiredValueExact = loanAmountNeeded / (tier.ltv / 100);
        return Math.round(requiredValueExact);
    }, [mode, goldWeight, goldRate24K, purityFactor, loanAmountNeeded]);

    /** RBI 2026 tier outcome */
    const tierResult = useMemo(() => computeTieredLTV(goldValue), [goldValue]);

    /** Final loan amount: in mode A use max eligible; in mode B use what user needs */
    const loanAmount = useMemo(() => {
        if (mode === 'byWeight') return tierResult.maxLoan;
        return loanAmountNeeded;
    }, [mode, tierResult.maxLoan, loanAmountNeeded]);

    /** Mode B only: how many grams of gold the user needs to pledge */
    const requiredGoldGrams = useMemo(() => {
        if (mode !== 'byAmount' || goldRate24K <= 0 || purityFactor <= 0) return 0;
        return Math.ceil(goldValue / (goldRate24K * purityFactor) * 100) / 100;
    }, [mode, goldValue, goldRate24K, purityFactor]);

    /** EMI calculation (used for EMI mode + comparison) */
    const emiResult = useMemo(() => {
        if (loanAmount <= 0 || interestRate <= 0 || tenureMonths <= 0) return null;
        return calculateReducingEMI(loanAmount, interestRate, tenureMonths);
    }, [loanAmount, interestRate, tenureMonths]);

    /** Bullet calculation (used for bullet/interest-only mode + comparison) */
    const bulletResult = useMemo(() => {
        const cappedMonths = Math.min(tenureMonths, BULLET_MAX_MONTHS);
        return computeBullet(loanAmount, interestRate, cappedMonths);
    }, [loanAmount, interestRate, tenureMonths]);

    /** Active result based on selected repayment mode */
    const activeResult = useMemo(() => {
        if (repaymentMode === 'emi') {
            return {
                isEmi: true,
                monthly: emiResult?.emi || 0,
                totalInterest: emiResult?.totalInterest || 0,
                totalPayment: emiResult?.totalPayment || 0,
                schedule: emiResult?.schedule || [],
            };
        }
        return {
            isEmi: false,
            monthly: bulletResult.monthlyInterest,
            totalInterest: bulletResult.totalInterest,
            totalPayment: bulletResult.totalPayment,
            schedule: bulletResult.schedule,
        };
    }, [repaymentMode, emiResult, bulletResult]);

    /**
     * LiveLoanStatus profile (EMI mode only). Bullet/Interest-Only loans
     * have no amortising schedule, so the live engine cannot track them —
     * for those modes the snapshot in the results card is the source of
     * truth and we hide the LiveLoanStatus widget.
     */
    const loanProfile = useMemo<LoanProfile | null>(() => {
        if (repaymentMode !== 'emi') return null;
        if (!loanStartDate || !emiResult || emiResult.emi <= 0) return null;
        return {
            loanAmount,
            annualRate: interestRate,
            tenureMonths,
            emiAmount: emiResult.emi,
            disbursementDate: loanStartDate,
            emiDueDay,
            loanType: 'fixed',
        };
    }, [repaymentMode, loanStartDate, emiDueDay, loanAmount, interestRate, tenureMonths, emiResult]);

    /** Gold rate sensitivity table */
    const sensitivity = useMemo(() => {
        const deltas = [-10, -5, 0, 5, 10];
        return deltas.map(d => {
            const rate = Math.round(goldRate24K * (1 + d / 100));
            const value = Math.round((mode === 'byWeight' ? goldWeight : requiredGoldGrams) * rate * purityFactor);
            const tier = computeTieredLTV(value);
            return { delta: d, rate, value, ltv: tier.ltv, maxLoan: tier.maxLoan, isCurrent: d === 0 };
        });
    }, [goldRate24K, mode, goldWeight, requiredGoldGrams, purityFactor]);

    /** Charges & true cost */
    const charges = useMemo(() => {
        const procFee = Math.round(loanAmount * (processingFeePct / 100));
        const storage = storageMonthly * tenureMonths;
        const totalExtra = procFee + valuationCharges + storage;
        const trueCost = activeResult.totalInterest + totalExtra;
        return { procFee, valuation: valuationCharges, storage, totalExtra, trueCost };
    }, [loanAmount, processingFeePct, valuationCharges, storageMonthly, tenureMonths, activeResult.totalInterest]);

    /** Smart insight — picks the most relevant message based on inputs */
    const smartInsight = useMemo(() => {
        if (loanAmount <= 0) return null;
        if (loanAmount <= TIER_85_MAX) {
            return { key: 'insightNoCheck', vars: { amount: formatINR(loanAmount) } };
        }
        if (purity === '18K') {
            return { key: 'insightLowPurity', vars: {} };
        }
        if (loanAmount > TIER_85_MAX && loanAmount < TIER_85_MAX + 30000) {
            const delta = loanAmount - TIER_85_MAX + 1;
            return { key: 'insightThreshold85', vars: { delta: formatINR(delta) } };
        }
        if (loanAmount > TIER_80_MAX && loanAmount < TIER_80_MAX + 50000) {
            const delta = loanAmount - TIER_80_MAX + 1;
            return { key: 'insightThreshold80', vars: { delta: formatINR(delta) } };
        }
        if (repaymentMode === 'bullet' || repaymentMode === 'interestOnly') {
            return { key: 'insightBulletCashFlow', vars: { monthly: formatINR(bulletResult.monthlyInterest), final: formatINR(loanAmount) } };
        }
        return { key: 'insightEmiSteady', vars: { emi: formatINR(emiResult?.emi || 0) } };
    }, [loanAmount, purity, repaymentMode, bulletResult.monthlyInterest, emiResult?.emi]);

    /** Pie chart data: principal vs interest */
    const chartData = useMemo(() => ({
        labels: [t('goldLoan.principalLabel'), t('goldLoan.interestLabel')],
        datasets: [{
            data: [loanAmount, activeResult.totalInterest],
            backgroundColor: ['#10B981', '#F59E0B'],
            borderColor: ['#059669', '#D97706'],
            borderWidth: 2,
        }],
    }), [loanAmount, activeResult.totalInterest, t]);

    // ── Handlers ──

    const handleCalculate = () => {
        setCalculated(true);
        addHistory({
            id: Date.now().toString(),
            calculatorType: t('goldLoan.title'),
            timestamp: Date.now(),
            inputValues: { mode, goldWeight, purity, goldRate24K, interestRate, tenureMonths, repaymentMode, loanAmountNeeded },
            resultValues: { loanAmount, monthly: activeResult.monthly, totalInterest: activeResult.totalInterest, totalPayment: activeResult.totalPayment },
        });
    };

    const handleShare = async () => {
        const lines = [
            `🥇 ${t('goldLoan.title')}`,
            ``,
            `${t('goldLoan.weight')}: ${goldWeight}g (${purity})`,
            `${t('goldLoan.goldValue')}: ${formatINR(goldValue)}`,
            `${t('goldLoan.applicableLTV')}: ${tierResult.ltv}%`,
            `${t('goldLoan.loanAmount')}: ${formatINR(loanAmount)}`,
            `${t('goldLoan.rate')}: ${interestRate}%`,
            `${t('goldLoan.tenure')}: ${tenureMonths} ${t('goldLoan.months')}`,
            ``,
            activeResult.isEmi
                ? `${t('goldLoan.monthlyEmi')}: ${formatINR(activeResult.monthly)}`
                : `${t('goldLoan.monthlyInterest')}: ${formatINR(activeResult.monthly)}`,
            `${t('goldLoan.totalInterest')}: ${formatINR(activeResult.totalInterest)}`,
            `${t('goldLoan.totalPayment')}: ${formatINR(activeResult.totalPayment)}`,
            ``,
            `${t('goldLoan.calculatedWith')}`,
        ];
        await nativeShare(`${t('goldLoan.title')} — FinCalix`, lines.join('\n'));
    };

    /**
     * Save the calculation to My Loans tracker.
     *
     * Two save paths depending on repayment mode:
     *
     * - **EMI mode** → save to BOTH loanStorage (so it gets the full
     *   amortising live engine: principal outstanding, EMIs paid, next
     *   EMI date, foreclosure simulator) AND useLiveStatusStore (so the
     *   MyLoans page can render gold-specific metrics like weight, purity,
     *   tier LTV via the new gold-loan branch).
     *
     * - **Bullet / Interest-Only mode** → save ONLY to useLiveStatusStore
     *   as a snapshot tracker. The amortising live engine assumes
     *   `emiAmount = principal+interest` style payments and produces
     *   garbage outstanding/EMIs-paid for bullet loans. The MyLoans gold-loan
     *   branch handles bullet snapshots correctly.
     *
     * The nickName drops the gram count for Mode B (where the user entered
     * loan amount, not weight) and uses the loan amount instead.
     */
    const handleSaveToMyLoans = () => {
        const id = generateLoanId();
        const nick = mode === 'byWeight'
            ? `${goldWeight}g ${purity} ${t('goldLoan.gold')}`
            : `${formatINR(loanAmount)} ${purity} ${t('goldLoan.gold')}`;

        // Always save the rich gold-specific snapshot to the live profile
        // store so MyLoans can show purity, weight, gold value and tier LTV.
        const profileData = {
            // Standard loan fields (for the live engine in EMI mode)
            loanAmount,
            annualRate: interestRate,
            tenureMonths,
            emiAmount: activeResult.monthly,
            disbursementDate: loanStartDate || todayStr(),
            emiDueDay,
            loanType: 'fixed',
            // Gold-specific fields used by MyLoans' gold branch
            isGoldLoan: true,
            repaymentMode,                 // 'emi' | 'bullet' | 'interestOnly'
            goldWeight: mode === 'byWeight' ? goldWeight : requiredGoldGrams,
            purity,
            goldValue,
            tierLtv: tierResult.ltv,
            goldRate24K,
            // Pre-computed totals (so the snapshot path doesn't need to
            // re-run any engine for bullet mode)
            totalInterest: activeResult.totalInterest,
            totalPayment: activeResult.totalPayment,
            monthlyPayment: activeResult.monthly,
            startDate: loanStartDate || todayStr(),
        };
        addLiveProfile({
            id,
            name: nick,
            calculatorType: 'Gold Loan',
            profileData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Additionally for EMI mode, also save to loanStorage so it's part
        // of the EMI portfolio summary at the top of MyLoans (total
        // outstanding, monthly burden) and can use the full amortising
        // engine on the LoanDetail page. Use the user-supplied start date
        // and EMI due day so the live tracker math is accurate — these
        // were previously hardcoded to today/5, which broke "EMIs paid"
        // and "Next EMI date" for any loan that didn't start today.
        if (repaymentMode === 'emi') {
            const loan: SavedLoan = {
                id,
                nickName: nick,
                loanType: 'gold_loan',
                lenderName: '',
                loanAmount,
                interestRate,
                tenureMonths,
                emiAmount: activeResult.monthly,
                rateType: 'fixed',
                disbursementDate: loanStartDate || todayStr(),
                emiDueDay,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true,
            };
            saveLoanToStorage(loan);
        }
        setLoanSaved(true);
    };

    const buildExportConfig = (): ExportConfig => {
        const tag = todayStr();
        const inputs: { label: string; value: string }[] = [
            { label: t('goldLoan.mode'), value: mode === 'byWeight' ? t('goldLoan.byWeight') : t('goldLoan.byAmount') },
            { label: t('goldLoan.weight'), value: `${goldWeight} g` },
            { label: t('goldLoan.purity'), value: `${purity} (${PURITY_OPTIONS.find(p => p.id === purity)?.factorText})` },
            { label: t('goldLoan.goldRate24K'), value: `${formatINR(goldRate24K)} / g` },
            { label: t('goldLoan.repaymentMode'), value: repaymentMode === 'emi' ? t('goldLoan.modeEmi') : repaymentMode === 'bullet' ? t('goldLoan.modeBullet') : t('goldLoan.modeInterestOnly') },
            { label: t('goldLoan.rate'), value: `${interestRate}% p.a.` },
            { label: t('goldLoan.tenure'), value: `${tenureMonths} ${t('goldLoan.months')}` },
        ];
        if (mode === 'byAmount') {
            inputs.splice(1, 0, { label: t('goldLoan.loanNeeded'), value: formatINR(loanAmountNeeded) });
            inputs.splice(2, 0, { label: t('goldLoan.requiredGold'), value: `${requiredGoldGrams} g` });
        }

        const results: { label: string; value: string }[] = [
            { label: t('goldLoan.goldValue'), value: formatINR(goldValue) },
            { label: t('goldLoan.applicableLTV'), value: `${tierResult.ltv}%` },
            { label: t('goldLoan.maxEligible'), value: formatINR(tierResult.maxLoan) },
            { label: t('goldLoan.loanAmount'), value: formatINR(loanAmount) },
            { label: activeResult.isEmi ? t('goldLoan.monthlyEmi') : t('goldLoan.monthlyInterest'), value: formatINR(activeResult.monthly) },
            { label: t('goldLoan.totalInterest'), value: formatINR(activeResult.totalInterest) },
            { label: t('goldLoan.totalPayment'), value: formatINR(activeResult.totalPayment) },
            { label: t('goldLoan.processingFee'), value: formatINR(charges.procFee) },
            { label: t('goldLoan.trueCost'), value: formatINR(charges.trueCost) },
        ];

        const additionalTables = [
            {
                title: t('goldLoan.sensitivityTitle'),
                columns: [t('goldLoan.colGoldRate'), t('goldLoan.colGoldValue'), t('goldLoan.colLtv'), t('goldLoan.colMaxLoan')],
                rows: sensitivity.map(s => [`${formatINR(s.rate)}/g${s.isCurrent ? ' *' : ''}`, formatINR(s.value), `${s.ltv}%`, formatINR(s.maxLoan)]),
            },
            {
                title: t('goldLoan.comparisonTitle'),
                columns: [t('goldLoan.colMetric'), t('goldLoan.modeEmi'), t('goldLoan.modeBullet')],
                rows: [
                    [t('goldLoan.monthlyOutflow'), formatINR(emiResult?.emi || 0), formatINR(bulletResult.monthlyInterest)],
                    [t('goldLoan.totalInterest'), formatINR(emiResult?.totalInterest || 0), formatINR(bulletResult.totalInterest)],
                    [t('goldLoan.totalPayment'), formatINR(emiResult?.totalPayment || 0), formatINR(bulletResult.totalPayment)],
                ],
            },
        ];

        if (activeResult.schedule.length > 0) {
            additionalTables.push({
                title: t('goldLoan.amortTitle'),
                columns: [t('goldLoan.colMonth'), t('goldLoan.colOpening'), t('goldLoan.colPayment'), t('goldLoan.colPrincipal'), t('goldLoan.colInterest'), t('goldLoan.colClosing')],
                rows: activeResult.schedule.map(r => [
                    String(r.month),
                    formatINR(r.openingBalance ?? loanAmount),
                    formatINR(activeResult.isEmi ? (r as any).emi : (r as any).payment),
                    formatINR(r.principal),
                    formatINR(r.interest),
                    formatINR(r.closingBalance),
                ]),
            });
        }

        return {
            title: t('goldLoan.title'),
            subtitle: `${goldWeight}g ${purity} • ${repaymentMode === 'emi' ? t('goldLoan.modeEmi') : t('goldLoan.modeBullet')}`,
            inputs,
            results,
            chart: { type: 'pie', segments: [
                { label: t('goldLoan.principalLabel'), value: loanAmount, color: '#10B981' },
                { label: t('goldLoan.interestLabel'), value: activeResult.totalInterest, color: '#F59E0B' },
            ]},
            additionalTables,
            notes: t('goldLoan.pdfNotes'),
            filename: `FinCalix_GoldLoan_${tag}`,
        };
    };

    const handlePDF = async () => {
        await exportToPDF(buildExportConfig());
    };

    const handleExcel = async () => {
        await exportToExcel(buildExportConfig());
    };

    const tenureOptions = repaymentMode === 'emi' ? [3, 6, 12, 24, 36] : [3, 6, 9, 12];

    return (
        <div className="min-h-dvh" style={{ backgroundColor: c.bg }}>
            {/* ── Header ── */}
            <div className="sticky top-0 z-10 px-4 pt-14 pb-3 border-b" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <ArrowLeft size={18} style={{ color: c.textSecondary }} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: c.text }}>
                            <Gem size={18} className="text-amber-500" />
                            {t('goldLoan.title')}
                        </h1>
                        <p className="text-[10px] truncate" style={{ color: c.textSecondary }}>{t('goldLoan.subtitle')}</p>
                    </div>
                    {calculated && (
                        <button onClick={handleShare} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <Share2 size={16} style={{ color: c.textSecondary }} />
                        </button>
                    )}
                </div>
            </div>

            <div className="px-4 pb-28 pt-4 space-y-4">
                {/* ── CIBIL badge / no-credit-check banner ──
                    Per RBI 2026, gold loans ≤ ₹2.5L don't need credit checks,
                    so the CIBIL badge is hidden for small loans. We show a
                    short banner instead so users in either mode (especially
                    Mode B "By Loan Amount") understand WHY no CIBIL UI appears.
                    Above ₹2.5L the full CIBIL badge renders with rate
                    suggestions tied to the user's saved score. */}
                {loanAmount > TIER_85_MAX ? (
                    <CibilBadge loanType="gold_loan" />
                ) : loanAmount > 0 ? (
                    <div className="p-3 rounded-2xl border flex items-center gap-3" style={{ backgroundColor: '#10B98110', borderColor: '#10B98140' }}>
                        <ShieldCheck size={18} className="text-emerald-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{t('goldLoan.cibilNotNeededTitle')}</p>
                            <p className="text-[10px]" style={{ color: c.textSecondary }}>{t('goldLoan.cibilNotNeededDesc')}</p>
                        </div>
                    </div>
                ) : null}

                {/* ── Mode toggle ── */}
                <div className="flex rounded-2xl border p-1" style={{ borderColor: c.border, backgroundColor: c.card }}>
                    <button onClick={() => setMode('byWeight')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${mode === 'byWeight' ? 'bg-amber-500 text-white shadow-lg' : ''}`}
                        style={mode !== 'byWeight' ? { color: c.textSecondary } : {}}
                    >
                        <Coins size={14} /> {t('goldLoan.byWeight')}
                    </button>
                    <button onClick={() => setMode('byAmount')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${mode === 'byAmount' ? 'bg-amber-500 text-white shadow-lg' : ''}`}
                        style={mode !== 'byAmount' ? { color: c.textSecondary } : {}}
                    >
                        <Gem size={14} /> {t('goldLoan.byAmount')}
                    </button>
                </div>

                {/* ── Inputs ── */}
                <div className="p-4 rounded-2xl border shadow-sm space-y-3" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.text }}>
                        <Info size={14} className="text-amber-500" /> {t('goldLoan.goldDetails')}
                    </h3>

                    {mode === 'byWeight' ? (
                        <NumberInput label={t('goldLoan.weight')} value={goldWeight} onChange={setGoldWeight} min={MIN_GOLD_WEIGHT} max={MAX_GOLD_WEIGHT} suffix=" g" helperText={t('goldLoan.weightHelper')} />
                    ) : (
                        <NumberInput label={t('goldLoan.loanNeeded')} value={loanAmountNeeded} onChange={setLoanAmountNeeded} min={MIN_LOAN_AMOUNT} max={MAX_LOAN_AMOUNT} prefix="₹" helperText={t('goldLoan.loanNeededHelper')} />
                    )}

                    {/* Purity selector */}
                    <div>
                        <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('goldLoan.purity')}</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {PURITY_OPTIONS.map(p => (
                                <button key={p.id} onClick={() => setPurity(p.id)}
                                    className={`py-2 rounded-xl text-[11px] font-bold transition-all ${purity === p.id ? 'bg-amber-500 text-white shadow-md' : 'border'}`}
                                    style={purity !== p.id ? { borderColor: c.border, color: c.textSecondary } : {}}
                                >
                                    <div>{p.label}</div>
                                    <div className="text-[9px] opacity-80 font-medium">{p.factorText}</div>
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] mt-1.5" style={{ color: c.textSecondary }}>{t('goldLoan.purityNote')}</p>
                    </div>

                    {/* Gold rate */}
                    <NumberInput label={t('goldLoan.goldRate24K')} value={goldRate24K} onChange={setGoldRate24K} min={1000} max={20000} prefix="₹" suffix="/g" helperText={t('goldLoan.rateSourceHelper')} />

                    {/* Reverse-mode required gold display */}
                    {mode === 'byAmount' && (
                        <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B15' }}>
                            <p className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">{t('goldLoan.requiredGold')}</p>
                            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{requiredGoldGrams} g</p>
                            <p className="text-[10px] mt-0.5" style={{ color: c.textSecondary }}>{t('goldLoan.requiredGoldNote', { purity })}</p>
                        </div>
                    )}

                    {/* LTV badge */}
                    <div className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: c.border, backgroundColor: c.bg }}>
                        <div>
                            <span className="text-xs font-bold" style={{ color: c.text }}>{t('goldLoan.applicableLTV')}</span>
                            <p className="text-[9px]" style={{ color: c.textSecondary }}>{t('goldLoan.ltvNote')}</p>
                        </div>
                        <span className="text-base font-black px-3 py-1 rounded-lg" style={{ backgroundColor: '#F59E0B20', color: '#F59E0B' }}>{tierResult.ltv}%</span>
                    </div>
                </div>

                {/* ── Loan terms ── */}
                <div className="p-4 rounded-2xl border shadow-sm space-y-3" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('goldLoan.loanTerms')}</h3>

                    {/* Repayment mode segmented */}
                    <div>
                        <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('goldLoan.repaymentMode')}</label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {(['emi', 'bullet', 'interestOnly'] as const).map(rm => (
                                <button key={rm} onClick={() => setRepaymentMode(rm)}
                                    className={`py-2 rounded-xl text-[10px] font-bold transition-all ${repaymentMode === rm ? 'bg-amber-500 text-white shadow-md' : 'border'}`}
                                    style={repaymentMode !== rm ? { borderColor: c.border, color: c.textSecondary } : {}}
                                >
                                    {rm === 'emi' ? t('goldLoan.modeEmi') : rm === 'bullet' ? t('goldLoan.modeBullet') : t('goldLoan.modeInterestOnly')}
                                </button>
                            ))}
                        </div>
                        {(repaymentMode === 'bullet' || repaymentMode === 'interestOnly') && (
                            <p className="text-[10px] mt-1.5 text-amber-600 dark:text-amber-400 font-medium">{t('goldLoan.bulletCapNote')}</p>
                        )}
                    </div>

                    {/* Interest rate */}
                    <NumberInput label={t('goldLoan.rate')} value={interestRate} onChange={setInterestRate} min={MIN_INTEREST_RATE} max={MAX_INTEREST_RATE} suffix="%" step={0.25} helperText={cibilProfile?.score && !cibilProfile.isNTC ? t('goldLoan.cibilSuggestedRate') : t('goldLoan.rateRangeHint')} />

                    {/* Tenure presets */}
                    <div>
                        <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('goldLoan.tenure')}</label>
                        <div className="flex gap-1.5 flex-wrap">
                            {tenureOptions.map(m => (
                                <button key={m} onClick={() => setTenureMonths(m)}
                                    className={`flex-1 min-w-[60px] py-2 rounded-xl text-[10px] font-bold ${tenureMonths === m ? 'bg-amber-500 text-white' : 'border'}`}
                                    style={tenureMonths !== m ? { borderColor: c.border, color: c.textSecondary } : {}}
                                >{m} {t('goldLoan.months')}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Calculate button ── */}
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleCalculate}
                    className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/20">
                    {t('goldLoan.calcBtn')}
                </motion.button>

                {/* ═══ RESULTS ═══ */}
                <AnimatePresence>
                    {calculated && loanAmount > 0 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                            {/* ── Gold Valuation Summary ── */}
                            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('goldLoan.valuationSummary')}</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#F59E0B15' }}>
                                        <p className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400">{t('goldLoan.goldValue')}</p>
                                        <p className="text-sm font-black text-amber-600 dark:text-amber-400">{formatINR(goldValue)}</p>
                                    </div>
                                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#3B82F615' }}>
                                        <p className="text-[9px] uppercase font-bold text-blue-500">{t('goldLoan.applicableLTV')}</p>
                                        <p className="text-sm font-black text-blue-500">{tierResult.ltv}%</p>
                                    </div>
                                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#10B98115' }}>
                                        <p className="text-[9px] uppercase font-bold text-emerald-500">{t('goldLoan.maxEligible')}</p>
                                        <p className="text-sm font-black text-emerald-500">{formatINR(tierResult.maxLoan)}</p>
                                    </div>
                                    <div className="p-3 rounded-xl" style={{ backgroundColor: '#8B5CF615' }}>
                                        <p className="text-[9px] uppercase font-bold text-violet-500">{t('goldLoan.loanAmount')}</p>
                                        <p className="text-sm font-black text-violet-500">{formatINR(loanAmount)}</p>
                                    </div>
                                </div>
                                {mode === 'byAmount' && requiredGoldGrams > 0 && (
                                    <div className="mt-2 p-2 rounded-xl text-center" style={{ backgroundColor: c.bg }}>
                                        <span className="text-[10px]" style={{ color: c.textSecondary }}>{t('goldLoan.youNeedToPledge')} </span>
                                        <span className="text-xs font-black text-amber-500">{requiredGoldGrams} g {purity}</span>
                                    </div>
                                )}
                            </div>

                            {/* ── No-credit-check badge for loans ≤ ₹2.5L ── */}
                            {loanAmount <= TIER_85_MAX && (
                                <div className="p-3 rounded-2xl border-2 flex items-center gap-3" style={{ backgroundColor: '#10B98110', borderColor: '#10B98140' }}>
                                    <ShieldCheck size={20} className="text-emerald-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{t('goldLoan.noKycTitle')}</p>
                                        <p className="text-[10px]" style={{ color: c.textSecondary }}>{t('goldLoan.noKycDesc')}</p>
                                    </div>
                                </div>
                            )}

                            {/* ── Headline Repayment Result ── */}
                            <div className="p-5 rounded-2xl border-2 shadow-sm text-center" style={{ backgroundColor: c.card, borderColor: '#10B981' }}>
                                <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: c.textSecondary }}>
                                    {activeResult.isEmi ? t('goldLoan.monthlyEmi') : t('goldLoan.monthlyInterest')}
                                </p>
                                <p className="text-3xl font-black text-emerald-500">{formatINR(activeResult.monthly)}</p>
                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    <div className="p-2 rounded-xl" style={{ backgroundColor: '#3B82F615' }}>
                                        <p className="text-[8px] uppercase font-bold text-blue-500">{t('goldLoan.principalLabel')}</p>
                                        <p className="text-[11px] font-black text-blue-500">{formatINR(loanAmount)}</p>
                                    </div>
                                    <div className="p-2 rounded-xl" style={{ backgroundColor: '#F59E0B15' }}>
                                        <p className="text-[8px] uppercase font-bold text-amber-500">{t('goldLoan.totalInterest')}</p>
                                        <p className="text-[11px] font-black text-amber-500">{formatINR(activeResult.totalInterest)}</p>
                                    </div>
                                    <div className="p-2 rounded-xl" style={{ backgroundColor: '#10B98115' }}>
                                        <p className="text-[8px] uppercase font-bold text-emerald-500">{t('goldLoan.totalPayment')}</p>
                                        <p className="text-[11px] font-black text-emerald-500">{formatINR(activeResult.totalPayment)}</p>
                                    </div>
                                </div>
                                {!activeResult.isEmi && (
                                    <p className="text-[10px] mt-2" style={{ color: c.textSecondary }}>
                                        {t('goldLoan.bulletFinalNote', { final: formatINR(bulletResult.finalMonthPayment) })}
                                    </p>
                                )}
                            </div>

                            {/* ── Pie chart ── */}
                            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                <h3 className="text-sm font-bold mb-3 text-center" style={{ color: c.text }}>{t('goldLoan.principalVsInterest')}</h3>
                                <div className="h-48 flex items-center justify-center">
                                    <Pie ref={chartRef} data={chartData} options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { position: 'bottom', labels: { color: c.textSecondary, font: { size: 11 } } },
                                            tooltip: { enabled: true },
                                        },
                                    }} />
                                </div>
                            </div>

                            {/* ── EMI vs Bullet comparison ── */}
                            {emiResult && bulletResult.totalInterest > 0 && (
                                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                    <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('goldLoan.comparisonTitle')}</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 rounded-xl border" style={{ borderColor: '#10B98140', backgroundColor: '#10B98108' }}>
                                            <p className="text-[10px] uppercase font-bold text-emerald-500">{t('goldLoan.modeEmi')}</p>
                                            <p className="text-[10px] mt-1" style={{ color: c.textSecondary }}>{t('goldLoan.monthlyOutflow')}</p>
                                            <p className="text-sm font-black" style={{ color: c.text }}>{formatINR(emiResult.emi)}</p>
                                            <p className="text-[10px] mt-1" style={{ color: c.textSecondary }}>{t('goldLoan.totalInterest')}</p>
                                            <p className="text-xs font-bold text-emerald-500">{formatINR(emiResult.totalInterest)}</p>
                                            <p className="text-[9px] mt-2 italic" style={{ color: c.textSecondary }}>{t('goldLoan.emiBestFor')}</p>
                                        </div>
                                        <div className="p-3 rounded-xl border" style={{ borderColor: '#F59E0B40', backgroundColor: '#F59E0B08' }}>
                                            <p className="text-[10px] uppercase font-bold text-amber-500">{t('goldLoan.modeBullet')}</p>
                                            <p className="text-[10px] mt-1" style={{ color: c.textSecondary }}>{t('goldLoan.monthlyOutflow')}</p>
                                            <p className="text-sm font-black" style={{ color: c.text }}>{formatINR(bulletResult.monthlyInterest)}</p>
                                            <p className="text-[10px] mt-1" style={{ color: c.textSecondary }}>{t('goldLoan.totalInterest')}</p>
                                            <p className="text-xs font-bold text-amber-500">{formatINR(bulletResult.totalInterest)}</p>
                                            <p className="text-[9px] mt-2 italic" style={{ color: c.textSecondary }}>{t('goldLoan.bulletBestFor')}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 p-2.5 rounded-xl text-center" style={{ backgroundColor: c.bg }}>
                                        {emiResult.totalInterest < bulletResult.totalInterest ? (
                                            <p className="text-[11px] font-bold text-emerald-500">{t('goldLoan.emiSavesInterest', { amount: formatINR(bulletResult.totalInterest - emiResult.totalInterest) })}</p>
                                        ) : (
                                            <p className="text-[11px] font-bold text-amber-500">{t('goldLoan.bulletSavesCashflow', { amount: formatINR(emiResult.emi - bulletResult.monthlyInterest) })}</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Smart Insight ── */}
                            {smartInsight && (
                                <div className="p-4 rounded-2xl border-2" style={{ backgroundColor: '#F59E0B10', borderColor: '#F59E0B40' }}>
                                    <div className="flex items-start gap-2">
                                        <Lightbulb size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs" style={{ color: c.text }}>{t(`goldLoan.${smartInsight.key}`, smartInsight.vars)}</p>
                                    </div>
                                </div>
                            )}

                            {/* ── Gold Rate Sensitivity ── */}
                            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                <button onClick={() => setShowSensitivity(s => !s)} className="w-full flex items-center justify-between">
                                    <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('goldLoan.sensitivityTitle')}</h3>
                                    {showSensitivity ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                                </button>
                                {showSensitivity && (
                                    <div className="overflow-x-auto mt-3">
                                        <table className="w-full text-[10px]">
                                            <thead>
                                                <tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}>
                                                    <th className="py-1.5 text-left font-bold">{t('goldLoan.colGoldRate')}</th>
                                                    <th className="py-1.5 text-right font-bold">{t('goldLoan.colGoldValue')}</th>
                                                    <th className="py-1.5 text-right font-bold">{t('goldLoan.colLtv')}</th>
                                                    <th className="py-1.5 text-right font-bold">{t('goldLoan.colMaxLoan')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sensitivity.map(s => (
                                                    <tr key={s.delta}
                                                        style={{ borderBottom: `1px solid ${c.border}40`, backgroundColor: s.isCurrent ? '#F59E0B15' : 'transparent' }}>
                                                        <td className="py-1.5 font-medium" style={{ color: c.text }}>
                                                            {formatINR(s.rate)}/g {s.isCurrent && <span className="text-amber-500">✓</span>}
                                                        </td>
                                                        <td className="py-1.5 text-right" style={{ color: c.text }}>{formatINRShort(s.value)}</td>
                                                        <td className="py-1.5 text-right" style={{ color: c.text }}>{s.ltv}%</td>
                                                        <td className="py-1.5 text-right font-bold text-emerald-500">{formatINRShort(s.maxLoan)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* ── Charges Estimator ── */}
                            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                <button onClick={() => setShowCharges(s => !s)} className="w-full flex items-center justify-between">
                                    <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('goldLoan.chargesTitle')}</h3>
                                    {showCharges ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                                </button>
                                {showCharges && (
                                    <div className="space-y-3 mt-3">
                                        <NumberInput label={t('goldLoan.processingFeePct')} value={processingFeePct} onChange={setProcessingFeePct} min={0} max={5} step={0.1} suffix="%" />
                                        <NumberInput label={t('goldLoan.valuationCharges')} value={valuationCharges} onChange={setValuationCharges} min={0} max={1000} prefix="₹" />
                                        <NumberInput label={t('goldLoan.storageMonthly')} value={storageMonthly} onChange={setStorageMonthly} min={0} max={500} prefix="₹" suffix="/mo" />
                                        <div className="border-t pt-3 space-y-1.5 text-xs" style={{ borderColor: c.border }}>
                                            <div className="flex justify-between"><span style={{ color: c.textSecondary }}>{t('goldLoan.processingFee')}</span><span className="font-medium" style={{ color: c.text }}>{formatINR(charges.procFee)}</span></div>
                                            <div className="flex justify-between"><span style={{ color: c.textSecondary }}>{t('goldLoan.valuationCharges')}</span><span className="font-medium" style={{ color: c.text }}>{formatINR(charges.valuation)}</span></div>
                                            <div className="flex justify-between"><span style={{ color: c.textSecondary }}>{t('goldLoan.totalStorage')}</span><span className="font-medium" style={{ color: c.text }}>{formatINR(charges.storage)}</span></div>
                                            <div className="flex justify-between border-t pt-2 font-bold" style={{ borderColor: c.border, color: c.text }}>
                                                <span>{t('goldLoan.trueCost')}</span>
                                                <span className="text-amber-500">{formatINR(charges.trueCost)}</span>
                                            </div>
                                        </div>
                                        <p className="text-[9px]" style={{ color: c.textSecondary }}>{t('goldLoan.chargesNote')}</p>
                                    </div>
                                )}
                            </div>

                            {/* ── Amortisation table ── */}
                            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                <button onClick={() => setShowAmort(s => !s)} className="w-full flex items-center justify-between">
                                    <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('goldLoan.amortTitle')}</h3>
                                    {showAmort ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                                </button>
                                {showAmort && (
                                    <div className="overflow-x-auto mt-3">
                                        <table className="w-full text-[10px]">
                                            <thead>
                                                <tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}>
                                                    <th className="py-1.5 text-left font-bold">{t('goldLoan.colMonth')}</th>
                                                    <th className="py-1.5 text-right font-bold">{t('goldLoan.colPayment')}</th>
                                                    <th className="py-1.5 text-right font-bold">{t('goldLoan.colPrincipal')}</th>
                                                    <th className="py-1.5 text-right font-bold">{t('goldLoan.colInterest')}</th>
                                                    <th className="py-1.5 text-right font-bold">{t('goldLoan.colClosing')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {activeResult.schedule.map((r: any) => (
                                                    <tr key={r.month} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}>
                                                        <td className="py-1.5">{r.month}</td>
                                                        <td className="py-1.5 text-right">{formatINR(activeResult.isEmi ? r.emi : r.payment)}</td>
                                                        <td className="py-1.5 text-right">{formatINR(r.principal)}</td>
                                                        <td className="py-1.5 text-right">{formatINR(r.interest)}</td>
                                                        <td className="py-1.5 text-right">{formatINR(r.closingBalance)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* ── Live Loan Tracker ──
                                Mirrors the EMI/Mortgage calculator pattern: lets the user
                                pick a real disbursement date + EMI due day so the
                                LiveLoanStatus widget can show outstanding principal,
                                EMIs paid, next EMI date and progress in real time.
                                Date input is shown for ALL repayment modes (EMI, bullet,
                                interest-only) so the saved tracker always has the
                                user's real start date — previously the entire block was
                                gated by repaymentMode === 'emi', so bullet & interest-
                                only users had no way to record their actual start date.
                                The EMI-Due-Day picker stays gated since it only applies
                                to amortising loans. */}
                            <div className="p-4 rounded-2xl border shadow-sm space-y-3" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-amber-500" />
                                    <div>
                                        <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('goldLoan.liveTracker')}</h3>
                                        <p className="text-[10px]" style={{ color: c.textSecondary }}>{t('goldLoan.liveTrackerDesc')}</p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: c.textSecondary }}>{t('goldLoan.disbursementDate')}</label>
                                    <DateInput value={loanStartDate} onChange={setLoanStartDate} />
                                </div>
                                {loanStartDate && repaymentMode === 'emi' && (
                                    <div>
                                        <label className="text-xs font-semibold mb-1.5 block" style={{ color: c.textSecondary }}>{t('goldLoan.emiDueDay')}</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {[1, 5, 7, 10, 15].map(d => (
                                                <button key={d} onClick={() => setEmiDueDay(d)}
                                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${emiDueDay === d ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm' : 'border'}`}
                                                    style={emiDueDay !== d ? { borderColor: c.border, color: c.textSecondary, backgroundColor: c.bg } : {}}
                                                >{d}</button>
                                            ))}
                                        </div>
                                        <p className="text-[9px] mt-1" style={{ color: c.textSecondary }}>{t('goldLoan.emiDueDayHint')}</p>
                                    </div>
                                )}
                            </div>

                            {/* LiveLoanStatus widget — shows outstanding/paid/progress/etc.
                                Renders only when the user has supplied a disbursement date
                                in EMI mode. The component itself handles save-to-MyLoans. */}
                            {loanProfile && (
                                <LiveLoanStatus profile={loanProfile} loanCategory="gold_loan" />
                            )}

                            {/* CIBIL Score Advisory — full rate-impact analysis tied to
                                the user's saved CIBIL score (or NTC fallback). Renders for
                                every gold-loan calculation regardless of mode. */}
                            <CibilAdvisoryCard
                                score={cibilProfile?.score && !cibilProfile.isNTC ? cibilProfile.score : 0}
                                loanType="gold_loan"
                                loanAmount={loanAmount}
                                tenureMonths={tenureMonths}
                            />

                            {/* ── Save / Export buttons ── */}
                            <div className="grid grid-cols-2 gap-2">
                                {loanSaved ? (
                                    <button onClick={() => navigate('/my-loans')}
                                        className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs bg-emerald-500 text-white"
                                    >
                                        <Check size={14} /> {t('common.viewInMyLoans', 'View')}
                                    </button>
                                ) : (
                                    <button onClick={handleSaveToMyLoans}
                                        className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs border"
                                        style={{ borderColor: c.border, color: c.text, backgroundColor: c.card }}
                                    >
                                        <Save size={14} /> {t('goldLoan.saveToMyLoans')}
                                    </button>
                                )}
                                <button onClick={handlePDF}
                                    className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs border"
                                    style={{ borderColor: c.border, color: c.text, backgroundColor: c.card }}
                                >
                                    <Download size={14} /> {t('goldLoan.downloadPdf')}
                                </button>
                            </div>
                            <button onClick={handleExcel}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs border"
                                style={{ borderColor: c.border, color: c.text, backgroundColor: c.card }}
                            >
                                <Download size={14} /> {t('goldLoan.downloadExcel')}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── RBI 2026 rules info card (always visible, collapsed by default) ── */}
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <button onClick={() => setShowRBIRules(s => !s)} className="w-full flex items-center justify-between">
                        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: c.text }}>
                            <ShieldCheck size={14} className="text-blue-500" /> {t('goldLoan.rbiRulesTitle')}
                        </h3>
                        {showRBIRules ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                    </button>
                    {showRBIRules && (
                        <div className="space-y-2 mt-3 text-[11px]" style={{ color: c.textSecondary }}>
                            <div>
                                <p className="font-bold" style={{ color: c.text }}>{t('goldLoan.rbiLtvTitle')}</p>
                                <ul className="list-disc list-inside space-y-0.5 ml-1">
                                    <li>{t('goldLoan.rbiTier1')}</li>
                                    <li>{t('goldLoan.rbiTier2')}</li>
                                    <li>{t('goldLoan.rbiTier3')}</li>
                                </ul>
                            </div>
                            <p>• <span className="font-bold" style={{ color: c.text }}>{t('goldLoan.rbiBulletCap')}</span></p>
                            <p>• <span className="font-bold" style={{ color: c.text }}>{t('goldLoan.rbiGoldReturn')}</span></p>
                            <p>• <span className="font-bold" style={{ color: c.text }}>{t('goldLoan.rbiAcceptedGold')}</span></p>
                            <p>• <span className="font-bold" style={{ color: c.text }}>{t('goldLoan.rbiMaxPledge')}</span></p>
                            <p>• <span className="font-bold" style={{ color: c.text }}>{t('goldLoan.rbiValuationBasis')}</span></p>
                            <p className="italic pt-2 border-t" style={{ borderColor: c.border }}>{t('goldLoan.rbiSource')}</p>
                        </div>
                    )}
                </div>

                {/* ── Disclaimer ── */}
                <DisclaimerComponent module="goldLoan" />
            </div>
        </div>
    );
}
