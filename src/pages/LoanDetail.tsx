import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft, IndianRupee, Calendar, BarChart3, Clock, ChevronDown, ChevronUp,
    TrendingDown, TrendingUp, Lightbulb, Trash2, CheckCircle2, Info, Download, Banknote, Target, Wallet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import { formatINR } from '../utils/calculations';
import { useLiveStatusStore, type SavedLiveProfile } from '../store/useLiveStatusStore';
import { getLoanById, deleteLoan as deleteLoanFromStorage } from '../utils/loanStorage';
import { calculateLiveLoanStatus, type LoanProfile } from '../utils/loanStatusEngine';
import {
    calculateSipStatus, calculateFdStatus, calculateRdStatus,
    calculatePpfStatus, calculateSsyStatus, calculateNscStatus,
    calculateKvpStatus, calculatePomisStatus, calculateScssStatus,
} from '../utils/investmentStatusEngine';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { exportToPDF, exportToExcel, getEnglishT, type ExportConfig } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';
import { toLocalDateStr, todayStr, parseLocalDate } from '../utils/dateUtils';

function fmtDate(d: string | number): string {
    if (!d) return '—';
    // Parse YYYY-MM-DD as a LOCAL date — new Date('YYYY-MM-DD') is parsed as
    // UTC midnight and can display the previous day in negative-UTC timezones.
    const dt = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? parseLocalDate(d) : new Date(d);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Extract the start date of a saved profile, regardless of which calculator
 * saved it. Different calculators store the start date under different field
 * names — this normalises across all of them. Returns '' if none found.
 */
function getProfileStartDate(d: any): string {
    if (!d) return '';
    return d.disbursementDate
        || d.startDate
        || d.purchaseDate
        || d.openingDate
        || '';
}

// Map LoanType (loanStorage) → calculatorType string used by isAnyLoanType
const LOAN_TYPE_TO_CALC_TYPE: Record<string, string> = {
    home_loan: 'Home Loan',
    car_loan: 'Car Loan',
    personal_loan: 'Personal Loan',
    education_loan: 'Education Loan',
    gold_loan: 'Gold Loan',
    business_loan: 'Business Loan',
    two_wheeler_loan: 'Two Wheeler Loan',
    other: 'Loan EMI',
};

// Recognise any loan-type calculator (matches MyLoans.isAnyLoanType)
function isAnyLoanCalcType(type: string): boolean {
    const t = type.toLowerCase().replace(/\s+calculator$/i, '').trim();
    return t === 'loan emi'
        || t === 'mortgage'
        || t === 'home loan'
        || t === 'car loan'
        || t === 'personal loan'
        || t === 'education loan'
        || t === 'gold loan'
        || t === 'business loan'
        || t === 'two wheeler loan';
}

function fmtYM(months: number, t?: (key: string) => string): string {
    const y = Math.floor(months / 12);
    const m = months % 12;
    const mLabel = t ? t('myLoans.fmtM') : 'm';
    const yLabel = t ? t('myLoans.fmtY') : 'y';
    if (y === 0) return `${m}${mLabel}`;
    if (m === 0) return `${y}${yLabel}`;
    return `${y}${yLabel} ${m}${mLabel}`;
}

/**
 * Returns elapsed decimal years since a YYYY-MM-DD date string, clamped
 * to [0, capYears]. Used by snapshot-tracker handlers to compute the
 * value as of today rather than the saved value at maturity.
 * Returns 0 if the date is missing/invalid or in the future.
 */
function yearsSince(dateStr: string | undefined, capYears: number = 100): number {
    if (!dateStr) return 0;
    // Use parseLocalDate for YYYY-MM-DD so timezone-negative users don't
    // see the start date shifted back by a day.
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? parseLocalDate(dateStr) : new Date(dateStr);
    const start = parsed.getTime();
    if (isNaN(start)) return 0;
    const diffMs = Date.now() - start;
    if (diffMs <= 0) return 0;
    const years = diffMs / (365.25 * 24 * 60 * 60 * 1000);
    return Math.min(capYears, years);
}

export default function LoanDetail() {
    const { loanId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const c = useAppColors();

    // Translate a label string used in investmentMetrics cards/rows/headlineLabel.
    // These labels were previously hardcoded English inside useMemo return objects.
    // Adding every variant here keeps the useMemo itself readable and avoids
    // passing `t` as a dependency (which would be a new reference every render).
    const tl = (label: string): string => {
        const map: Record<string, string> = {
            // Section headers
            'Investment Status': t('liveStatus.investmentStatus'),
            'Progress': t('liveStatus.progressSection'),
            'Complete Details': t('liveStatus.completeDetails'),
            // Card / headline labels
            'Principal': t('liveStatus.principalLabel'),
            'Value Today': t('liveStatus.valueToday'),
            'Interest': t('liveStatus.interestLabel'),
            'Invested': t('liveStatus.invested'),
            'Gain': t('liveStatus.gain'),
            'Balance': t('liveStatus.balance'),
            'Balance Today': t('liveStatus.balanceToday'),
            'Corpus Today': t('liveStatus.corpusToday'),
            'Corpus': t('liveStatus.corpusLabel'),
            'Withdrawn': t('liveStatus.withdrawn'),
            'Pension': t('liveStatus.pension'),
            'Last Salary': t('liveStatus.lastSalary'),
            'Gratuity': t('liveStatus.gratuity'),
            'Net Payout': t('liveStatus.netPayout'),
            'Cover': t('liveStatus.cover'),
            'Sum Insured': t('liveStatus.sumInsured'),
            'Premium (min)': t('liveStatus.premiumMin'),
            'Premium (max)': t('liveStatus.premiumMax'),
            'Total Cost': t('liveStatus.totalCost'),
            'Initial': t('liveStatus.initial'),
            'Final': t('liveStatus.finalLabel'),
            'CAGR': t('liveStatus.cagrLabel'),
            'Total Payable': t('liveStatus.totalPayableLabel'),
            'Deposited': t('liveStatus.deposited'),
            'Current Value': t('liveStatus.currentValue'),
            'Current Balance': t('liveStatus.currentBalance'),
            'Monthly Income': t('liveStatus.monthlyIncome') || 'Monthly Income',
            'Quarterly': t('liveStatus.quarterly'),
            'Quarterly Income': t('liveStatus.quarterlyIncome'),
            'Total Earned': t('liveStatus.totalEarned'),
            'Goal': t('liveStatus.goal'),
            'Value': t('liveStatus.value'),
            // Row labels
            'Start Date': t('liveStatus.startDateRow'),
            'Years Elapsed': t('liveStatus.yearsElapsed'),
            'Months Elapsed': t('liveStatus.monthsElapsed'),
            // NOTE: 'liveStatus.monthsRemaining' already exists in every locale as
            // the interpolated "{{months}} months remaining" string, so reusing it
            // here rendered a bare " months remaining". Unique key + EN fallback.
            'Months Remaining': t('liveStatus.stpMonthsRemainingLabel', 'Months Remaining'),
            'Transferred': t('liveStatus.transferred', 'Transferred'),
            'Source Fund': t('liveStatus.sourceFund', 'Source Fund'),
            'Target Fund': t('liveStatus.targetFund', 'Target Fund'),
            'Transfer / Month': t('liveStatus.transferPerMonth', 'Transfer / Month'),
            'Rate': t('liveStatus.rateLabel'),
            'Mode': t('liveStatus.modeLabel'),
            'Total at Maturity': t('liveStatus.totalAtMaturity'),
            'Compounding': t('liveStatus.compoundingLabel'),
            'Maturity Value': t('liveStatus.maturityValue'),
            'Basic Salary': t('liveStatus.basicSalary'),
            'Contribution': t('liveStatus.contribution'),
            'EPF Rate': t('liveStatus.epfRate'),
            'Projected Corpus': t('liveStatus.projectedCorpus'),
            'Monthly Contribution': t('liveStatus.monthlyContribution'),
            'Expected Return': t('liveStatus.expectedReturn'),
            'Annuity %': t('liveStatus.annuityPct'),
            'Projected Pension': t('liveStatus.projectedPension'),
            'Service Period': t('liveStatus.servicePeriod'),
            'Employer Type': t('liveStatus.employerType'),
            'Tax Exemption': t('liveStatus.taxExemption'),
            'Type': t('liveStatus.typeLabel'),
            'Members': t('liveStatus.membersLabel'),
            'City': t('liveStatus.cityLabel'),
            'Has PED': t('liveStatus.hasPed'),
            'Term': t('liveStatus.termLabel'),
            'Age at Purchase': t('liveStatus.ageAtPurchase'),
            'Period': t('liveStatus.periodLabel'),
            'Total Return': t('liveStatus.totalReturn'),
            'Wealth Multiplier': t('liveStatus.wealthMultiplier'),
            'Monthly Withdrawal': t('liveStatus.monthlyWithdrawal'),
            'Gratuity Payout': t('liveStatus.gratuityPayout'),
            'Property Value': t('liveStatus.propertyValue'),
            'Life Cover': t('liveStatus.lifeCover'),
            'Months Invested': t('liveStatus.monthsInvested'),
            'Return %': t('liveStatus.returnPct'),
            'Running Since': t('liveStatus.runningSince'),
            'Monthly SIP': t('liveStatus.monthlySipLabel'),
            'Days Invested': t('liveStatus.daysInvested'),
            'Daily Earning': t('liveStatus.dailyEarning'),
            'Maturity Date': t('liveStatus.maturityDate'),
            'Days Remaining': t('liveStatus.daysRemaining'),
            'Interest Rate': t('liveStatus.interestRate'),
            'Premature Value': t('liveStatus.prematureValue'),
            'Monthly Deposit': t('liveStatus.monthlyDeposit'),
            'Tenure': t('liveStatus.tenureLabel'),
            'Completion': t('liveStatus.completionPct'),
            'Year': t('liveStatus.yearLabel'),
            'Yearly Deposit': t('liveStatus.yearlyDeposit'),
            'Loan Eligible': t('liveStatus.loanEligible'),
            'Withdrawal Eligible': t('liveStatus.withdrawalEligible'),
            'Girl\'s Age': t('liveStatus.girlAge'),
            'Account Age': t('liveStatus.accountAge'),
            'Deposit Phase': t('liveStatus.depositPhase'),
            'Days to Maturity': t('liveStatus.daysToMaturity'),
            'Withdrawal': t('liveStatus.withdrawalLabel'),
            'Years Completed': t('liveStatus.yearsCompleted'),
            'Sec 80C Eligible': t('liveStatus.sec80cEligible'),
            'Progress to 2x': t('liveStatus.progressTo2x'),
            'Doubling Date': t('liveStatus.doublingDate'),
            'Days to Doubling': t('liveStatus.daysToDoubling'),
            'Maturity Amount': t('liveStatus.maturityAmount'),
            'Premature': t('liveStatus.premature'),
            'Payouts Received': t('liveStatus.payoutsReceived'),
            'Total 5yr Income': t('liveStatus.total5yrIncome'),
            'Remaining Payouts': t('liveStatus.remainingPayouts'),
            'Quarters Completed': t('liveStatus.quartersCompleted'),
            'Annual Income': t('liveStatus.annualIncome'),
            'Wealth Gained': t('liveStatus.wealthGained'),
            'Target Amount': t('liveStatus.targetAmount'),
            'Goal Progress': t('liveStatus.goalProgress'),
            'Property Type': t('liveStatus.propertyType'),
            'Total Value': t('liveStatus.totalValue'),
            'Built-up Area': t('liveStatus.builtUpArea'),
            'Days Utilized': t('liveStatus.daysUtilized'),
            'Inflation': t('liveStatus.inflationLabel'),
            'Area': t('liveStatus.area'),
            'Maturity': t('liveStatus.maturityLabel'),
            // Year-wise table column headers
            'Deposit': t('liveStatus.colDeposit', 'Deposit'),
            'Opening': t('liveStatus.colOpening', 'Opening'),
            'Closing': t('liveStatus.colClosing', 'Closing'),
            'Growth %': t('liveStatus.colGrowthPct', 'Growth %'),
            'Interest Earned': t('liveStatus.colInterestEarned', 'Interest Earned'),
            'Total Received': t('liveStatus.colTotalReceived', 'Total Received'),
            'Cumulative': t('liveStatus.colCumulative', 'Cumulative'),
            // Compounding frequency labels
            'Yearly': t('liveStatus.freqYearly', 'Yearly'),
            'Half-yearly': t('liveStatus.freqHalfYearly', 'Half-yearly'),
            'Monthly': t('liveStatus.freqMonthly', 'Monthly'),
            'Simple Interest': t('liveStatus.simpleInterest', 'Simple Interest'),
            // Action labels
            'Private': t('liveStatus.private', 'Private'),
            'Government': t('liveStatus.government', 'Government'),
            'Fully exempt': t('liveStatus.fullyExempt', 'Fully exempt'),
            'Yes': t('liveStatus.yes', 'Yes'),
            'No': t('liveStatus.no', 'No'),
            'Today': t('liveStatus.today', 'Today'),
            'sqft': t('liveStatus.sqft', 'sqft'),
            'day': t('liveStatus.dayUnit', 'day'),
        };
        return map[label] ?? label;
    };

    const { savedProfiles, removeProfile } = useLiveStatusStore();

    useEffect(() => { AnalyticsService.trackScreen('Tracker_Detail'); }, []);

    // Find profile from useLiveStatusStore first, then fallback to loanStorage
    const profile: SavedLiveProfile | null = useMemo(() => {
        const fromStore = savedProfiles.find(p => p.id === loanId);
        if (fromStore) return fromStore;
        // Fallback: check loanStorage
        const fromLoanStorage = getLoanById(loanId || '');
        if (fromLoanStorage) {
            return {
                id: fromLoanStorage.id,
                name: fromLoanStorage.nickName,
                // Preserve the loan subtype so the loan branch fires for
                // Home/Car/Personal/Education/Gold/Two-Wheeler/Business loans,
                // not just generic 'Loan EMI'
                calculatorType: LOAN_TYPE_TO_CALC_TYPE[fromLoanStorage.loanType] || 'Loan EMI',
                profileData: {
                    loanAmount: fromLoanStorage.loanAmount,
                    annualRate: fromLoanStorage.interestRate,
                    tenureMonths: fromLoanStorage.tenureMonths,
                    emiAmount: fromLoanStorage.emiAmount,
                    disbursementDate: fromLoanStorage.disbursementDate,
                    emiDueDay: fromLoanStorage.emiDueDay,
                    loanType: fromLoanStorage.rateType,
                },
                createdAt: new Date(fromLoanStorage.createdAt).getTime(),
                updatedAt: new Date(fromLoanStorage.updatedAt).getTime(),
            };
        }
        return null;
    }, [loanId, savedProfiles]);

    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    const [showAllFutureEmis, setShowAllFutureEmis] = useState(false);
    const [showYearlySummary, setShowYearlySummary] = useState(false);
    const [prepayAmount, setPrepayAmount] = useState(0);

    // ─── Derived values used by the hooks below ───
    // All hooks must run unconditionally in the same order on every render
    // (Rules of Hooks), so these are computed before ANY early return and
    // every hook below guards internally for the mode it doesn't apply to.
    const d = profile?.profileData ?? {};
    const typeLC = (profile?.calculatorType || '').toLowerCase().replace(/\s+calculator$/i, '').trim();
    // Recognise all loan subtypes (Home, Car, Personal, Education, Gold,
    // Two Wheeler, Business) — not just generic 'Loan EMI' / 'Mortgage'.
    // Overdraft is a snapshot type and goes through a separate branch below.
    const isLoan = !!profile && isAnyLoanCalcType(typeLC);

    // Live loan status — recomputed every render exactly as the loan branch
    // used to do inline. Stays null for investment-type trackers.
    let loanStatus: ReturnType<typeof calculateLiveLoanStatus> | null = null;
    if (isLoan) {
        const loanProfile: LoanProfile = {
            loanAmount: d.loanAmount, annualRate: d.annualRate, tenureMonths: d.tenureMonths,
            emiAmount: d.emiAmount, disbursementDate: d.disbursementDate,
            emiDueDay: d.emiDueDay || 5, loanType: d.loanType || 'floating',
        };
        loanStatus = calculateLiveLoanStatus(loanProfile);
    }

    // ─── Loan-branch hooks (guarded — cheap no-ops for investment trackers) ───
    const maturityDate = useMemo(() => {
        if (!isLoan) return '—';
        // Parse YYYY-MM-DD locally so the maturity month doesn't shift a day
        // back in negative-UTC timezones.
        const dt = /^\d{4}-\d{2}-\d{2}$/.test(d.disbursementDate || '') ? parseLocalDate(d.disbursementDate) : new Date(d.disbursementDate);
        dt.setMonth(dt.getMonth() + d.tenureMonths);
        return fmtDate(toLocalDateStr(dt));
    }, [isLoan, d]);

    // Amortization schedule
    const fullSchedule = useMemo(() => {
        const rows: { month: number; date: string; emi: number; interest: number; principal: number; balance: number; isPaid: boolean; isNext: boolean }[] = [];
        if (!isLoan) return rows;
        const r = d.annualRate / 12 / 100;
        let bal = d.loanAmount;
        const disbDate = /^\d{4}-\d{2}-\d{2}$/.test(d.disbursementDate || '') ? parseLocalDate(d.disbursementDate) : new Date(d.disbursementDate);
        const now = new Date(); now.setHours(0, 0, 0, 0);
        for (let m = 1; m <= d.tenureMonths; m++) {
            const emiDate = new Date(disbDate.getFullYear(), disbDate.getMonth() + m, d.emiDueDay || 5);
            const intPart = Math.round(bal * r);
            const prinPart = Math.min(d.emiAmount - intPart, bal);
            bal = Math.max(0, bal - prinPart);
            const isPaid = emiDate <= now;
            const isNext = !isPaid && (rows.length === 0 || rows[rows.length - 1].isPaid);
            rows.push({ month: m, date: toLocalDateStr(emiDate), emi: d.emiAmount, interest: intPart, principal: prinPart, balance: bal, isPaid, isNext });
        }
        return rows;
    }, [isLoan, d]);

    const yearlySummary = useMemo(() => {
        const byYear: Record<number, { totalPaid: number; principal: number; interest: number; closingBal: number }> = {};
        fullSchedule.forEach(row => {
            const yr = new Date(row.date).getFullYear();
            if (!byYear[yr]) byYear[yr] = { totalPaid: 0, principal: 0, interest: 0, closingBal: 0 };
            byYear[yr].totalPaid += row.emi;
            byYear[yr].principal += row.principal;
            byYear[yr].interest += row.interest;
            byYear[yr].closingBal = row.balance;
        });
        return Object.entries(byYear).map(([year, data]) => ({ year: Number(year), ...data }));
    }, [fullSchedule]);

    const visibleSchedule = useMemo(() => {
        if (showAllFutureEmis) return fullSchedule;
        const nextIdx = fullSchedule.findIndex(r => r.isNext);
        if (nextIdx < 0) return fullSchedule.filter(r => r.isPaid);
        return fullSchedule.slice(0, Math.min(nextIdx + 3, fullSchedule.length));
    }, [fullSchedule, showAllFutureEmis]);

    // Prepayment simulator
    const prepayResult = useMemo(() => {
        if (!isLoan || !loanStatus || prepayAmount <= 0) return null;
        const r = d.annualRate / 12 / 100;
        const newPrincipal = Math.max(0, loanStatus.principalOutstanding - prepayAmount);
        if (newPrincipal <= 0) return { interestSaved: 0, monthsReduced: loanStatus.emisRemaining, newClosureDate: tl('Today') };
        let bal = newPrincipal, newMonths = 0, newInterest = 0;
        while (bal > 0 && newMonths < d.tenureMonths) {
            const intPart = bal * r;
            const prinPart = d.emiAmount - intPart;
            if (prinPart <= 0) break;
            bal = Math.max(0, bal - prinPart);
            newInterest += intPart;
            newMonths++;
        }
        const currentRemInt = (loanStatus.emisRemaining * d.emiAmount) - loanStatus.principalOutstanding;
        const closureDate = new Date();
        closureDate.setMonth(closureDate.getMonth() + newMonths);
        return { interestSaved: Math.round(Math.max(0, currentRemInt - newInterest)), monthsReduced: Math.max(0, loanStatus.emisRemaining - newMonths), newClosureDate: fmtDate(toLocalDateStr(closureDate)) };
    }, [prepayAmount, loanStatus, d, isLoan]);

    // Normalize type matching (calculators save "SIP", "SSY", "PPF" etc.)
    const mt = (...names: string[]) => names.some(n => typeLC === n.toLowerCase());

    // Build year-wise growth table for compound-type investments
    const yearWiseTable = useMemo((): { columns: string[]; rows: Array<Array<string | number>> } => {
        if (!profile || isLoan) return { columns: [], rows: [] };
        const rate = d.rate || d.annualRate || 7;
        const startDate = d.openingDate || d.purchaseDate || d.startDate || '';
        const startYear = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();

        if (mt('ppf', 'ppf calculator')) {
            const r = rate / 100;
            const deposit = d.yearlyDeposit || 0;
            const cols = [tl('Year'), tl('Deposit'), tl('Interest'), tl('Balance')];
            const rows: Array<Array<string | number>> = [];
            let bal = 0;
            for (let y = 1; y <= 15; y++) {
                const dep = y <= 15 ? deposit : 0;
                bal += dep;
                const interest = Math.round(bal * r);
                bal += interest;
                rows.push([startYear + y - 1, formatINR(dep), formatINR(interest), formatINR(Math.round(bal))]);
            }
            return { columns: cols, rows };
        }
        if (mt('ssy', 'ssy calculator')) {
            const r = rate / 100;
            const deposit = d.yearlyDeposit || 0;
            const cols = [tl('Year'), tl('Deposit'), tl('Interest'), tl('Balance')];
            const rows: Array<Array<string | number>> = [];
            let bal = 0;
            for (let y = 1; y <= 21; y++) {
                const dep = y <= 15 ? deposit : 0;
                bal += dep;
                const interest = Math.round(bal * r);
                bal += interest;
                rows.push([startYear + y - 1, formatINR(dep), formatINR(interest), formatINR(Math.round(bal))]);
            }
            return { columns: cols, rows };
        }
        if (mt('nsc', 'nsc calculator')) {
            const r = rate / 100;
            const principal = d.principal || 0;
            const cols = [tl('Year'), tl('Opening'), tl('Interest'), tl('Closing')];
            const rows: Array<Array<string | number>> = [];
            for (let y = 1; y <= 5; y++) {
                const opening = principal * Math.pow(1 + r, y - 1);
                const closing = principal * Math.pow(1 + r, y);
                const interest = closing - opening;
                rows.push([startYear + y - 1, formatINR(Math.round(opening)), formatINR(Math.round(interest)), formatINR(Math.round(closing))]);
            }
            return { columns: cols, rows };
        }
        if (mt('kvp', 'kvp calculator')) {
            const r = rate / 100;
            const principal = d.principal || 0;
            const doublingYears = Math.ceil(Math.log(2) / Math.log(1 + r));
            const cols = [tl('Year'), tl('Value'), tl('Gain'), tl('Growth %')];
            const rows: Array<Array<string | number>> = [];
            for (let y = 1; y <= doublingYears; y++) {
                const val = principal * Math.pow(1 + r, y);
                rows.push([startYear + y - 1, formatINR(Math.round(val)), formatINR(Math.round(val - principal)), `${((val / principal - 1) * 100).toFixed(1)}%`]);
            }
            return { columns: cols, rows };
        }
        if (mt('fd', 'fd calculator', 'potd', 'post office td')) {
            const principal = d.principal || 0;
            const freq = d.compoundingFreq || 4;
            const tenureYears = Math.ceil((d.tenureMonths || 60) / 12);
            const cols = [tl('Year'), tl('Value'), tl('Interest Earned'), tl('Growth %')];
            const rows: Array<Array<string | number>> = [];
            for (let y = 1; y <= tenureYears; y++) {
                const val = principal * Math.pow(1 + (rate / 100) / freq, freq * y);
                rows.push([startYear + y - 1, formatINR(Math.round(val)), formatINR(Math.round(val - principal)), `${((val / principal - 1) * 100).toFixed(1)}%`]);
            }
            return { columns: cols, rows };
        }
        if (mt('sip', 'sip calculator', 'goal planner', 'goal')) {
            const monthly = d.monthlySip || d.monthlyAmount || 0;
            const annualReturn = d.annualReturn || 12;
            const r = annualReturn / 12 / 100;
            const cols = [tl('Year'), tl('Invested'), tl('Value'), tl('Gain')];
            const rows: Array<Array<string | number>> = [];
            for (let y = 1; y <= 10; y++) {
                const n = y * 12;
                const invested = monthly * n;
                const fv = r > 0 ? monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r) : invested;
                rows.push([startYear + y - 1, formatINR(invested), formatINR(Math.round(fv)), formatINR(Math.round(fv - invested))]);
            }
            return { columns: cols, rows };
        }
        if (mt('rd')) {
            const monthly = d.monthlyDeposit || 0;
            const tenureYears = Math.ceil((d.tenureMonths || 60) / 12);
            const r = (d.annualRate || 5.8) / 400;
            const cols = [tl('Year'), tl('Deposited'), tl('Value'), tl('Interest')];
            const rows: Array<Array<string | number>> = [];
            for (let y = 1; y <= tenureYears; y++) {
                const n = y * 12;
                const dep = monthly * n;
                let val = 0;
                for (let m = 1; m <= n; m++) {
                    const qIdx = Math.floor((n - m) / 3);
                    val += monthly * Math.pow(1 + r, qIdx);
                }
                rows.push([startYear + y - 1, formatINR(dep), formatINR(Math.round(val)), formatINR(Math.round(val - dep))]);
            }
            return { columns: cols, rows };
        }
        if (mt('pomis', 'post office mis')) {
            const principal = d.principal || 0;
            const monthlyIncome = Math.round(principal * rate / 100 / 12);
            const cols = [tl('Year'), tl('Monthly Income'), tl('Total Received'), tl('Cumulative')];
            const rows: Array<Array<string | number>> = [];
            for (let y = 1; y <= 5; y++) {
                const annualIncome = monthlyIncome * 12;
                rows.push([startYear + y - 1, formatINR(monthlyIncome), formatINR(annualIncome), formatINR(annualIncome * y)]);
            }
            return { columns: cols, rows };
        }
        if (mt('scss', 'scss calculator')) {
            const principal = d.principal || 0;
            const quarterlyIncome = Math.round(principal * rate / 100 / 4);
            const cols = [tl('Year'), tl('Quarterly Income'), tl('Annual Income'), tl('Cumulative')];
            const rows: Array<Array<string | number>> = [];
            for (let y = 1; y <= (d.tenure || 5); y++) {
                const annual = quarterlyIncome * 4;
                rows.push([startYear + y - 1, formatINR(quarterlyIncome), formatINR(annual), formatINR(annual * y)]);
            }
            return { columns: cols, rows };
        }
        return { columns: [], rows: [] };
    }, [profile, d, typeLC, isLoan]);

    // Summary metrics — now returns cards (3 hero colored boxes) + rows (details) + progress
    type MetricCard = { label: string; value: string; color: string };
    const investmentMetrics = useMemo((): { cards: MetricCard[]; rows: string[][]; progress: number; statusText: string; headline: string; headlineLabel: string } => {
        const empty = { cards: [], rows: [], progress: 0, statusText: '—', headline: '—', headlineLabel: '' };
        if (!profile || isLoan) return empty;
        try {
            if (mt('sip', 'sip calculator')) {
                const s = calculateSipStatus({ monthlySip: d.monthlySip || d.monthlyAmount || 0, annualReturn: d.annualReturn || 12, startDate: d.startDate });
                return { cards: [{ label: tl('Invested'), value: formatINR(s.totalInvested), color: '#3B82F6' }, { label: tl('Value Today'), value: formatINR(s.currentValue), color: '#10B981' }, { label: tl('Gain'), value: formatINR(s.wealthGained), color: '#F59E0B' }], rows: [[tl('Months Invested'), String(s.monthsInvested)], [tl('Return %'), `${s.returnPercent.toFixed(2)}%`], [tl('Running Since'), `${s.sipRunningYears}Y ${s.sipRunningMonths}M`], [tl('Monthly SIP'), formatINR(d.monthlySip || d.monthlyAmount || 0)], [tl('Expected Return'), `${d.annualReturn || 12}% p.a.`]], progress: Math.min(100, s.monthsInvested * 0.8), statusText: `${s.sipRunningYears}Y ${s.sipRunningMonths}M`, headline: formatINR(s.currentValue), headlineLabel: tl('Current Value') };
            }
            if (mt('fd', 'fd calculator', 'potd', 'post office td')) {
                const s = calculateFdStatus({ principal: d.principal, annualRate: d.annualRate, tenureMonths: d.tenureMonths, startDate: d.startDate, compoundingFreq: d.compoundingFreq || 4 });
                return { cards: [{ label: tl('Deposited'), value: formatINR(d.principal), color: '#3B82F6' }, { label: tl('Value Today'), value: formatINR(s.valueToday), color: '#10B981' }, { label: tl('Interest'), value: formatINR(s.interestEarnedToday), color: '#F59E0B' }], rows: [[tl('Days Invested'), String(s.daysInvested)], [tl('Daily Earning'), formatINR(s.dailyEarning)], [tl('Maturity Date'), fmtDate(s.maturityDate)], [tl('Maturity Value'), formatINR(s.maturityValue)], [tl('Days Remaining'), String(s.daysRemaining)], [tl('Interest Rate'), `${d.annualRate}% p.a.`], [tl('Premature Value'), formatINR(s.prematureValue)]], progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}% complete`, headline: formatINR(s.valueToday), headlineLabel: tl('Value Today') };
            }
            if (mt('rd')) {
                const s = calculateRdStatus({ monthlyDeposit: d.monthlyDeposit || 0, annualRate: d.annualRate || 5.8, tenureMonths: d.tenureMonths || 60, startDate: d.startDate });
                return { cards: [{ label: tl('Deposited'), value: formatINR(s.totalDeposited), color: '#3B82F6' }, { label: tl('Value Today'), value: formatINR(s.currentValue), color: '#10B981' }, { label: tl('Interest'), value: formatINR(s.interestEarned), color: '#F59E0B' }], rows: [[tl('Monthly Deposit'), formatINR(d.monthlyDeposit || 0)], [tl('Interest Rate'), `${d.annualRate || 5.8}% p.a.`], [tl('Tenure'), `${d.tenureMonths || 60} months`], [tl('Completion'), `${s.percentComplete.toFixed(1)}%`]], progress: s.percentComplete, statusText: `${s.percentComplete.toFixed(1)}% complete`, headline: formatINR(s.currentValue), headlineLabel: tl('Current Value') };
            }
            if (mt('ppf', 'ppf calculator')) {
                const s = calculatePpfStatus({ yearlyDeposit: d.yearlyDeposit || 0, rate: d.rate || d.annualRate || 7.1, openingDate: d.openingDate || d.startDate });
                return { cards: [{ label: tl('Deposited'), value: formatINR(s.totalDeposited), color: '#3B82F6' }, { label: tl('Balance'), value: formatINR(s.balanceToday), color: '#10B981' }, { label: tl('Interest'), value: formatINR(s.interestEarned), color: '#F59E0B' }], rows: [[tl('Year'), `${s.currentYear} of 15`], [tl('Yearly Deposit'), formatINR(d.yearlyDeposit || 0)], [tl('Rate'), `${d.rate || d.annualRate || 7.1}% p.a.`], [tl('Maturity Date'), fmtDate(s.maturityDate)], [tl('Maturity Value'), formatINR(s.maturityValue || 0)], [tl('Loan Eligible'), s.loanEligible ? `Yes — up to ${formatINR(s.loanAmount)}` : 'No (available yr 3-6)'], [tl('Withdrawal Eligible'), s.withdrawalEligible ? `Yes — up to ${formatINR(s.withdrawalAmount)}` : 'No (available after yr 7)']], progress: Math.min(100, (s.yearsCompleted / 15) * 100), statusText: `Year ${s.currentYear}/15`, headline: formatINR(s.balanceToday), headlineLabel: tl('Current Balance') };
            }
            if (mt('ssy', 'ssy calculator')) {
                const s = calculateSsyStatus({ yearlyDeposit: d.yearlyDeposit || 0, rate: d.rate || d.annualRate || 8.2, openingDate: d.openingDate || d.startDate, girlDob: d.girlDob || d.openingDate || d.startDate });
                return { cards: [{ label: tl('Deposited'), value: formatINR(s.totalDeposited), color: '#3B82F6' }, { label: tl('Balance'), value: formatINR(Math.round(s.balanceToday)), color: '#10B981' }, { label: tl('Interest'), value: formatINR(Math.round(s.interestEarned)), color: '#EC4899' }], rows: [[tl('Girl\'s Age'), `${s.girlAge} years`], [tl('Account Age'), `${s.accountAge} of 21 years`], [tl('Deposit Phase'), s.depositPhaseActive ? `Active (${s.depositYearsRemaining}yr left)` : 'Complete — interest compounding'], [tl('Yearly Deposit'), formatINR(d.yearlyDeposit || 0)], [tl('Rate'), `${d.rate || d.annualRate || 8.2}% p.a.`], [tl('Maturity Value'), formatINR(Math.round(s.maturityValue))], [tl('Maturity Date'), fmtDate(s.maturityDate)], [tl('Days to Maturity'), String(s.daysToMaturity)], [tl('Withdrawal'), s.withdrawalEligible ? `Eligible — up to ${formatINR(s.withdrawalAmount)}` : 'After girl turns 18']], progress: Math.min(100, (s.accountAge / 21) * 100), statusText: `Year ${s.accountAge}/21`, headline: formatINR(Math.round(s.balanceToday)), headlineLabel: tl('Current Balance') };
            }
            if (mt('nsc', 'nsc calculator')) {
                const s = calculateNscStatus({ principal: d.principal || 0, rate: d.rate || d.annualRate || 7.7, purchaseDate: d.purchaseDate || d.startDate });
                return { cards: [{ label: tl('Invested'), value: formatINR(d.principal), color: '#3B82F6' }, { label: tl('Value Today'), value: formatINR(Math.round(s.valueToday)), color: '#10B981' }, { label: tl('Interest'), value: formatINR(Math.round(s.interestEarned)), color: '#F59E0B' }], rows: [[tl('Years Completed'), `${s.yearsCompleted.toFixed(1)} of 5`], [tl('Rate'), `${d.rate || d.annualRate || 7.7}% p.a.`], [tl('Maturity Value'), formatINR(Math.round(s.maturityValue))], [tl('Maturity Date'), fmtDate(s.maturityDate)], [tl('Days Remaining'), String(s.daysToMaturity)], [tl('Sec 80C Eligible'), 'Yes — Interest reinvested']], progress: Math.min(100, (s.yearsCompleted / 5) * 100), statusText: `${(Math.min(1, s.yearsCompleted / 5) * 100).toFixed(0)}% of 5yr`, headline: formatINR(Math.round(s.valueToday)), headlineLabel: tl('Value Today') };
            }
            if (mt('kvp', 'kvp calculator')) {
                const s = calculateKvpStatus({ principal: d.principal || 0, rate: d.rate || d.annualRate || 7.5, purchaseDate: d.purchaseDate || d.startDate });
                return { cards: [{ label: tl('Invested'), value: formatINR(d.principal), color: '#3B82F6' }, { label: tl('Value Today'), value: formatINR(Math.round(s.valueToday)), color: '#10B981' }, { label: tl('Gain'), value: formatINR(Math.round(s.gainSoFar)), color: '#F59E0B' }], rows: [[tl('Progress to 2x'), `${s.progressToDoubling.toFixed(1)}%`], [tl('Rate'), `${d.rate || d.annualRate || 7.5}% p.a.`], [tl('Doubling Date'), fmtDate(s.doublingDate)], [tl('Days to Doubling'), String(s.daysToDoubling)], [tl('Maturity Amount'), formatINR(d.principal * 2)], [tl('Premature'), s.prematureEligible ? 'Eligible now' : `After ${fmtDate(s.prematureEligibleDate)}`]], progress: s.progressToDoubling, statusText: `${s.progressToDoubling.toFixed(0)}% to 2x`, headline: formatINR(Math.round(s.valueToday)), headlineLabel: tl('Value Today') };
            }
            if (mt('pomis', 'post office mis')) {
                const s = calculatePomisStatus({ principal: d.principal || 0, rate: d.rate || d.annualRate || 7.4, startDate: d.startDate });
                return { cards: [{ label: tl('Invested'), value: formatINR(d.principal), color: '#3B82F6' }, { label: tl('Monthly Income'), value: formatINR(s.monthlyIncome), color: '#10B981' }, { label: tl('Total Earned'), value: formatINR(s.totalIncomeReceived), color: '#F59E0B' }], rows: [[tl('Payouts Received'), `${s.monthsCompleted} of 60`], [tl('Rate'), `${d.rate || d.annualRate || 7.4}% p.a.`], [tl('Total 5yr Income'), formatINR(s.monthlyIncome * 60)], [tl('Remaining Payouts'), `${60 - s.monthsCompleted}`], [tl('Maturity Date'), fmtDate(s.maturityDate)]], progress: Math.min(100, (s.monthsCompleted / 60) * 100), statusText: `${s.monthsCompleted}/60 payouts`, headline: formatINR(s.monthlyIncome), headlineLabel: tl('Monthly Income') };
            }
            if (mt('scss', 'scss calculator')) {
                const s = calculateScssStatus({ principal: d.principal || 0, rate: d.rate || d.annualRate || 8.2, startDate: d.startDate, tenure: d.tenure || 5 });
                return { cards: [{ label: tl('Invested'), value: formatINR(d.principal), color: '#3B82F6' }, { label: tl('Quarterly'), value: formatINR(s.quarterlyIncome), color: '#10B981' }, { label: tl('Total Earned'), value: formatINR(s.totalIncomeReceived), color: '#F59E0B' }], rows: [[tl('Quarters Completed'), `${s.quartersCompleted} of 20`], [tl('Rate'), `${d.rate || d.annualRate || 8.2}% p.a.`], [tl('Annual Income'), formatINR(s.quarterlyIncome * 4)], [tl('Total 5yr Income'), formatINR(s.quarterlyIncome * 20)], [tl('Maturity Date'), fmtDate(s.maturityDate)]], progress: Math.min(100, (s.quartersCompleted / 20) * 100), statusText: `${s.quartersCompleted}/20 qtrs`, headline: formatINR(s.quarterlyIncome), headlineLabel: tl('Quarterly Income') };
            }
            if (mt('goal planner', 'goal')) {
                const s = calculateSipStatus({ monthlySip: d.monthlySip || d.monthlyAmount || 0, annualReturn: d.annualReturn || 12, startDate: d.startDate, targetAmount: d.targetAmount });
                return { cards: [{ label: tl('Invested'), value: formatINR(s.totalInvested), color: '#3B82F6' }, { label: tl('Value'), value: formatINR(s.currentValue), color: '#10B981' }, { label: tl('Goal'), value: `${s.progressToGoal.toFixed(0)}%`, color: '#8B5CF6' }], rows: [[tl('Wealth Gained'), formatINR(s.wealthGained)], [tl('Target Amount'), d.targetAmount ? formatINR(d.targetAmount) : '—'], [tl('Goal Progress'), `${s.progressToGoal.toFixed(1)}%`]], progress: s.progressToGoal, statusText: `${s.progressToGoal.toFixed(0)}% to goal`, headline: formatINR(s.currentValue), headlineLabel: tl('Current Value') };
            }

            // ── LIVE SNAPSHOT TRACKERS ──
            // These calculators don't have a dedicated investment engine in
            // investmentStatusEngine.ts, so we recompute "as of today" inline
            // using elapsed time from the saved start date. Falls back to the
            // saved snapshot when no start date exists (backwards compat).
            if (mt('compound interest', 'ci')) {
                const principal = d.principal || 0;
                const rate = d.rate || 0;
                const freq = d.freq || 12;
                const totalYears = d.years || 0;
                const elapsed = yearsSince(d.startDate, totalYears);
                let valueToday: number;
                let progress: number;
                let statusText: string;
                if (elapsed > 0 && rate > 0) {
                    valueToday = principal * Math.pow(1 + (rate / 100) / freq, freq * elapsed);
                    progress = totalYears > 0 ? Math.min(100, (elapsed / totalYears) * 100) : 100;
                    statusText = `${elapsed.toFixed(1)}Y of ${totalYears}Y`;
                } else {
                    valueToday = d.maturity || 0;
                    progress = 100;
                    statusText = `${totalYears}Y @ ${rate}%`;
                }
                const interest = valueToday - principal;
                const maturityAtEnd = principal * Math.pow(1 + (rate / 100) / freq, freq * totalYears);
                return {
                    cards: [
                        { label: tl('Principal'), value: formatINR(principal), color: '#3B82F6' },
                        { label: tl('Value Today'), value: formatINR(valueToday), color: '#10B981' },
                        { label: tl('Interest'), value: formatINR(interest), color: '#F59E0B' },
                    ],
                    rows: [
                        [tl('Years Elapsed'), `${elapsed.toFixed(1)} of ${totalYears}`],
                        [tl('Rate'), `${rate}% p.a.`],
                        [tl('Compounding'), freq === 1 ? tl('Yearly') : freq === 2 ? tl('Half-yearly') : freq === 4 ? tl('Quarterly') : freq === 12 ? tl('Monthly') : `${freq}x/year`],
                        [tl('Maturity Value'), formatINR(maturityAtEnd)],
                    ],
                    progress, statusText,
                    headline: formatINR(valueToday),
                    headlineLabel: tl('Value Today'),
                };
            }
            if (mt('simple interest', 'si')) {
                const principal = d.principal || 0;
                const rate = d.rate || 0;
                const totalMonths = d.tenureMonths || d.months || 0;
                const elapsedY = yearsSince(d.startDate, totalMonths / 12);
                const elapsedMonths = Math.floor(elapsedY * 12);
                let interestSoFar: number;
                let progress: number;
                let statusText: string;
                if (elapsedMonths > 0 && rate > 0) {
                    interestSoFar = (principal * rate * elapsedMonths) / (12 * 100);
                    progress = totalMonths > 0 ? Math.min(100, (elapsedMonths / totalMonths) * 100) : 100;
                    statusText = `${elapsedMonths}M of ${totalMonths}M`;
                } else {
                    interestSoFar = d.interest || 0;
                    progress = 100;
                    statusText = `${totalMonths}M @ ${rate}%`;
                }
                const valueToday = principal + interestSoFar;
                const totalAtEnd = principal + (principal * rate * totalMonths) / (12 * 100);
                return {
                    cards: [
                        { label: tl('Principal'), value: formatINR(principal), color: '#3B82F6' },
                        { label: tl('Interest'), value: formatINR(interestSoFar), color: '#F59E0B' },
                        { label: tl('Value Today'), value: formatINR(valueToday), color: '#10B981' },
                    ],
                    rows: [
                        [tl('Months Elapsed'), `${elapsedMonths} of ${totalMonths}`],
                        [tl('Rate'), `${rate}% p.a.`],
                        [tl('Mode'), d.mode || tl('Simple Interest')],
                        [tl('Total at Maturity'), formatINR(totalAtEnd)],
                    ],
                    progress, statusText,
                    headline: formatINR(valueToday),
                    headlineLabel: tl('Value Today'),
                };
            }
            // ── LUMPSUM (one-time investment, live tracker) ──
            if (mt('lumpsum')) {
                const principal = d.principal || 0;
                const rate = d.rate || 0;
                const totalYears = d.years || 0;
                const elapsed = yearsSince(d.startDate, totalYears);
                let valueToday: number;
                let progress: number;
                let statusText: string;
                if (elapsed > 0 && rate > 0) {
                    valueToday = principal * Math.pow(1 + rate / 100, elapsed);
                    progress = totalYears > 0 ? Math.min(100, (elapsed / totalYears) * 100) : 100;
                    statusText = `${elapsed.toFixed(1)}Y of ${totalYears}Y`;
                } else {
                    valueToday = d.maturity || d.fv || 0;
                    progress = 100;
                    statusText = `${totalYears}Y @ ${rate}%`;
                }
                const gain = valueToday - principal;
                const maturityAtEnd = principal * Math.pow(1 + rate / 100, totalYears);
                return {
                    cards: [
                        { label: tl('Invested'), value: formatINR(principal), color: '#3B82F6' },
                        { label: tl('Value Today'), value: formatINR(valueToday), color: '#10B981' },
                        { label: tl('Gain'), value: formatINR(gain), color: '#F59E0B' },
                    ],
                    rows: [
                        [tl('Years Elapsed'), `${elapsed.toFixed(1)} of ${totalYears}`],
                        [tl('Rate'), `${rate}% p.a.`],
                        [tl('Maturity Value'), formatINR(maturityAtEnd)],
                        ...(d.inflation ? [[tl('Inflation'), `${d.inflation}% p.a.`]] : []),
                    ],
                    progress, statusText,
                    headline: formatINR(valueToday),
                    headlineLabel: tl('Value Today'),
                };
            }
            // ── SWP (live month-by-month withdrawal sim) ──
            if (mt('swp')) {
                const corpus = d.totalInvestment || d.principal || 0;
                const monthlyWithdrawal = d.monthlyWithdrawal || 0;
                const rate = d.rate || 0;
                const totalYears = d.years || 0;
                const elapsedY = yearsSince(d.startDate, totalYears);
                let withdrawnSoFar = 0;
                let balanceToday = corpus;
                let progress: number;
                let statusText: string;
                if (elapsedY > 0 && rate > 0 && monthlyWithdrawal > 0) {
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
                    balanceToday = bal;
                    progress = totalYears > 0 ? Math.min(100, (elapsedY / totalYears) * 100) : 100;
                    statusText = `${elapsedY.toFixed(1)}Y of ${totalYears}Y`;
                } else {
                    withdrawnSoFar = d.totalWithdrawn || 0;
                    balanceToday = d.finalBalance || corpus;
                    progress = 100;
                    statusText = `${totalYears}Y @ ${rate}%`;
                }
                return {
                    cards: [
                        { label: tl('Corpus'), value: formatINR(corpus), color: '#3B82F6' },
                        { label: tl('Balance Today'), value: formatINR(balanceToday), color: '#10B981' },
                        { label: tl('Withdrawn'), value: formatINR(withdrawnSoFar), color: '#F59E0B' },
                    ],
                    rows: [
                        [tl('Years Elapsed'), `${elapsedY.toFixed(1)} of ${totalYears}`],
                        [tl('Monthly Withdrawal'), formatINR(monthlyWithdrawal)],
                        [tl('Expected Return'), `${rate}% p.a.`],
                    ],
                    progress, statusText,
                    headline: formatINR(balanceToday),
                    headlineLabel: tl('Balance Today'),
                };
            }
            // ── STP (systematic transfer plan — live month-by-month sim) ──
            if (mt('stp')) {
                const initial = d.initialAmount || 0;
                const transferAmt = d.transferAmount || 0;
                const sourceRate = d.sourceRate || 0;
                const targetRate = d.targetRate || 0;
                const totalMonths = d.durationMonths || 0;
                const elapsedY = yearsSince(d.startDate, totalMonths / 12);
                const elapsedMonths = Math.min(Math.floor(elapsedY * 12), totalMonths);
                // Same month-by-month simulation as MyLoans' STP card: source
                // grows at sourceRate, a fixed slice transfers each month,
                // target compounds at targetRate.
                let srcBal = initial;
                let tgtVal = 0;
                let transferred = 0;
                const srcR = sourceRate / 12 / 100;
                const tgtR = targetRate / 12 / 100;
                for (let i = 0; i < elapsedMonths && srcBal > 0; i++) {
                    srcBal *= (1 + srcR);
                    const xfer = Math.min(transferAmt, srcBal);
                    srcBal -= xfer;
                    transferred += xfer;
                    tgtVal = (tgtVal + xfer) * (1 + tgtR);
                }
                const totalPortfolio = srcBal + tgtVal;
                const gain = totalPortfolio - initial;
                const monthsRemaining = Math.max(0, totalMonths - elapsedMonths);
                const progress = totalMonths > 0 ? Math.min(100, (elapsedMonths / totalMonths) * 100) : 100;
                return {
                    cards: [
                        { label: tl('Invested'), value: formatINR(initial), color: '#3B82F6' },
                        { label: tl('Transferred'), value: formatINR(Math.round(transferred)), color: '#8B5CF6' },
                        { label: tl('Source Fund'), value: formatINR(Math.round(srcBal)), color: '#F59E0B' },
                        { label: tl('Target Fund'), value: formatINR(Math.round(tgtVal)), color: '#10B981' },
                        { label: tl('Gain'), value: formatINR(Math.round(gain)), color: '#06B6D4' },
                        { label: tl('Months Remaining'), value: String(monthsRemaining), color: '#6366F1' },
                    ],
                    rows: [
                        [tl('Months Elapsed'), `${elapsedMonths} of ${totalMonths}`],
                        [tl('Transfer / Month'), formatINR(transferAmt)],
                        [tl('Rate'), `${sourceRate}% → ${targetRate}% p.a.`],
                        [tl('Maturity Value'), formatINR(Math.round(d.totalPortfolioValue || 0))],
                    ],
                    progress,
                    statusText: `${elapsedMonths}M of ${totalMonths}M`,
                    headline: formatINR(Math.round(totalPortfolio)),
                    headlineLabel: tl('Total Value'),
                };
            }
            // ── CAGR (snapshot — growth-rate calculation, no time elapsed math) ──
            if (mt('cagr')) {
                const initial = d.initialValue || d.principal || 0;
                const final = d.finalValue || d.maturity || 0;
                const cagr = d.cagr ?? 0;
                const years = d.years || 0;
                return {
                    cards: [
                        { label: tl('Initial'), value: formatINR(initial), color: '#3B82F6' },
                        { label: tl('Final'), value: formatINR(final), color: '#10B981' },
                        { label: tl('CAGR'), value: `${cagr.toFixed(2)}%`, color: '#F59E0B' },
                    ],
                    rows: [
                        [tl('Period'), `${years} years`],
                        [tl('Total Return'), `${(((final / Math.max(1, initial)) - 1) * 100).toFixed(2)}%`],
                        [tl('Wealth Multiplier'), `${(final / Math.max(1, initial)).toFixed(2)}x`],
                    ],
                    progress: 100,
                    statusText: `${years}Y @ ${cagr.toFixed(1)}%`,
                    headline: `${cagr.toFixed(2)}%`,
                    headlineLabel: tl('CAGR'),
                };
            }
            // ── EPF (live month-by-month accumulation) ──
            if (mt('epf')) {
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
                const interestEarned = corpusToday - investedSoFar;
                return {
                    cards: [
                        { label: tl('Invested'), value: formatINR(investedSoFar), color: '#3B82F6' },
                        { label: tl('Corpus Today'), value: formatINR(corpusToday), color: '#10B981' },
                        { label: tl('Interest'), value: formatINR(interestEarned), color: '#F59E0B' },
                    ],
                    rows: [
                        [tl('Years Elapsed'), `${elapsedY.toFixed(1)} of ${totalYears}`],
                        [tl('Basic Salary'), formatINR(basic)],
                        [tl('Contribution'), `${empPct}% (emp + employer)`],
                        [tl('EPF Rate'), `${rate}% p.a.`],
                        ...(d.corpus ? [[tl('Projected Corpus'), formatINR(d.corpus)]] : []),
                    ],
                    progress, statusText,
                    headline: formatINR(corpusToday),
                    headlineLabel: tl('Corpus Today'),
                };
            }
            // ── NPS (live month-by-month accumulation) ──
            if (mt('nps')) {
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
                return {
                    cards: [
                        { label: tl('Invested'), value: formatINR(investedSoFar), color: '#3B82F6' },
                        { label: tl('Corpus Today'), value: formatINR(corpusToday), color: '#10B981' },
                        { label: tl('Pension'), value: formatINR(d.monthlyPension || 0), color: '#F59E0B' },
                    ],
                    rows: [
                        [tl('Years Elapsed'), `${elapsedY.toFixed(1)} of ${totalYears}`],
                        [tl('Monthly Contribution'), formatINR(monthly)],
                        [tl('Expected Return'), `${rate}% p.a.`],
                        [tl('Annuity %'), `${d.annuityPct || 40}%`],
                        ...(d.monthlyPension ? [[tl('Projected Pension'), formatINR(d.monthlyPension)]] : []),
                    ],
                    progress, statusText,
                    headline: formatINR(corpusToday),
                    headlineLabel: tl('Corpus Today'),
                };
            }
            // ── GRATUITY (snapshot — payout is one-time at retirement) ──
            if (mt('gratuity')) {
                const lastSalary = d.lastSalary || 0;
                const gratuity = d.gratuity || 0;
                const yearsOfService = d.yearsOfService || 0;
                return {
                    cards: [
                        { label: tl('Last Salary'), value: formatINR(lastSalary), color: '#3B82F6' },
                        { label: tl('Gratuity'), value: formatINR(gratuity), color: '#10B981' },
                        { label: tl('Net Payout'), value: formatINR(d.netGratuity || gratuity), color: '#F59E0B' },
                    ],
                    rows: [
                        [tl('Service Period'), `${yearsOfService} ${t('prag.years', 'years')}`],
                        [tl('Employer Type'), d.employerType === 'Govt' ? tl('Government') : tl('Private')],
                        [tl('Tax Exemption'), d.employerType === 'Govt' ? tl('Fully exempt') : `${t('liveStatus.upTo', 'Up to')} ₹25L`],
                    ],
                    progress: 100,
                    statusText: `${yearsOfService}Y ${t('liveStatus.service', 'service')}`,
                    headline: formatINR(gratuity),
                    headlineLabel: tl('Gratuity Payout'),
                };
            }
            // ── INSURANCE COMPARE (snapshot — comparison sample) ──
            if (mt('insurance compare', 'insurance comparison')) {
                const sumInsured = d.sumInsured || 0;
                const premiumA = d.premiumA || 0;
                const premiumB = d.premiumB || 0;
                return {
                    cards: [
                        { label: tl('Cover'), value: formatINR(sumInsured), color: '#10B981' },
                        { label: tl('Premium (min)'), value: formatINR(premiumA), color: '#3B82F6' },
                        { label: tl('Premium (max)'), value: formatINR(premiumB), color: '#F59E0B' },
                    ],
                    rows: [
                        [tl('Type'), d.tab === 'life' ? t('liveStatus.lifeInsurance', 'Life Insurance') : t('liveStatus.healthInsurance', 'Health Insurance')],
                        ...(d.members ? [[tl('Members'), String(d.members)]] : []),
                        ...(d.cityType ? [[tl('City'), String(d.cityType)]] : []),
                        [tl('Has PED'), d.hasPreExisting ? tl('Yes') : tl('No')],
                    ],
                    progress: 100,
                    statusText: d.tab === 'life' ? t('liveStatus.lifeCompare', 'Life Compare') : t('liveStatus.healthCompare', 'Health Compare'),
                    headline: formatINR(sumInsured),
                    headlineLabel: tl('Sum Insured'),
                };
            }
            if (mt('property')) {
                const totalCost = d.totalCost || d.propertyValue || 0;
                return {
                    cards: [
                        { label: tl('Total Cost'), value: formatINR(totalCost), color: '#F97316' },
                        { label: tl('Type'), value: d.mode || '—', color: '#3B82F6' },
                        { label: tl('Area'), value: d.area ? `${d.area} ${tl('sqft')}` : '—', color: '#10B981' },
                    ],
                    rows: [
                        [tl('Property Type'), d.mode || '—'],
                        [tl('Total Value'), formatINR(totalCost)],
                        ...(d.area ? [[tl('Built-up Area'), `${d.area} ${tl('sqft')}`]] : []),
                    ],
                    progress: 100,
                    statusText: d.mode || t('liveStatus.property', 'Property'),
                    headline: formatINR(totalCost),
                    headlineLabel: tl('Property Value'),
                };
            }
            if (mt('insurance')) {
                const sumInsured = d.sumInsured || 0;
                const premiumMin = d.premiumMin || 0;
                const premiumMax = d.premiumMax || premiumMin;
                const isLife = d.tab === 'life';
                return {
                    cards: [
                        { label: isLife ? tl('Cover') : tl('Sum Insured'), value: formatINR(sumInsured), color: '#10B981' },
                        { label: tl('Premium (min)'), value: formatINR(premiumMin), color: '#3B82F6' },
                        { label: tl('Premium (max)'), value: formatINR(premiumMax), color: '#F59E0B' },
                    ],
                    rows: [
                        [tl('Type'), isLife ? t('liveStatus.termLife', 'Term Life Insurance') : t('liveStatus.healthInsurance', 'Health Insurance')],
                        ...(isLife && d.age ? [[tl('Age at Purchase'), `${d.age} ${t('prag.years', 'years')}`]] : []),
                        ...(d.tenure ? [[tl('Term'), `${d.tenure} ${t('prag.years', 'years')}`]] : []),
                    ],
                    progress: 100,
                    statusText: isLife ? t('liveStatus.lifeCoverStatus', 'Life Cover') : t('liveStatus.healthCoverStatus', 'Health Cover'),
                    headline: formatINR(sumInsured),
                    headlineLabel: isLife ? tl('Life Cover') : tl('Sum Insured'),
                };
            }
            if (mt('overdraft', 'od')) {
                const utilized = d.utilized || d.loanAmount || 0;
                const totalInterest = d.totalInterest || 0;
                const totalPayable = d.totalPayable ?? (utilized + totalInterest);
                return {
                    cards: [
                        { label: t('liveStatus.utilized', 'Utilized'), value: formatINR(utilized), color: '#EF4444' },
                        { label: tl('Interest'), value: formatINR(totalInterest), color: '#F59E0B' },
                        { label: tl('Total Payable'), value: formatINR(totalPayable), color: '#10B981' },
                    ],
                    rows: [
                        [tl('Days Utilized'), String(d.days || 0)],
                        [tl('Rate'), `${d.rate || 0}% p.a.`],
                        [tl('Mode'), d.odType === 'business' ? t('od.typeBusiness', 'Business OD') : t('od.typePersonal', 'Personal OD')],
                    ],
                    progress: 100,
                    statusText: `${d.days || 0}d @ ${d.rate || 0}%`,
                    headline: formatINR(totalPayable),
                    headlineLabel: tl('Total Payable'),
                };
            }
        } catch { /* skip */ }
        return empty;
    }, [profile, d, typeLC, isLoan]);

    // Inject a "Start Date" row at the top of the rows array if a start date
    // exists in the saved profile data — works across every calculator type.
    const investmentMetricsWithStartDate = useMemo(() => {
        const startDate = getProfileStartDate(d);
        if (!startDate) return investmentMetrics;
        // Avoid double-injecting if a row labelled 'Start Date' already exists
        const startDateLabel = tl('Start Date');
        if (investmentMetrics.rows.some(r => r[0] === startDateLabel)) return investmentMetrics;
        return {
            ...investmentMetrics,
            rows: [[startDateLabel, fmtDate(startDate)], ...investmentMetrics.rows],
        };
    }, [investmentMetrics, d]);

    const [showYearTable, setShowYearTable] = useState(false);

    if (!profile) {
        return (
            <div className="min-h-dvh flex items-center justify-center" style={{ backgroundColor: c.bg }}>
                <div className="text-center">
                    <p className="text-4xl mb-3">😕</p>
                    <p className="text-sm font-medium" style={{ color: c.textSecondary }}>{t('myLoans.loanNotFound')}</p>
                    <button onClick={() => navigate('/my-loans')} className="mt-4 px-5 py-2 rounded-xl text-sm font-bold text-white bg-violet-600">{t('myLoans.backToLoans')}</button>
                </div>
            </div>
        );
    }

    const handleDelete = () => {
        removeProfile(profile.id);
        deleteLoanFromStorage(profile.id);
        navigate('/my-loans');
    };

    // ═══════════════════════════════════════════════════════════════
    // LOAN DETAIL
    // ═══════════════════════════════════════════════════════════════
    if (isLoan) {
        // loanStatus is always non-null when isLoan (computed above, before
        // any early return, so the hooks above run unconditionally).
        const status = loanStatus!;
        const isFloating = d.loanType === 'floating';
        const interestPct = d.emiAmount > 0 ? (status.nextEmiInterest / d.emiAmount) * 100 : 0;
        const principalPct = 100 - interestPct;
        const principalRepaidPct = ((d.loanAmount - status.principalOutstanding) / d.loanAmount) * 100;

        // Build the shared config once so PDF and Excel stay in lock-step.
        const buildLoanExportConfig = (): ExportConfig => {
            const tag = todayStr();
            const te = getEnglishT();
            return {
                title: profile.name,
                subtitle: `${te('myLoans.pdfLoanTrackerReport', 'Loan Tracker Report')} — ${fmtDate(status.today)}`,
                inputs: [
                    { label: te('myLoans.pdfLoanAmount', 'Loan Amount'), value: formatINR(d.loanAmount) },
                    { label: te('myLoans.pdfInterestRate', 'Interest Rate'), value: `${d.annualRate}% ${te('myLoans.pdfPa', 'p.a.')}` },
                    { label: te('myLoans.pdfTenure', 'Tenure'), value: `${d.tenureMonths} ${te('myLoans.pdfMonths', 'months')}` },
                    { label: 'EMI', value: formatINR(d.emiAmount) },
                    { label: te('myLoans.pdfDisbursed', 'Disbursed'), value: fmtDate(d.disbursementDate) },
                    { label: te('myLoans.pdfRateType', 'Rate Type'), value: d.loanType === 'floating' ? te('myLoans.pdfFloating', 'Floating') : te('myLoans.pdfFixed', 'Fixed') },
                ],
                results: [
                    { label: te('myLoans.pdfOutstandingPrincipal', 'Outstanding Principal'), value: formatINR(status.principalOutstanding) },
                    { label: te('myLoans.pdfEmisPaid', 'EMIs Paid'), value: `${status.emisPaid} of ${d.tenureMonths}` },
                    { label: te('myLoans.pdfTotalPaidSoFar', 'Total Paid So Far'), value: formatINR(status.totalPaidSoFar) },
                    { label: te('myLoans.pdfPrincipalPaid', 'Principal Paid'), value: formatINR(status.principalPaidSoFar) },
                    { label: te('myLoans.pdfInterestPaid', 'Interest Paid'), value: formatINR(status.interestPaidSoFar) },
                    { label: te('myLoans.pdfSettlementToday', 'Settlement Today'), value: formatINR(status.totalSettlementToday) },
                    { label: te('myLoans.pdfInterestSavedIfClose', 'Interest Saved if Close'), value: formatINR(status.interestSavedIfCloseToday) },
                    { label: te('myLoans.pdfDailyInterest', 'Daily Interest'), value: formatINR(status.dailyInterest) },
                    { label: te('myLoans.pdfProgress', 'Progress'), value: `${status.percentComplete.toFixed(1)}%` },
                ],
                projectionTitle: te('myLoans.pdfMonthWiseSchedule', 'Month-wise Amortization Schedule'),
                projectionColumns: [te('myLoans.pdfColMonth', 'Month'), te('myLoans.pdfColDate', 'Date'), 'EMI', te('myLoans.pdfColInterest', 'Interest'), te('myLoans.pdfColPrincipal', 'Principal'), te('myLoans.pdfColBalance', 'Balance')],
                projectionRows: fullSchedule.map(r => [r.month, fmtDate(r.date), formatINR(r.emi), formatINR(r.interest), formatINR(r.principal), formatINR(r.balance)]),
                additionalTables: [{
                    title: te('myLoans.pdfYearWiseSummary', 'Year-wise Summary'),
                    columns: [te('myLoans.pdfColYear', 'Year'), te('myLoans.pdfColTotalPaid', 'Total Paid'), te('myLoans.pdfColPrincipal', 'Principal'), te('myLoans.pdfColInterest', 'Interest'), te('myLoans.pdfColClosingBalance', 'Closing Balance')],
                    rows: yearlySummary.map(r => [r.year, formatINR(r.totalPaid), formatINR(r.principal), formatINR(r.interest), formatINR(r.closingBal)]),
                }],
                filename: `FinCalix_LoanTracker_${tag}`,
            };
        };
        const handleExportPDF = async () => { await exportToPDF(buildLoanExportConfig()); };
        const handleExportExcel = async () => { await exportToExcel(buildLoanExportConfig()); };

        return (
            <div className="min-h-dvh" style={{ backgroundColor: c.bg }}>
                <div className="sticky top-0 z-10 px-4 pt-14 pb-3 border-b" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate('/my-loans')} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                <ArrowLeft size={18} style={{ color: c.textSecondary }} />
                            </button>
                            <div>
                                <h1 className="text-base font-bold" style={{ color: c.text }}>{profile.name}</h1>
                                <p className="text-[10px]" style={{ color: c.textSecondary }}>{profile.calculatorType}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleExportPDF} aria-label="Download PDF" className="px-2.5 py-2 rounded-xl border text-[10px] font-bold flex items-center gap-1" style={{ backgroundColor: c.card, borderColor: c.border, color: c.textSecondary }}>
                                <Download size={14} /> PDF
                            </button>
                            <button onClick={handleExportExcel} aria-label="Download Excel" className="px-2.5 py-2 rounded-xl border text-[10px] font-bold flex items-center gap-1" style={{ backgroundColor: c.card, borderColor: c.border, color: c.textSecondary }}>
                                <Download size={14} /> XLSX
                            </button>
                        </div>
                    </div>
                </div>

                <div className="px-4 pb-28 pt-4 space-y-4">
                    {/* Live Banner */}
                    <div className="flex items-center gap-2 px-1">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                            {t('liveStatus.liveAsOf', { date: fmtDate(status.today) })}
                        </p>
                    </div>

                    {/* Close Today */}
                    {!status.loanNotStarted && !status.loanFullyPaid && (
                        <div className="p-5 rounded-2xl border-2 shadow-sm" style={{ backgroundColor: c.card, borderColor: '#10B981' }}>
                            <div className="flex items-center gap-2 mb-3">
                                <IndianRupee className="w-5 h-5 text-emerald-500" />
                                <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.closeThisLoanToday')}</h3>
                            </div>
                            <p className="text-2xl font-black text-emerald-500 mb-3">{formatINR(status.totalSettlementToday)}</p>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between"><span style={{ color: c.textSecondary }}>{t('liveStatus.principalOutstanding')}</span><span className="font-medium" style={{ color: c.text }}>{formatINR(status.principalOutstanding)}</span></div>
                                <div className="flex justify-between"><span style={{ color: c.textSecondary }}>{t('liveStatus.interestAccruedDays', { days: status.daysSinceLastEmi, rate: d.annualRate })}</span><span className="font-medium text-amber-500">+{formatINR(status.interestAccruedToday)}</span></div>
                                <div className="flex justify-between"><span style={{ color: c.textSecondary }}>{t('liveStatus.foreclosureChargeLabel', { type: isFloating ? t('liveStatus.nilRbi2014') : '3%' })}</span><span className={`font-medium ${status.foreclosureCharge > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{status.foreclosureCharge > 0 ? `+${formatINR(status.foreclosureCharge)}` : t('liveStatus.nil')}</span></div>
                            </div>
                            <p className="text-[10px] mt-3 text-center" style={{ color: c.textSecondary }}>{t('liveStatus.perDay')}: {formatINR(status.dailyInterest)}/{tl('day')}</p>
                        </div>
                    )}

                    {status.loanFullyPaid && (
                        <div className="p-5 rounded-2xl border-2" style={{ backgroundColor: '#10B98115', borderColor: '#10B98140' }}>
                            <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /><h3 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{t('liveStatus.loanFullyPaid')}</h3></div>
                        </div>
                    )}

                    {/* EMI Status */}
                    {!status.loanNotStarted && !status.loanFullyPaid && (
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <div className="flex items-center gap-2 mb-3"><Calendar className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.emiStatus')}</h3></div>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#10B98115' }}><p className="text-[9px] uppercase font-bold text-emerald-500">{t('liveStatus.emisPaidLabel')}</p><p className="text-lg font-black text-emerald-500">{status.emisPaid}</p></div>
                                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B15' }}><p className="text-[9px] uppercase font-bold text-amber-500">{t('myLoans.emisLeft')}</p><p className="text-lg font-black text-amber-500">{status.emisRemaining}</p></div>
                                <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#3B82F615' }}><p className="text-[9px] uppercase font-bold text-blue-500">{t('myLoans.nextEmiDue')}</p><p className="text-[11px] font-black text-blue-500">{fmtDate(status.nextEmiDate)}</p></div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs"><span style={{ color: c.textSecondary }}>{t('liveStatus.interestToBank')}</span><span className="font-medium text-amber-500">{formatINR(status.nextEmiInterest)} ({interestPct.toFixed(1)}%)</span></div>
                                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}><div className="h-full bg-amber-500 rounded-full" style={{ width: `${interestPct}%` }} /></div>
                                <div className="flex justify-between text-xs"><span style={{ color: c.textSecondary }}>{t('liveStatus.principalToEquity')}</span><span className="font-medium text-emerald-500">{formatINR(status.nextEmiPrincipal)} ({principalPct.toFixed(1)}%)</span></div>
                            </div>
                        </div>
                    )}

                    {/* Loan Info Card — always visible (shows disbursement / start date) */}
                    <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Info className="w-4 h-4 text-blue-500" />
                            <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.loanInfo')}</h3>
                        </div>
                        <div className="space-y-0">
                            <div className="flex justify-between py-2.5 border-b text-xs" style={{ borderColor: `${c.border}50` }}>
                                <span style={{ color: c.textSecondary }}>{t('myLoans.disbursementDate')}</span>
                                <span className="font-bold" style={{ color: c.text }}>{fmtDate(d.disbursementDate)}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b text-xs" style={{ borderColor: `${c.border}50` }}>
                                <span style={{ color: c.textSecondary }}>{t('myLoans.maturityDateLabel')}</span>
                                <span className="font-bold" style={{ color: c.text }}>{maturityDate}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b text-xs" style={{ borderColor: `${c.border}50` }}>
                                <span style={{ color: c.textSecondary }}>{t('myLoans.loanAmountLabel')}</span>
                                <span className="font-bold" style={{ color: c.text }}>{formatINR(d.loanAmount)}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b text-xs" style={{ borderColor: `${c.border}50` }}>
                                <span style={{ color: c.textSecondary }}>{t('myLoans.interestRateLabel')}</span>
                                <span className="font-bold" style={{ color: c.text }}>{d.annualRate}% {t('myLoans.pdfPa')}</span>
                            </div>
                            <div className="flex justify-between py-2.5 border-b text-xs" style={{ borderColor: `${c.border}50` }}>
                                <span style={{ color: c.textSecondary }}>{t('myLoans.tenureLabel')}</span>
                                <span className="font-bold" style={{ color: c.text }}>{d.tenureMonths} {t('myLoans.pdfMonths')}</span>
                            </div>
                            <div className="flex justify-between py-2.5 text-xs">
                                <span style={{ color: c.textSecondary }}>{t('myLoans.emiDueDayLabel')}</span>
                                <span className="font-bold" style={{ color: c.text }}>{d.emiDueDay || 5}</span>
                            </div>
                        </div>
                    </div>

                    {/* Progress */}
                    {!status.loanNotStarted && (
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <div className="flex items-center gap-2 mb-3"><BarChart3 className="w-4 h-4 text-violet-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.loanProgress')}</h3></div>
                            <div className="w-full h-3 rounded-full overflow-hidden mb-1" style={{ backgroundColor: c.bg }}><div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${Math.min(principalRepaidPct, 100)}%` }} /></div>
                            <p className="text-[9px] font-bold text-right mb-3" style={{ color: '#10B981' }}>{principalRepaidPct.toFixed(1)}% {t('myLoans.principalRepaid')}</p>
                            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                                <div><p className="font-bold" style={{ color: c.textSecondary }}>{t('myLoans.repaid')}</p><p className="font-black text-emerald-500">{formatINR(d.loanAmount - status.principalOutstanding)}</p></div>
                                <div><p className="font-bold" style={{ color: c.textSecondary }}>{t('myLoans.stillOwe')}</p><p className="font-black text-red-500">{formatINR(status.principalOutstanding)}</p></div>
                                <div><p className="font-bold" style={{ color: c.textSecondary }}>{t('myLoans.original')}</p><p className="font-black" style={{ color: c.text }}>{formatINR(d.loanAmount)}</p></div>
                            </div>
                            <div className="mt-3 pt-3 border-t" style={{ borderColor: c.border }}>
                                <div className="w-full h-2 rounded-full overflow-hidden mb-1" style={{ backgroundColor: c.bg }}><div className="h-full bg-violet-500 rounded-full" style={{ width: `${status.percentComplete}%` }} /></div>
                                <p className="text-[9px]" style={{ color: c.textSecondary }}>{status.emisPaid} {t('myLoans.monthsDone')} · {status.emisRemaining} {t('myLoans.monthsRemaining')} · {t('myLoans.closes')} {maturityDate}</p>
                            </div>
                        </div>
                    )}

                    {/* Payment History */}
                    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <button onClick={() => setShowPaymentHistory(!showPaymentHistory)} className="w-full p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.paymentHistory')}</h3></div>
                            {showPaymentHistory ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                        </button>
                        <AnimatePresence>
                            {showPaymentHistory && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 border-t overflow-x-auto" style={{ borderColor: c.border }}>
                                        <table className="w-full text-[10px] min-w-[500px] mt-2">
                                            <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-2 text-left font-bold">#</th><th className="py-2 text-left font-bold">{t('myLoans.thDate')}</th><th className="py-2 text-right font-bold">EMI</th><th className="py-2 text-right font-bold">{t('liveStatus.interestLabel')}</th><th className="py-2 text-right font-bold">{t('liveStatus.principalLabel')}</th><th className="py-2 text-right font-bold">{t('myLoans.thBalance')}</th></tr></thead>
                                            <tbody>
                                                {visibleSchedule.map(row => (
                                                    <tr key={row.month} className={row.isNext ? 'bg-blue-500/10' : row.isPaid ? '' : 'opacity-40'} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}>
                                                        <td className="py-1.5 font-medium">{row.isNext ? <span className="text-blue-500 font-bold">NEXT</span> : row.month}</td>
                                                        <td className="py-1.5" style={{ color: c.textSecondary }}>{fmtDate(row.date)}</td>
                                                        <td className="py-1.5 text-right font-medium">{formatINR(row.emi)}</td>
                                                        <td className="py-1.5 text-right text-amber-500">{formatINR(row.interest)}</td>
                                                        <td className="py-1.5 text-right text-emerald-500">{formatINR(row.principal)}</td>
                                                        <td className="py-1.5 text-right font-medium">{formatINR(row.balance)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {!showAllFutureEmis && fullSchedule.length > visibleSchedule.length && (
                                            <button onClick={() => setShowAllFutureEmis(true)} className="w-full mt-2 py-2 text-[10px] font-bold text-violet-500">{t('myLoans.showAllEmis', { count: fullSchedule.length - visibleSchedule.length })}</button>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Yearly Summary */}
                    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <button onClick={() => setShowYearlySummary(!showYearlySummary)} className="w-full p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2"><TrendingDown className="w-4 h-4 text-violet-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.yearlySummary')}</h3></div>
                            {showYearlySummary ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                        </button>
                        <AnimatePresence>
                            {showYearlySummary && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 border-t overflow-x-auto" style={{ borderColor: c.border }}>
                                        <table className="w-full text-[10px] min-w-[400px] mt-2">
                                            <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-2 text-left font-bold">{t('liveStatus.thYear')}</th><th className="py-2 text-right font-bold">{t('myLoans.thTotalPaid')}</th><th className="py-2 text-right font-bold">{t('liveStatus.principalLabel')}</th><th className="py-2 text-right font-bold">{t('liveStatus.interestLabel')}</th><th className="py-2 text-right font-bold">{t('myLoans.thBalance')}</th></tr></thead>
                                            <tbody>
                                                {yearlySummary.map(row => {
                                                    const isCurrent = row.year === new Date().getFullYear();
                                                    return (<tr key={row.year} className={isCurrent ? 'bg-violet-500/5' : ''} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}><td className={`py-1.5 font-medium ${isCurrent ? 'text-violet-500 font-bold' : ''}`}>{row.year}</td><td className="py-1.5 text-right">{formatINR(row.totalPaid)}</td><td className="py-1.5 text-right text-blue-500">{formatINR(row.principal)}</td><td className="py-1.5 text-right text-amber-500">{formatINR(row.interest)}</td><td className="py-1.5 text-right font-medium">{formatINR(row.closingBal)}</td></tr>);
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Prepayment Simulator */}
                    {!status.loanFullyPaid && !status.loanNotStarted && (
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4 text-emerald-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.whatIfPrepay')}</h3></div>
                            <NumberInput label={t('myLoans.prepayAmount')} value={prepayAmount} onChange={setPrepayAmount} min={0} max={status.principalOutstanding} prefix="₹" />
                            {prepayResult && (
                                <div className="mt-3 grid grid-cols-3 gap-2">
                                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#10B98115' }}><p className="text-[8px] uppercase font-bold text-emerald-500">{t('liveStatus.interestSaved')}</p><p className="text-[11px] font-black text-emerald-500">{formatINR(prepayResult.interestSaved)}</p></div>
                                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#3B82F615' }}><p className="text-[8px] uppercase font-bold text-blue-500">{t('myLoans.tenureReduced')}</p><p className="text-[11px] font-black text-blue-500">{fmtYM(prepayResult.monthsReduced, t)}</p></div>
                                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#8B5CF615' }}><p className="text-[8px] uppercase font-bold text-violet-500">{t('myLoans.newClosure')}</p><p className="text-[11px] font-black text-violet-500">{prepayResult.newClosureDate}</p></div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleExportPDF} className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border" style={{ borderColor: c.border, color: c.text }}><Download size={16} /> PDF</button>
                        <button onClick={handleDelete} className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-red-500/10 text-red-500 border border-red-500/20"><Trash2 size={16} /> {t('myLoans.deleteTracker')}</button>
                    </div>

                    {/* Compliance disclaimer */}
                    <DisclaimerComponent module="emi" />
                </div>
            </div>
        );
    }


    // Shared config for investment tracker exports — PDF and Excel read from
    // the same source so the numbers in both files never drift apart.
    const buildInvestmentExportConfig = (): ExportConfig => {
        const tag = todayStr();
        return {
            title: profile.name,
            subtitle: `${profile.calculatorType} — Live Status Report (${fmtDate(todayStr())})`,
            inputs: investmentMetrics.cards.map(card => ({ label: card.label, value: card.value })),
            results: [
                { label: investmentMetrics.headlineLabel, value: investmentMetrics.headline },
                { label: tl('Progress'), value: investmentMetrics.statusText },
                ...investmentMetricsWithStartDate.rows.map(([label, value]) => ({ label, value: String(value) })),
            ],
            ...(yearWiseTable.rows.length > 0 ? {
                projectionTitle: 'Year-wise Breakdown',
                projectionColumns: yearWiseTable.columns,
                projectionRows: yearWiseTable.rows,
            } : {}),
            filename: `FinCalix_${profile.calculatorType.replace(/\s+/g, '_')}_${tag}`,
        };
    };
    const handleInvestmentPDF = async () => { await exportToPDF(buildInvestmentExportConfig()); };
    const handleInvestmentExcel = async () => { await exportToExcel(buildInvestmentExportConfig()); };

    return (
        <div className="min-h-dvh" style={{ backgroundColor: c.bg }}>
            <div className="sticky top-0 z-10 px-4 pt-14 pb-3 border-b" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/my-loans')} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}><ArrowLeft size={18} style={{ color: c.textSecondary }} /></button>
                        <div>
                            <h1 className="text-base font-bold" style={{ color: c.text }}>{profile.name}</h1>
                            <p className="text-[10px]" style={{ color: c.textSecondary }}>{profile.calculatorType}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleInvestmentPDF} aria-label="Download PDF" className="px-2.5 py-2 rounded-xl border text-[10px] font-bold flex items-center gap-1" style={{ backgroundColor: c.card, borderColor: c.border, color: c.textSecondary }}>
                            <Download size={14} /> PDF
                        </button>
                        <button onClick={handleInvestmentExcel} aria-label="Download Excel" className="px-2.5 py-2 rounded-xl border text-[10px] font-bold flex items-center gap-1" style={{ backgroundColor: c.card, borderColor: c.border, color: c.textSecondary }}>
                            <Download size={14} /> XLSX
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-28 pt-4 space-y-4">
                {/* Live Banner */}
                <div className="flex items-center gap-2 px-1">
                    <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" /></span>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>{t('liveStatus.liveAsOf', { date: fmtDate(todayStr()) })}</p>
                </div>

                {/* Hero Headline Card */}
                <div className="p-5 rounded-2xl border-2 shadow-sm" style={{ backgroundColor: c.card, borderColor: '#10B981' }}>
                    <div className="flex items-center gap-2 mb-3">
                        <IndianRupee className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-sm font-bold" style={{ color: c.text }}>{investmentMetrics.headlineLabel}</h3>
                    </div>
                    <p className="text-3xl font-black text-emerald-500 mb-1">{investmentMetrics.headline}</p>
                    <p className="text-[10px]" style={{ color: c.textSecondary }}>{t('liveStatus.liveAsOf', { date: fmtDate(todayStr()) })}</p>
                </div>

                {/* 3 Colored Metric Cards (like loan EMI status) */}
                {investmentMetrics.cards.length > 0 && (
                    <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Wallet className="w-4 h-4 text-blue-500" />
                            <h3 className="text-sm font-bold" style={{ color: c.text }}>{tl('Investment Status')}</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {investmentMetrics.cards.map((card, i) => (
                                <div key={i} className="p-3 rounded-xl text-center" style={{ backgroundColor: `${card.color}15` }}>
                                    <p className="text-[9px] uppercase font-bold mb-1" style={{ color: card.color }}>{card.label}</p>
                                    <p className="text-sm font-black" style={{ color: card.color }}>{card.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Progress Card */}
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="w-4 h-4 text-violet-500" />
                        <h3 className="text-sm font-bold" style={{ color: c.text }}>{tl('Progress')}</h3>
                        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#10B98115', color: '#10B981' }}>{investmentMetrics.statusText}</span>
                    </div>
                    <div className="w-full h-3 rounded-full overflow-hidden mb-1" style={{ backgroundColor: c.bg }}>
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all" style={{ width: `${Math.min(investmentMetrics.progress, 100)}%` }} />
                    </div>
                    <div className="flex justify-between mt-1.5">
                        <span className="text-[9px] font-medium" style={{ color: c.textSecondary }}>{t('liveStatus.start', 'Start')}</span>
                        <span className="text-[9px] font-bold" style={{ color: '#10B981' }}>{Math.min(investmentMetrics.progress, 100).toFixed(1)}% {t('liveStatus.complete', 'complete')}</span>
                        <span className="text-[9px] font-medium" style={{ color: c.textSecondary }}>{tl('Maturity')}</span>
                    </div>
                </div>

                {/* Detailed Information Card */}
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4 text-blue-500" />
                        <h3 className="text-sm font-bold" style={{ color: c.text }}>{tl('Complete Details')}</h3>
                    </div>
                    <div className="space-y-0">
                        {investmentMetricsWithStartDate.rows.map(([label, value], i) => (
                            <div key={i} className="flex justify-between py-2.5 border-b text-xs" style={{ borderColor: `${c.border}50` }}>
                                <span style={{ color: c.textSecondary }}>{label}</span>
                                <span className="font-bold" style={{ color: c.text }}>{value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Year-wise Breakdown Table */}
                {yearWiseTable.rows.length > 0 && (
                    <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                        <button onClick={() => setShowYearTable(!showYearTable)} className="w-full p-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-violet-500" />
                                <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('myLoans.yearlySummary')}</h3>
                            </div>
                            {showYearTable ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                        </button>
                        <AnimatePresence>
                            {showYearTable && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                    <div className="px-4 pb-4 border-t overflow-x-auto" style={{ borderColor: c.border }}>
                                        <table className="w-full text-[10px] mt-2">
                                            <thead>
                                                <tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}>
                                                    {yearWiseTable.columns.map((col, i) => (
                                                        <th key={i} className={`py-2 font-bold ${i === 0 ? 'text-left' : 'text-right'}`}>{col}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {yearWiseTable.rows.map((row, i) => {
                                                    const isCurrent = Number(row[0]) === new Date().getFullYear();
                                                    return (
                                                        <tr key={i} className={isCurrent ? 'bg-violet-500/5' : ''} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}>
                                                            {row.map((cell, j) => (
                                                                <td key={j} className={`py-1.5 ${j === 0 ? `text-left font-medium ${isCurrent ? 'text-violet-500 font-bold' : ''}` : 'text-right'} ${j === row.length - 1 ? 'font-bold' : ''}`}>
                                                                    {cell}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* Saved Date */}
                <p className="text-[10px] text-center" style={{ color: c.textSecondary }}>{t('liveStatus.savedOn', { date: fmtDate(profile.createdAt) })}</p>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleInvestmentPDF} className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border" style={{ borderColor: c.border, color: c.text }}><Download size={16} /> PDF</button>
                    <button onClick={handleDelete} className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-red-500/10 text-red-500 border border-red-500/20"><Trash2 size={16} /> {t('myLoans.deleteTracker')}</button>
                </div>

                {/* Compliance disclaimer */}
                <DisclaimerComponent module="general" />
            </div>
        </div>
    );
}