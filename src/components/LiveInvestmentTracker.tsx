/**
 * LiveInvestmentTracker — investment-side counterpart to LiveLoanStatus.
 *
 * Renders the same 4-section "live as of today" UI that loan calculators
 * get when the user picks a disbursement date, but for investments. Used
 * by Compound Interest, Simple Interest, Lumpsum, SWP, EPF, NPS calculators.
 *
 * Sections:
 *  1. Investment Journey  — started date, time elapsed, time remaining, progress bar
 *  2. Earned Till Date    — invested so far, value today, gain/interest
 *  3. What You'll Get     — projected maturity value, value remaining to earn
 *  4. Next Milestone      — next anniversary / next compounding tick
 *
 * Five modes:
 *  - 'compound'  : single-deposit compound interest (P × (1 + r/n)^(n × t))
 *  - 'simple'    : single-deposit simple interest (P + P×r×t)
 *  - 'lumpsum'   : same as compound but annual freq (alias)
 *  - 'recurring' : monthly contribution accumulating at r/12 (EPF, NPS)
 *  - 'swp'       : reverse — corpus depleting via monthly withdrawals
 *
 * Component is purely presentational. The parent calculator owns the
 * useState for startDate; this component reads it via props and
 * recomputes elapsed time + value-as-of-today on every render.
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Banknote, Target, Calendar, TrendingUp } from 'lucide-react';
import { useAppColors } from '../theme/useAppColors';
import { formatINR } from '../utils/calculations';

function fmtDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function yearsBetween(start: string, end: Date = new Date()): number {
    if (!start) return 0;
    const s = new Date(start).getTime();
    if (isNaN(s)) return 0;
    const diff = end.getTime() - s;
    if (diff <= 0) return 0;
    return diff / (365.25 * 24 * 60 * 60 * 1000);
}

function fmtYearsMonths(years: number): string {
    const totalMonths = Math.round(years * 12);
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    if (y === 0) return `${m}m`;
    if (m === 0) return `${y}y`;
    return `${y}y ${m}m`;
}

export type TrackerMode = 'compound' | 'simple' | 'lumpsum' | 'recurring' | 'swp';

interface Props {
    /** Discriminator that picks the math engine. */
    mode: TrackerMode;
    /** YYYY-MM-DD start date. Empty string = show "pick a date" placeholder. */
    startDate: string;
    /** Total plan duration in years. */
    totalYears: number;
    /** Annual rate of return (e.g. 12 for 12%). */
    rate: number;
    /** One-time amount for compound/simple/lumpsum. */
    principal?: number;
    /** Monthly contribution for recurring (EPF total emp+employer, NPS contribution). */
    monthlyContribution?: number;
    /** Monthly withdrawal for SWP. */
    monthlyWithdrawal?: number;
    /** Compounding frequency for compound mode (default 12 = monthly). */
    freq?: number;
    /** Pre-computed projected maturity value at end of plan (used for "What You'll Get"). */
    projectedMaturity?: number;
    /** Display name shown in the header. */
    label?: string;
}

interface ComputedStatus {
    elapsed: number;             // years since start
    remaining: number;           // years until end
    percentComplete: number;
    investedSoFar: number;
    valueToday: number;
    gainSoFar: number;
    projectedFinal: number;
    nextMilestoneDate: Date;
    nextMilestoneLabel: string;
    daysToNextMilestone: number;
    // SWP-specific
    withdrawnSoFar?: number;
    balanceRemaining?: number;
    monthsRemaining?: number;
}

export default function LiveInvestmentTracker(props: Props) {
    const { t } = useTranslation();
    const c = useAppColors();
    const { mode, startDate, totalYears, rate, principal = 0, monthlyContribution = 0,
        monthlyWithdrawal = 0, freq = 12, projectedMaturity, label } = props;

    // ── Empty state: user hasn't picked a date yet ───────────────────────────
    if (!startDate) {
        return (
            <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-violet-500" />
                    <h3 className="font-bold text-sm" style={{ color: c.text }}>
                        {label || t('liveInvest.title', 'Live Investment Tracker')}
                    </h3>
                </div>
                <p className="text-sm" style={{ color: c.textSecondary }}>
                    {t('liveInvest.pickDateHint', 'Pick a start date above to see your live investment status.')}
                </p>
            </div>
        );
    }

    // ── Compute live status based on mode ────────────────────────────────────
    const status: ComputedStatus = useMemo(() => {
        const elapsed = Math.min(totalYears, yearsBetween(startDate));
        const remaining = Math.max(0, totalYears - elapsed);
        const percentComplete = totalYears > 0 ? Math.min(100, (elapsed / totalYears) * 100) : 0;

        // Next anniversary date
        const start = new Date(startDate);
        const yearsFloor = Math.floor(elapsed) + 1;
        const nextAnniv = new Date(start);
        nextAnniv.setFullYear(nextAnniv.getFullYear() + Math.min(yearsFloor, totalYears));
        const daysToNext = Math.max(0, Math.ceil((nextAnniv.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

        let investedSoFar = 0;
        let valueToday = 0;
        let projectedFinal = 0;
        let withdrawnSoFar = 0;
        let balanceRemaining = 0;
        let monthsRemaining = 0;

        if (mode === 'compound' || mode === 'lumpsum') {
            // Single deposit, compound interest
            const r = rate / 100;
            const n = mode === 'lumpsum' ? 1 : freq;
            investedSoFar = principal;
            valueToday = elapsed > 0 && rate > 0
                ? principal * Math.pow(1 + r / n, n * elapsed)
                : principal;
            projectedFinal = projectedMaturity ?? principal * Math.pow(1 + r / n, n * totalYears);
        } else if (mode === 'simple') {
            // Single deposit, simple interest
            investedSoFar = principal;
            const interest = (principal * rate * elapsed) / 100;
            valueToday = principal + interest;
            projectedFinal = projectedMaturity ?? principal + (principal * rate * totalYears) / 100;
        } else if (mode === 'recurring') {
            // Monthly contribution accumulating at r/12
            const elapsedMonths = Math.floor(elapsed * 12);
            const r = rate / 12 / 100;
            let bal = 0;
            for (let i = 0; i < elapsedMonths; i++) {
                bal = bal * (1 + r) + monthlyContribution;
            }
            investedSoFar = monthlyContribution * elapsedMonths;
            valueToday = bal;
            // Project to end
            const totalMonths = Math.floor(totalYears * 12);
            let projBal = 0;
            for (let i = 0; i < totalMonths; i++) {
                projBal = projBal * (1 + r) + monthlyContribution;
            }
            projectedFinal = projectedMaturity ?? projBal;
        } else if (mode === 'swp') {
            // Initial corpus depleting via monthly withdrawals
            const elapsedMonths = Math.floor(elapsed * 12);
            const r = rate / 12 / 100;
            let bal = principal;
            let withdrawn = 0;
            for (let i = 0; i < elapsedMonths && bal > 0; i++) {
                bal = bal * (1 + r);
                if (bal >= monthlyWithdrawal) { bal -= monthlyWithdrawal; withdrawn += monthlyWithdrawal; }
                else { withdrawn += bal; bal = 0; }
            }
            investedSoFar = principal;
            valueToday = bal;
            withdrawnSoFar = withdrawn;
            balanceRemaining = bal;
            // Months remaining at current burn rate
            let remainingBal = bal;
            let mRem = 0;
            const totalMonths = Math.floor(totalYears * 12);
            while (remainingBal > 0 && mRem < totalMonths - elapsedMonths) {
                remainingBal = remainingBal * (1 + r);
                if (remainingBal >= monthlyWithdrawal) { remainingBal -= monthlyWithdrawal; mRem++; }
                else { mRem++; break; }
            }
            monthsRemaining = mRem;
            projectedFinal = projectedMaturity ?? remainingBal;
        }

        const gainSoFar = valueToday - investedSoFar;

        return {
            elapsed,
            remaining,
            percentComplete,
            investedSoFar,
            valueToday,
            gainSoFar,
            projectedFinal,
            nextMilestoneDate: nextAnniv,
            nextMilestoneLabel: `Year ${Math.min(yearsFloor, totalYears)} milestone`,
            daysToNextMilestone: daysToNext,
            withdrawnSoFar,
            balanceRemaining,
            monthsRemaining,
        };
    }, [mode, startDate, totalYears, rate, principal, monthlyContribution, monthlyWithdrawal, freq, projectedMaturity]);

    // Investment not started yet (future-dated start)
    if (status.elapsed <= 0) {
        return (
            <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-sm" style={{ color: c.text }}>
                        {label || t('liveInvest.title', 'Live Investment Tracker')}
                    </h3>
                </div>
                <p className="text-sm" style={{ color: c.textSecondary }}>
                    {t('liveInvest.notStartedYet', 'Investment starts on {{date}}', { date: fmtDate(startDate) })}
                </p>
            </div>
        );
    }

    // Plan complete (elapsed >= totalYears)
    const isComplete = status.elapsed >= totalYears;

    return (
        <div className="space-y-4">
            {/* HEADER — live as of today + completion badge */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                        {t('liveInvest.liveAsOf', 'Live as of {{date}}', { date: fmtDate(new Date().toISOString().slice(0, 10)) })}
                    </p>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {status.percentComplete.toFixed(1)}% {isComplete ? t('liveInvest.matured', 'Matured') : t('liveInvest.done', 'Done')}
                </span>
            </div>

            {/* 1. INVESTMENT JOURNEY */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-bold" style={{ color: c.text }}>
                        {t('liveInvest.journey', 'Your Investment Journey')}
                    </h3>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div>
                        <p className="text-[9px] uppercase font-bold" style={{ color: c.textSecondary }}>
                            {t('liveInvest.started', 'Started')}
                        </p>
                        <p className="text-xs font-bold" style={{ color: c.text }}>{fmtDate(startDate)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] uppercase font-bold" style={{ color: c.textSecondary }}>
                            {t('liveInvest.elapsed', 'Elapsed')}
                        </p>
                        <p className="text-xs font-bold" style={{ color: c.text }}>{fmtYearsMonths(status.elapsed)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] uppercase font-bold" style={{ color: c.textSecondary }}>
                            {t('liveInvest.remaining', 'Remaining')}
                        </p>
                        <p className="text-xs font-bold" style={{ color: c.text }}>
                            {isComplete ? '—' : fmtYearsMonths(status.remaining)}
                        </p>
                    </div>
                </div>
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}>
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                        style={{ width: `${status.percentComplete}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[9px] font-medium" style={{ color: c.textSecondary }}>
                        {t('liveInvest.start', 'Start')}
                    </span>
                    <span className="text-[9px] font-bold" style={{ color: c.textSecondary }}>
                        {status.percentComplete.toFixed(1)}%
                    </span>
                    <span className="text-[9px] font-medium" style={{ color: c.textSecondary }}>
                        {t('liveInvest.maturity', 'Maturity')}
                    </span>
                </div>
            </div>

            {/* 2. EARNED TILL DATE — invested / value today / gain */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-3">
                    <Banknote className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold" style={{ color: c.text }}>
                        {mode === 'swp'
                            ? t('liveInvest.statusSwp', 'Plan Status Today')
                            : t('liveInvest.earnedTillDate', 'Earned Till Date')}
                    </h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#3B82F615', border: '1px solid #3B82F630' }}>
                        <p className="text-[9px] uppercase font-bold text-blue-500 mb-1">
                            {mode === 'swp' ? t('liveInvest.corpus', 'Corpus') : t('liveInvest.invested', 'Invested')}
                        </p>
                        <p className="text-sm font-black text-blue-500">{formatINR(Math.round(status.investedSoFar))}</p>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#10B98115', border: '1px solid #10B98130' }}>
                        <p className="text-[9px] uppercase font-bold text-emerald-500 mb-1">
                            {mode === 'swp' ? t('liveInvest.balance', 'Balance') : t('liveInvest.valueToday', 'Value Today')}
                        </p>
                        <p className="text-sm font-black text-emerald-500">
                            {formatINR(Math.round(mode === 'swp' ? (status.balanceRemaining ?? 0) : status.valueToday))}
                        </p>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B30' }}>
                        <p className="text-[9px] uppercase font-bold text-amber-500 mb-1">
                            {mode === 'swp' ? t('liveInvest.withdrawn', 'Withdrawn') : t('liveInvest.gain', 'Gain')}
                        </p>
                        <p className="text-sm font-black text-amber-500">
                            {formatINR(Math.round(mode === 'swp' ? (status.withdrawnSoFar ?? 0) : status.gainSoFar))}
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. WHAT YOU'LL GET — projected end value */}
            {!isComplete && (
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-violet-500" />
                        <h3 className="text-sm font-bold" style={{ color: c.text }}>
                            {mode === 'swp'
                                ? t('liveInvest.atPlanEnd', 'At Plan End')
                                : t('liveInvest.atMaturity', 'At Maturity')}
                        </h3>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                            <span className="text-sm" style={{ color: c.textSecondary }}>
                                {mode === 'swp'
                                    ? t('liveInvest.endingBalance', 'Ending balance')
                                    : t('liveInvest.projectedValue', 'Projected value')}
                            </span>
                            <span className="text-sm font-bold" style={{ color: c.text }}>
                                {formatINR(Math.round(status.projectedFinal))}
                            </span>
                        </div>
                        {mode !== 'swp' && (
                            <div className="flex justify-between items-center py-1">
                                <span className="text-sm" style={{ color: c.textSecondary }}>
                                    {t('liveInvest.remainingGain', 'Remaining gain')}
                                </span>
                                <span className="text-sm font-medium text-emerald-500">
                                    {formatINR(Math.max(0, Math.round(status.projectedFinal - status.valueToday)))}
                                </span>
                            </div>
                        )}
                        {mode === 'swp' && status.monthsRemaining !== undefined && (
                            <div className="flex justify-between items-center py-1">
                                <span className="text-sm" style={{ color: c.textSecondary }}>
                                    {t('liveInvest.payoutsLeft', 'Withdrawals left')}
                                </span>
                                <span className="text-sm font-medium" style={{ color: c.text }}>
                                    {status.monthsRemaining}
                                </span>
                            </div>
                        )}
                        <div className="border-t pt-2 flex justify-between items-center" style={{ borderColor: c.border }}>
                            <span className="text-sm font-bold" style={{ color: c.text }}>
                                {t('liveInvest.maturityDate', 'Maturity date')}
                            </span>
                            <span className="text-sm font-bold text-violet-500">
                                {fmtDate(new Date(new Date(startDate).setFullYear(new Date(startDate).getFullYear() + totalYears)).toISOString().slice(0, 10))}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. NEXT MILESTONE — next anniversary tick */}
            {!isComplete && status.daysToNextMilestone > 0 && (
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            <h3 className="text-sm font-bold" style={{ color: c.text }}>
                                {t('liveInvest.nextMilestone', 'Next Milestone')}
                            </h3>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            {status.daysToNextMilestone === 0
                                ? t('liveInvest.today', 'Today')
                                : t('liveInvest.inNDays', 'in {{days}} days', { days: status.daysToNextMilestone })}
                        </span>
                    </div>
                    <p className="text-xs" style={{ color: c.textSecondary }}>
                        {status.nextMilestoneLabel} · {fmtDate(status.nextMilestoneDate.toISOString().slice(0, 10))}
                    </p>
                </div>
            )}
        </div>
    );
}
