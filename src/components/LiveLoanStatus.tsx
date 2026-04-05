import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Lightbulb, Calendar, Clock, IndianRupee, CheckCircle2, AlertTriangle, TrendingDown, Shield, Banknote, Target, BarChart3, Save, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import { formatINR } from '../utils/calculations';
import { calculateLiveLoanStatus, type LoanProfile } from '../utils/loanStatusEngine';
import { useLiveStatusStore } from '../store/useLiveStatusStore';

function fmtDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtYearsMonths(totalMonths: number): string {
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    if (y === 0) return `${m} months`;
    if (m === 0) return `${y} years`;
    return `${y}y ${m}m`;
}

interface Props {
    profile: LoanProfile;
}

export default function LiveLoanStatus({ profile }: Props) {
    const { t } = useTranslation();
    const c = useAppColors();
    const [expandForeclosure, setExpandForeclosure] = useState(false);
    const [expandTimeline, setExpandTimeline] = useState(false);
    const [profileName, setProfileName] = useState('');
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const [savedProfileId, setSavedProfileId] = useState<string | null>(null);

    const { addProfile, removeProfile, savedProfiles } = useLiveStatusStore();

    const status = useMemo(() => calculateLiveLoanStatus(profile), [profile]);

    // Check if this loan is already saved
    const existingSaved = useMemo(() => {
        return savedProfiles.find(p =>
            p.profileData?.disbursementDate === profile.disbursementDate &&
            p.profileData?.loanAmount === profile.loanAmount &&
            p.calculatorType === 'Loan EMI'
        );
    }, [savedProfiles, profile]);

    const isAlreadySaved = profileSaved || !!existingSaved;
    const currentSavedId = savedProfileId || existingSaved?.id || null;

    // Loan not started
    if (status.loanNotStarted) {
        return (
            <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold text-sm" style={{ color: c.text }}>Live Loan Tracker</h3>
                </div>
                <p className="text-sm" style={{ color: c.textSecondary }}>
                    Loan hasn't started yet. Come back after {fmtDate(profile.disbursementDate)}.
                </p>
            </div>
        );
    }

    // Loan fully paid
    if (status.loanFullyPaid) {
        return (
            <div className="p-5 rounded-2xl border-2 shadow-sm" style={{ backgroundColor: '#10B98115', borderColor: '#10B98140' }}>
                <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">Loan Fully Paid! Congratulations!</h3>
                </div>
                <p className="text-sm" style={{ color: c.textSecondary }}>
                    Total paid: {formatINR(status.totalPaidSoFar)} (including {formatINR(status.interestPaidSoFar)} interest over {fmtYearsMonths(profile.tenureMonths)})
                </p>
            </div>
        );
    }

    const interestPct = profile.emiAmount > 0 ? (status.nextEmiInterest / profile.emiAmount) * 100 : 0;
    const principalPct = 100 - interestPct;
    const emiToIncome = 0; // We don't have income here

    // Foreclosure charges based on RBI rules
    const isFloating = profile.loanType === 'floating';
    const foreclosureChargeRate = isFloating ? 0 : 3; // RBI: NIL for floating, banks charge 2-4% for fixed

    // Year-wise amortization snapshot (next 5 years from current position)
    const yearlySnapshot = useMemo(() => {
        const rows: { year: number; opening: number; principalPaid: number; interestPaid: number; closing: number }[] = [];
        let bal = status.principalOutstanding;
        const r = profile.annualRate / 12 / 100;
        const currentYear = new Date().getFullYear();

        for (let yr = 0; yr < Math.min(5, Math.ceil(status.emisRemaining / 12)); yr++) {
            const opening = bal;
            let yearP = 0, yearI = 0;
            const monthsThisYear = Math.min(12, status.emisRemaining - yr * 12);
            for (let m = 0; m < monthsThisYear; m++) {
                const intPart = bal * r;
                const prinPart = profile.emiAmount - intPart;
                yearI += intPart;
                yearP += prinPart;
                bal = Math.max(0, bal - prinPart);
            }
            rows.push({ year: currentYear + yr, opening, principalPaid: yearP, interestPaid: yearI, closing: bal });
        }
        return rows;
    }, [status, profile]);

    return (
        <div className="space-y-4">
            {/* ═══ HEADER ═══ */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                        Live as of {fmtDate(status.today)}
                    </p>
                </div>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {status.percentComplete.toFixed(1)}% Done
                </span>
            </div>

            {/* ═══ 1. LOAN JOURNEY OVERVIEW ═══ */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-bold" style={{ color: c.text }}>Your Loan Journey</h3>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div>
                        <p className="text-[9px] uppercase font-bold" style={{ color: c.textSecondary }}>Loan Started</p>
                        <p className="text-xs font-bold" style={{ color: c.text }}>{fmtDate(profile.disbursementDate)}</p>
                    </div>
                    <div>
                        <p className="text-[9px] uppercase font-bold" style={{ color: c.textSecondary }}>EMIs Paid</p>
                        <p className="text-xs font-bold" style={{ color: c.text }}>{status.emisPaid} of {profile.tenureMonths}</p>
                    </div>
                    <div>
                        <p className="text-[9px] uppercase font-bold" style={{ color: c.textSecondary }}>Remaining</p>
                        <p className="text-xs font-bold" style={{ color: c.text }}>{fmtYearsMonths(status.emisRemaining)}</p>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}>
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                        style={{ width: `${status.percentComplete}%` }}></div>
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[9px] font-medium" style={{ color: c.textSecondary }}>Start</span>
                    <span className="text-[9px] font-bold" style={{ color: c.textSecondary }}>{status.percentComplete.toFixed(1)}% complete</span>
                    <span className="text-[9px] font-medium" style={{ color: c.textSecondary }}>End</span>
                </div>
            </div>

            {/* ═══ 2. MONEY PAID SO FAR ═══ */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-3">
                    <Banknote className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold" style={{ color: c.text }}>Paid Till Date</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#10B98115', border: '1px solid #10B98130' }}>
                        <p className="text-[9px] uppercase font-bold text-emerald-500 mb-1">Total Paid</p>
                        <p className="text-sm font-black text-emerald-500">{formatINR(status.totalPaidSoFar)}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: c.textSecondary }}>{status.emisPaid} EMIs</p>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#3B82F615', border: '1px solid #3B82F630' }}>
                        <p className="text-[9px] uppercase font-bold text-blue-500 mb-1">Principal</p>
                        <p className="text-sm font-black text-blue-500">{formatINR(status.principalPaidSoFar)}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: c.textSecondary }}>{(status.principalPaidSoFar / status.totalPaidSoFar * 100).toFixed(0)}% of EMIs</p>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B30' }}>
                        <p className="text-[9px] uppercase font-bold text-amber-500 mb-1">Interest</p>
                        <p className="text-sm font-black text-amber-500">{formatINR(status.interestPaidSoFar)}</p>
                        <p className="text-[9px] mt-0.5" style={{ color: c.textSecondary }}>{(status.interestPaidSoFar / status.totalPaidSoFar * 100).toFixed(0)}% of EMIs</p>
                    </div>
                </div>
            </div>

            {/* ═══ 3. WHAT YOU STILL OWE ═══ */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-red-500" />
                    <h3 className="text-sm font-bold" style={{ color: c.text }}>What You Still Owe</h3>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center py-1">
                        <span className="text-sm" style={{ color: c.textSecondary }}>Outstanding Principal</span>
                        <span className="text-sm font-bold" style={{ color: c.text }}>{formatINR(status.principalOutstanding)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span className="text-sm" style={{ color: c.textSecondary }}>Remaining EMIs ({status.emisRemaining})</span>
                        <span className="text-sm font-medium" style={{ color: c.text }}>{formatINR(status.emisRemaining * profile.emiAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span className="text-sm" style={{ color: c.textSecondary }}>Remaining Interest</span>
                        <span className="text-sm font-medium text-amber-500">{formatINR((status.emisRemaining * profile.emiAmount) - status.principalOutstanding)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center" style={{ borderColor: c.border }}>
                        <span className="text-sm font-bold" style={{ color: c.text }}>Total Still to Pay</span>
                        <span className="text-sm font-bold text-red-500">{formatINR(status.emisRemaining * profile.emiAmount)}</span>
                    </div>
                </div>
            </div>

            {/* ═══ 4. NEXT EMI DETAILS ═══ */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <h3 className="text-sm font-bold" style={{ color: c.text }}>Next EMI — {formatINR(profile.emiAmount)}</h3>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {status.daysToNextEmi === 0 ? 'Due Today' : `in ${status.daysToNextEmi} days`}
                    </span>
                </div>
                <p className="text-xs mb-3" style={{ color: c.textSecondary }}>Due on {fmtDate(status.nextEmiDate)}</p>
                <div className="space-y-2">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: c.textSecondary }}>Interest → Bank</span>
                            <span className="font-medium text-amber-500">{formatINR(status.nextEmiInterest)} ({interestPct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}>
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${interestPct}%` }}></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span style={{ color: c.textSecondary }}>Principal → Your equity</span>
                            <span className="font-medium text-emerald-500">{formatINR(status.nextEmiPrincipal)} ({principalPct.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}>
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${principalPct}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ 5. DAILY INTEREST COST ═══ */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: '#F59E0B08', borderColor: '#F59E0B30' }}>
                <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-bold" style={{ color: c.text }}>Interest Running Right Now</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B30' }}>
                        <p className="text-[9px] uppercase font-bold text-amber-500 mb-1">Per Day</p>
                        <p className="text-lg font-black text-amber-500">{formatINR(status.dailyInterest)}</p>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B30' }}>
                        <p className="text-[9px] uppercase font-bold text-amber-500 mb-1">Per Hour</p>
                        <p className="text-lg font-black text-amber-500">{formatINR(status.hourlyInterest)}</p>
                    </div>
                </div>
                <p className="text-[10px]" style={{ color: c.textSecondary }}>
                    Since last EMI ({fmtDate(status.lastEmiDate)}), {formatINR(status.interestAccruedToday)} interest has accrued over {status.daysSinceLastEmi} days. Until next EMI on {fmtDate(status.nextEmiDate)}, approx {formatINR(status.daysToNextEmi * status.dailyInterest)} more will accrue.
                </p>
            </div>

            {/* ═══ 6. FORECLOSURE / CLOSE TODAY ═══ */}
            <div className="rounded-2xl border-2 shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: '#10B981' }}>
                <button onClick={() => setExpandForeclosure(!expandForeclosure)}
                    className="w-full p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <IndianRupee className="w-5 h-5 text-emerald-500" />
                        <div className="text-left">
                            <h3 className="text-sm font-bold" style={{ color: c.text }}>Close This Loan Today</h3>
                            <p className="text-[10px]" style={{ color: c.textSecondary }}>Exact foreclosure amount as of today</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-emerald-500">{formatINR(status.totalSettlementToday)}</span>
                        {expandForeclosure ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                    </div>
                </button>

                <AnimatePresence>
                    {expandForeclosure && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden">
                            <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: c.border }}>
                                <div className="space-y-2 pt-3">
                                    <div className="flex justify-between text-sm">
                                        <span style={{ color: c.textSecondary }}>Outstanding Principal</span>
                                        <span className="font-medium" style={{ color: c.text }}>{formatINR(status.principalOutstanding)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span style={{ color: c.textSecondary }}>+ Interest accrued ({status.daysSinceLastEmi} days @ {profile.annualRate}%)</span>
                                        <span className="font-medium text-amber-500">+{formatINR(status.interestAccruedToday)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span style={{ color: c.textSecondary }}>+ Foreclosure Charge ({isFloating ? 'NIL — RBI 2014' : `${foreclosureChargeRate}%`})</span>
                                        <span className={`font-medium ${status.foreclosureCharge > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {status.foreclosureCharge > 0 ? `+${formatINR(status.foreclosureCharge)}` : 'NIL'}
                                        </span>
                                    </div>
                                    <div className="border-t pt-2 flex justify-between font-bold" style={{ borderColor: c.border }}>
                                        <span style={{ color: c.text }}>Total Settlement Today</span>
                                        <span className="text-lg text-emerald-500">{formatINR(status.totalSettlementToday)}</span>
                                    </div>
                                </div>

                                {/* Savings analysis */}
                                <div className="p-3 rounded-xl" style={{ backgroundColor: '#10B98115', border: '1px solid #10B98130' }}>
                                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">If you close today, you save:</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <p className="text-[9px] uppercase font-bold text-emerald-500">Interest Saved</p>
                                            <p className="text-sm font-black text-emerald-500">{formatINR(status.interestSavedIfCloseToday)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] uppercase font-bold text-emerald-500">Time Saved</p>
                                            <p className="text-sm font-black text-emerald-500">{fmtYearsMonths(status.emisRemaining)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* RBI Rule */}
                                {isFloating && (
                                    <div className="p-3 rounded-xl flex items-start gap-2" style={{ backgroundColor: '#3B82F615', border: '1px solid #3B82F630' }}>
                                        <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-blue-600 dark:text-blue-400 leading-relaxed">
                                            <strong>RBI Circular 2014:</strong> No foreclosure/prepayment charges on floating rate home loans. Banks cannot levy any penalty for early closure.
                                        </p>
                                    </div>
                                )}
                                {!isFloating && (
                                    <div className="p-3 rounded-xl flex items-start gap-2" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B30' }}>
                                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">
                                            <strong>Fixed Rate Loan:</strong> Banks typically charge 2-4% foreclosure penalty on fixed rate loans. Check your loan agreement for exact charges.
                                        </p>
                                    </div>
                                )}

                                <p className="text-[9px] text-center" style={{ color: c.textSecondary }}>
                                    Amount changes daily. Contact your bank for exact settlement figure.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ═══ 7. YEAR-WISE REMAINING SCHEDULE ═══ */}
            <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <button onClick={() => setExpandTimeline(!expandTimeline)}
                    className="w-full p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-violet-500" />
                        <h3 className="text-sm font-bold" style={{ color: c.text }}>Year-wise Remaining Schedule</h3>
                    </div>
                    {expandTimeline ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                </button>
                <AnimatePresence>
                    {expandTimeline && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden">
                            <div className="px-4 pb-4 border-t" style={{ borderColor: c.border }}>
                                <div className="overflow-x-auto mt-3">
                                    <table className="w-full text-[11px]">
                                        <thead>
                                            <tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}>
                                                <th className="py-2 text-left font-bold">Year</th>
                                                <th className="py-2 text-right font-bold">Opening</th>
                                                <th className="py-2 text-right font-bold">Principal</th>
                                                <th className="py-2 text-right font-bold">Interest</th>
                                                <th className="py-2 text-right font-bold">Closing</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {yearlySnapshot.map((row, i) => (
                                                <tr key={row.year} style={{ borderBottom: `1px solid ${c.border}`, color: c.text }}>
                                                    <td className="py-2 font-medium">{row.year}</td>
                                                    <td className="py-2 text-right" style={{ color: c.textSecondary }}>{formatINR(row.opening)}</td>
                                                    <td className="py-2 text-right text-blue-500">{formatINR(row.principalPaid)}</td>
                                                    <td className="py-2 text-right text-amber-500">{formatINR(row.interestPaid)}</td>
                                                    <td className="py-2 text-right font-medium">{formatINR(row.closing)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {yearlySnapshot.length < Math.ceil(status.emisRemaining / 12) && (
                                    <p className="text-[9px] text-center mt-2" style={{ color: c.textSecondary }}>
                                        Showing next 5 years. Full schedule available in amortization table above.
                                    </p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ═══ 8. SMART ADVISOR INSIGHT ═══ */}
            <div className="p-4 rounded-2xl" style={{ backgroundColor: '#10B98110', border: '1px solid #10B98125' }}>
                <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">Financial Advisor Insight</p>
                        <p className="text-[11px] leading-relaxed" style={{ color: c.textSecondary }}>
                            {interestPct > 60
                                ? `Your next EMI is ${interestPct.toFixed(0)}% interest — most of your payment goes to the bank. Consider making a lump-sum prepayment to reduce principal faster and shift more of each EMI towards building your equity.`
                                : `Good progress! ${principalPct.toFixed(0)}% of your EMI now goes towards principal. You've crossed the interest-heavy early phase of the loan.`
                            }
                            {status.interestSavedIfCloseToday > 100000 && ` By closing today, you could save ${formatINR(status.interestSavedIfCloseToday)} in future interest.`}
                        </p>
                    </div>
                </div>
            </div>

            {/* ═══ 9. SAVE THIS TRACKER ═══ */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                {isAlreadySaved ? (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm font-bold text-emerald-500">Saved to Profile</span>
                        </div>
                        <button
                            onClick={() => {
                                if (currentSavedId) {
                                    removeProfile(currentSavedId);
                                    setProfileSaved(false);
                                    setSavedProfileId(null);
                                }
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20"
                        >
                            <Trash2 size={12} /> Remove
                        </button>
                    </div>
                ) : showSaveForm ? (
                    <div className="space-y-3">
                        <p className="text-sm font-bold" style={{ color: c.text }}>Name this loan tracker</p>
                        <input
                            autoFocus
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && profileName.trim()) {
                                    const id = Date.now().toString();
                                    addProfile({
                                        id,
                                        name: profileName.trim(),
                                        calculatorType: 'Loan EMI',
                                        profileData: { ...profile },
                                        createdAt: Date.now(),
                                        updatedAt: Date.now(),
                                    });
                                    setProfileSaved(true);
                                    setSavedProfileId(id);
                                    setShowSaveForm(false);
                                }
                            }}
                            placeholder="e.g., PNB Home Loan, Car Loan"
                            className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none"
                            style={{ borderColor: c.border, color: c.text }}
                            maxLength={40}
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowSaveForm(false)}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold border"
                                style={{ borderColor: c.border, color: c.textSecondary }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!profileName.trim()) return;
                                    const id = Date.now().toString();
                                    addProfile({
                                        id,
                                        name: profileName.trim(),
                                        calculatorType: 'Loan EMI',
                                        profileData: { ...profile },
                                        createdAt: Date.now(),
                                        updatedAt: Date.now(),
                                    });
                                    setProfileSaved(true);
                                    setSavedProfileId(id);
                                    setShowSaveForm(false);
                                }}
                                disabled={!profileName.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold disabled:opacity-40"
                            >
                                Save Tracker
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowSaveForm(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-sm border border-emerald-500/20"
                    >
                        <Save size={16} /> Save this loan tracker
                    </button>
                )}
            </div>
        </div>
    );
}
