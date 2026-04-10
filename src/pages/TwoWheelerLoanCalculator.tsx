import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Download, ChevronDown, ChevronUp, Lightbulb, Shield, Zap, Info, Save, Check, Trash2, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { calculateReducingEMI, formatINR } from '../utils/calculations';
import { exportToPDF, type ExportConfig } from '../utils/exportReport';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { AnalyticsService } from '../lib/analytics';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { nativeShare } from '../utils/nativeShare';
import { saveLoan as saveLoanToStorage, generateLoanId, type SavedLoan } from '../utils/loanStorage';
import { todayStr } from '../utils/dateUtils';
import { VEHICLE_TYPES, VEHICLE_SEGMENTS, CIBIL_TIERS, EV_SUBSIDY, STATE_EV_BENEFITS, RUNNING_COSTS, ONROAD_DEFAULTS, type VehicleType } from '../data/twoWheelerData';
import CibilAdvisoryCard from '../components/CibilAdvisoryCard';
import CibilBadge from '../components/CibilBadge';
import { useCibil } from '../context/CibilContext';
import DateInput from '../components/DateInput';
import LiveLoanStatus from '../components/LiveLoanStatus';
import type { LoanProfile } from '../utils/loanStatusEngine';
import SaveNameDialog from '../components/SaveNameDialog';

export default function TwoWheelerLoanCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const c = useAppColors();
    useTrackCalculator();
    const { addHistory, addSaved, removeSaved, savedCalculations } = useCalculatorStore();
    const { profile: cibilProfile } = useCibil();

    useEffect(() => { AnalyticsService.trackScreen('TwoWheeler_Loan'); }, []);

    // ── State ──
    const [vehicleType, setVehicleType] = useState<VehicleType>('petrol');
    const [segmentIdx, setSegmentIdx] = useState(1);
    const [exShowroom, setExShowroom] = useState(90000);
    const [batteryKwh, setBatteryKwh] = useState(3);
    const [selectedState, setSelectedState] = useState('');
    const [rtoCharges, setRtoCharges] = useState(0);
    const [insuranceAmt, setInsuranceAmt] = useState(0);
    const [handlingCharges, setHandlingCharges] = useState(ONROAD_DEFAULTS.handlingCharges);
    const [accessories, setAccessories] = useState(0);
    const [downPaymentPct, setDownPaymentPct] = useState(10);
    const [cibilIdx, setCibilIdx] = useState(0);
    const [isFemale, setIsFemale] = useState(false);
    const [rate, setRate] = useState(11.5);
    const [tenureMonths, setTenureMonths] = useState(36);
    const [processingFee, setProcessingFee] = useState(1500);
    const [monthlyIncome, setMonthlyIncome] = useState(0);
    const [extraEmi, setExtraEmi] = useState(0);
    const [yearlyKm, setYearlyKm] = useState(8000);
    const [showAmort, setShowAmort] = useState(false);
    const [showAmortMonthly, setShowAmortMonthly] = useState(false);
    const [showEvGuide, setShowEvGuide] = useState(false);
    const [showPetrolGuide, setShowPetrolGuide] = useState(false);
    const [showRights, setShowRights] = useState(false);
    const [calculated, setCalculated] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);
    const [loanSaved, setLoanSaved] = useState(false);
    const [showNameDialog, setShowNameDialog] = useState(false);

    // Live loan tracker state — empty by default so the widget stays hidden
    // until the user picks an actual disbursement date.
    const [loanStartDate, setLoanStartDate] = useState('');
    const [emiDueDay, setEmiDueDay] = useState(5);

    const segment = VEHICLE_SEGMENTS[segmentIdx];
    const cibil = CIBIL_TIERS[cibilIdx];
    const isEV = vehicleType === 'electric';

    // Auto-set price when segment changes
    useEffect(() => {
        const seg = VEHICLE_SEGMENTS[segmentIdx];
        setExShowroom(Math.round((seg.priceRange[0] + seg.priceRange[1]) / 2));
    }, [segmentIdx]);

    // Seed cibilIdx from saved CIBIL profile on mount, so the picker reflects
    // the user's actual saved score instead of always defaulting to "Excellent".
    // Brackets must match cibilData.ts so a 760 score maps to "very_good"
    // (idx 1) instead of "excellent" — user previously saw inconsistent rates
    // across the EMI vs Two-Wheeler calculator for the same score.
    useEffect(() => {
        if (cibilProfile?.isNTC || !cibilProfile?.score) return;
        const s = cibilProfile.score;
        // 0=excellent (780+), 1=very_good (750-779), 2=good (700-749), 3=average (650-699), 4=poor (<650)
        const idx = s >= 780 ? 0 : s >= 750 ? 1 : s >= 700 ? 2 : s >= 650 ? 3 : 4;
        setCibilIdx(idx);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cibilProfile?.score, cibilProfile?.isNTC]);

    // Auto-set rate from cibil + vehicle type
    useEffect(() => {
        const range = isEV ? cibil.evRange : cibil.petrolRange;
        let suggestedRate = Math.round(((range[0] + range[1]) / 2) * 100) / 100;
        if (isFemale) suggestedRate = Math.max(suggestedRate - 0.5, range[0]);
        setRate(suggestedRate);
    }, [cibilIdx, vehicleType, isFemale]);

    // On-road calculations
    const autoRto = Math.round(exShowroom * (isEV ? ONROAD_DEFAULTS.rtoPercentEV : ONROAD_DEFAULTS.rtoPercentPetrol));
    const autoInsurance = Math.round(exShowroom * ONROAD_DEFAULTS.insurancePercent);
    const effectiveRto = rtoCharges || autoRto;
    const effectiveInsurance = insuranceAmt || autoInsurance;

    // PM E-DRIVE central subsidy — only applies to EVs whose ex-factory price
    // is at or below ₹1.5 lakh (the scheme's eligibility cap, valid till
    // July 31, 2026). Premium EVs above the cap get NO central subsidy.
    // Without this guard the calculator was silently granting subsidy on
    // bikes that don't actually qualify, overstating the savings.
    const isEvSubsidyEligible = isEV && exShowroom > 0 && exShowroom <= EV_SUBSIDY.priceCapExFactory;
    const centralSubsidy = isEvSubsidyEligible
        ? Math.min(batteryKwh * EV_SUBSIDY.ratePerKwh, EV_SUBSIDY.maxPerVehicle)
        : 0;
    const stateSubsidy = isEV && selectedState && STATE_EV_BENEFITS[selectedState] ? 5000 : 0;
    const totalSubsidy = centralSubsidy + stateSubsidy;

    const onRoadPrice = exShowroom + effectiveRto + effectiveInsurance + handlingCharges + accessories;
    const effectivePrice = onRoadPrice - totalSubsidy;

    const downPayment = Math.round(effectivePrice * downPaymentPct / 100);
    const loanAmount = Math.max(0, effectivePrice - downPayment);

    // EMI calculation
    const result = useMemo(() => {
        if (loanAmount <= 0 || rate <= 0 || tenureMonths <= 0) return null;
        return calculateReducingEMI(loanAmount, rate, tenureMonths);
    }, [loanAmount, rate, tenureMonths]);

    const emi = result?.emi || 0;
    const totalInterest = result?.totalInterest || 0;
    const totalPayment = result?.totalPayment || 0;
    const ltv = effectivePrice > 0 ? ((loanAmount / effectivePrice) * 100) : 0;

    /**
     * LiveLoanStatus profile — built only when the user has supplied a real
     * disbursement date. Hides the widget by default so first-time users
     * see the calculator results immediately, and reveals the live tracker
     * the moment they pick a date.
     */
    const loanProfile = useMemo<LoanProfile | null>(() => {
        if (!loanStartDate || loanAmount <= 0 || emi <= 0) return null;
        return {
            loanAmount,
            annualRate: rate,
            tenureMonths,
            emiAmount: emi,
            disbursementDate: loanStartDate,
            emiDueDay,
            loanType: 'fixed',
        };
    }, [loanStartDate, emiDueDay, loanAmount, rate, tenureMonths, emi]);

    // True cost of ownership
    const tenureYears = tenureMonths / 12;
    const ownershipCost = useMemo(() => {
        const segId = segment.id;
        let fuelCost = 0, serviceCost = 0, insuranceCost = 0;
        if (isEV) {
            fuelCost = (yearlyKm / RUNNING_COSTS.evKmPerUnit) * RUNNING_COSTS.electricityPerUnit * tenureYears;
            serviceCost = (RUNNING_COSTS.servicePerYear.electric[segId] || 2000) * tenureYears;
            insuranceCost = (RUNNING_COSTS.insurancePerYear.electric[segId] || 3000) * tenureYears;
            // >= so an exact 6-year tenure also triggers one battery replacement
            // (battery typically degrades to <80% capacity by year 6).
            if (tenureYears >= RUNNING_COSTS.batteryLifeYears) fuelCost += RUNNING_COSTS.batteryReplaceCost;
        } else {
            const mileage = RUNNING_COSTS.avgMileage[segId] || 50;
            fuelCost = (yearlyKm / mileage) * RUNNING_COSTS.petrolPerLitre * tenureYears;
            serviceCost = (RUNNING_COSTS.servicePerYear.petrol[segId] || 4500) * tenureYears;
            insuranceCost = (RUNNING_COSTS.insurancePerYear.petrol[segId] || 4000) * tenureYears;
        }
        return { fuelCost: Math.round(fuelCost), serviceCost: Math.round(serviceCost), insuranceCost: Math.round(insuranceCost), total: Math.round(totalPayment + processingFee + fuelCost + serviceCost + insuranceCost) };
    }, [isEV, segment, yearlyKm, tenureYears, totalPayment, processingFee]);

    // Petrol vs EV comparison — uses the user's actual loan tenure (was hardcoded
    // to 5 years before, which made the comparison meaningless on 2/3/4/5-year
    // loans). EV service & insurance are now segment-aware (using a budget-EV
    // baseline) so a premium electric doesn't get artificially flat costs.
    const comparison = useMemo(() => {
        const yrs = Math.max(1, tenureYears);
        const mileage = RUNNING_COSTS.avgMileage[segment.id] || 50;
        // For petrol-segment users, fall back to mid-commuter for the EV comparison row
        const evSegmentForCompare = (segment.id.startsWith('electric_') ? segment.id : 'electric_budget');
        const petrolFuel = Math.round((yearlyKm / mileage) * RUNNING_COSTS.petrolPerLitre * yrs);
        const evFuel = Math.round((yearlyKm / RUNNING_COSTS.evKmPerUnit) * RUNNING_COSTS.electricityPerUnit * yrs);
        const petrolService = Math.round((RUNNING_COSTS.servicePerYear.petrol[segment.id] || 4500) * yrs);
        const evService = Math.round((RUNNING_COSTS.servicePerYear.electric[evSegmentForCompare] || 2000) * yrs);
        const petrolIns = Math.round((RUNNING_COSTS.insurancePerYear.petrol[segment.id] || 4000) * yrs);
        const evIns = Math.round((RUNNING_COSTS.insurancePerYear.electric[evSegmentForCompare] || 3000) * yrs);
        const petrolTotal = petrolFuel + petrolService + petrolIns;
        const evTotal = evFuel + evService + evIns;
        return { years: yrs, petrolFuel, evFuel, petrolService, evService, petrolIns, evIns, petrolTotal, evTotal, saving: petrolTotal - evTotal };
    }, [segment, yearlyKm, tenureYears]);

    // Prepayment
    const prepayResult = useMemo(() => {
        if (extraEmi <= 0 || !result) return null;
        const r = rate / 12 / 100;
        let bal = loanAmount, months = 0, totalInt = 0;
        while (bal > 0 && months < tenureMonths) {
            const intPart = bal * r;
            const prinPart = (emi + extraEmi) - intPart;
            if (prinPart <= 0) break;
            bal = Math.max(0, bal - prinPart);
            totalInt += intPart;
            months++;
        }
        // Math.max(0, ...) guards against negative savings if floating-point math
        // ever produces totalInt > totalInterest (shouldn't, but defensive).
        return {
            interestSaved: Math.max(0, Math.round(totalInterest - totalInt)),
            monthsSaved: Math.max(0, tenureMonths - months),
        };
    }, [extraEmi, loanAmount, rate, tenureMonths, emi, totalInterest, result]);

    // Rate sensitivity
    const rateSensitivity = useMemo(() => {
        return [-2, -1, 0, 1, 2].map(delta => {
            const r = Math.max(1, rate + delta);
            const calc = calculateReducingEMI(loanAmount, r, tenureMonths);
            return { rate: r, emi: calc.emi, interest: calc.totalInterest, isCurrent: delta === 0 };
        });
    }, [loanAmount, rate, tenureMonths]);

    // Year-wise amort
    const yearWise = useMemo(() => {
        if (!result?.schedule) return [];
        const byYear: { year: number; principal: number; interest: number; balance: number }[] = [];
        let curYear = 0;
        result.schedule.forEach((row, i) => {
            const yr = Math.floor(i / 12);
            if (!byYear[yr]) byYear[yr] = { year: yr + 1, principal: 0, interest: 0, balance: 0 };
            byYear[yr].principal += row.principal;
            byYear[yr].interest += row.interest;
            byYear[yr].balance = row.closingBalance;
        });
        return byYear;
    }, [result]);

    // EMI affordability
    const affordability = useMemo(() => {
        if (!monthlyIncome || monthlyIncome <= 0) return null;
        const ratio = (emi / monthlyIncome) * 100;
        const maxEmi = monthlyIncome * 0.4;
        let status: 'green' | 'yellow' | 'red' = 'green';
        let msg = t('tw.veryAffordable');
        if (ratio > 40) { status = 'red'; msg = t('tw.highBurden'); }
        else if (ratio > 30) { status = 'yellow'; msg = t('tw.manageable'); }
        else if (ratio > 20) { status = 'green'; msg = t('tw.comfortable'); }
        return { ratio, maxEmi, status, msg };
    }, [emi, monthlyIncome]);

    const isAlreadySaved = isSaved || savedCalculations.some(s => s.calculatorType === t('tw.title') && s.inputValues?.exShowroom === exShowroom && s.inputValues?.rate === rate);

    const handleCalculate = () => {
        setCalculated(true);
        addHistory({ id: Date.now().toString(), calculatorType: t('tw.title'), timestamp: Date.now(), inputValues: { vehicleType, exShowroom, rate, tenureMonths, loanAmount }, resultValues: { emi, totalInterest, totalPayment } });
    };

    const handleSave = () => {
        const id = Date.now().toString();
        addSaved({ id, calculatorType: t('tw.title'), timestamp: Date.now(), inputValues: { vehicleType, segment: segment.label, exShowroom, rate, tenureMonths, loanAmount, downPayment }, resultValues: { emi, totalInterest, totalPayment } });
        setIsSaved(true);
        setSavedId(id);
    };

    const handleRemove = () => {
        if (savedId) { removeSaved(savedId); setIsSaved(false); setSavedId(null); }
    };

    const handleShare = async () => {
        const text = `🛵 ${t('tw.title')}\n\n${isEV ? '⚡' : '⛽'} ${segment.label}\n💰 ${t('tw.exShowroom')}: ${formatINR(exShowroom)}\n📊 ${t('tw.loanAmt')}: ${formatINR(loanAmount)}\n📈 ${t('tw.rate')}: ${rate}%\n📅 ${t('tw.tenure')}: ${tenureMonths} ${t('tw.months')}\n\n✅ EMI: ${formatINR(emi)}\n💵 ${t('tw.totalInt')}: ${formatINR(totalInterest)}\n\nCalculated with FinCalix 🧮`;
        await nativeShare(`${t('tw.title')} — FinCalix`, text);
    };

    const handleSaveToMyLoans = (customName: string) => {
        const loan: SavedLoan = {
            id: generateLoanId(),
            nickName: customName,
            loanType: 'two_wheeler_loan',
            lenderName: '',
            loanAmount,
            interestRate: rate,
            tenureMonths,
            emiAmount: emi,
            rateType: 'fixed',
            disbursementDate: loanStartDate || todayStr(),
            emiDueDay,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
        };
        saveLoanToStorage(loan);
        setLoanSaved(true);
    };

    const handlePDF = async () => {
        const tag = todayStr();
        const config: ExportConfig = {
            title: t('tw.title'),
            subtitle: `${isEV ? t('tw.electric') : t('tw.petrol')} — ${segment.label}`,
            inputs: [
                { label: t('tw.pdfVehicleType'), value: isEV ? t('tw.electricEV') : t('tw.petrol') },
                { label: t('tw.pdfSegment'), value: segment.label },
                { label: t('tw.exShowroom'), value: formatINR(exShowroom) },
                { label: t('tw.onRoadPrice'), value: formatINR(onRoadPrice) },
                ...(isEV ? [{ label: t('tw.pdfSubsidy'), value: `-${formatINR(totalSubsidy)}` }] : []),
                { label: t('tw.downPayment'), value: `${formatINR(downPayment)} (${downPaymentPct}%)` },
                { label: t('tw.loanAmt'), value: formatINR(loanAmount) },
                { label: t('tw.rate'), value: `${rate}% ${t('tw.pa')}` },
                { label: t('tw.tenure'), value: `${tenureMonths} ${t('tw.months')}` },
            ],
            results: [
                { label: t('tw.monthlyEmi'), value: formatINR(emi) },
                { label: t('tw.totalInt'), value: formatINR(totalInterest) },
                { label: t('tw.totalPayment'), value: formatINR(totalPayment) },
                { label: `${t('tw.pdfOwnershipCost')} (${tenureYears}${t('tw.yr')})`, value: formatINR(ownershipCost.total) },
                { label: t('tw.pdfFuelChargingCost'), value: formatINR(ownershipCost.fuelCost) },
            ],
            projectionTitle: t('tw.yearWiseAmort'),
            projectionColumns: [t('tw.pdfYear'), t('tw.pdfPrincipal'), t('tw.pdfInterest'), t('tw.pdfBalance')],
            projectionRows: yearWise.map(r => [r.year, formatINR(r.principal), formatINR(r.interest), formatINR(r.balance)]),
            additionalTables: result?.schedule ? [{
                title: t('tw.pdfMonthWise'),
                columns: [t('tw.pdfMonth'), t('tw.pdfEmi'), t('tw.pdfPrincipal'), t('tw.pdfInterest'), t('tw.pdfBalance')],
                rows: result.schedule.map(r => [r.month, formatINR(r.emi), formatINR(r.principal), formatINR(r.interest), formatINR(r.closingBalance)]),
            }] : [],
            filename: `FinCalix_TwoWheeler_${tag}`,
        };
        await exportToPDF(config);
    };

    const suggestedRange = isEV ? cibil.evRange : cibil.petrolRange;

    return (
        <div className="min-h-dvh" style={{ backgroundColor: c.bg }}>
            {/* Header */}
            <div className="sticky top-0 z-10 px-4 pt-14 pb-3 border-b" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}><ArrowLeft size={18} style={{ color: c.textSecondary }} /></button>
                    <div><h1 className="text-lg font-bold" style={{ color: c.text }}>🛵 {t('tw.title')}</h1><p className="text-[10px]" style={{ color: c.textSecondary }}>{t('tw.subtitle')}</p></div>
                    <div className="flex gap-2 ml-auto">
                        {calculated && <button onClick={handleShare} className="p-2 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}><Share2 size={16} style={{ color: c.textSecondary }} /></button>}
                    </div>
                </div>
            </div>

            <div className="px-4 pb-28 pt-4 space-y-4">
                {/* CIBIL Badge */}
                <CibilBadge loanType="two_wheeler_loan" />

                {/* Vehicle Type */}
                <div className="flex rounded-2xl border p-1" style={{ borderColor: c.border, backgroundColor: c.card }}>
                    {VEHICLE_TYPES.map(vt => (
                        <button key={vt.id} onClick={() => { setVehicleType(vt.id); setSegmentIdx(vt.id === 'electric' ? 4 : 1); }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${vehicleType === vt.id ? 'bg-violet-600 text-white shadow-lg' : ''}`}
                            style={vehicleType !== vt.id ? { color: c.textSecondary } : {}}
                        >
                            {vt.icon} {t(`tw.vt_${vt.id}`, vt.label)}
                        </button>
                    ))}
                </div>

                {/* Segment Selector */}
                <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: c.textSecondary }}>{t('tw.vehicleSeg')}</label>
                    <div className="flex flex-wrap gap-2">
                        {VEHICLE_SEGMENTS.filter(s => isEV ? s.evRange !== 'N/A' : s.mileage !== 'N/A').map((s, i) => {
                            const actualIdx = VEHICLE_SEGMENTS.indexOf(s);
                            return (
                                <button key={s.id} onClick={() => setSegmentIdx(actualIdx)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-semibold transition-all ${segmentIdx === actualIdx ? 'bg-violet-600 text-white' : 'border'}`}
                                    style={segmentIdx !== actualIdx ? { borderColor: c.border, color: c.textSecondary } : {}}
                                >
                                    {t(`tw.seg_${s.id}`, s.label)}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[9px] mt-1" style={{ color: c.textSecondary }}>{t(`tw.segDesc_${segment.id}`, segment.desc)} · {t(`tw.segFor_${segment.id}`, segment.for)} · {t('tw.typical')}: {formatINR(segment.priceRange[0])} — {formatINR(segment.priceRange[1])}</p>
                </div>

                {/* Ex-showroom */}
                <NumberInput label={t('tw.exShowroom')} value={exShowroom} onChange={setExShowroom} min={20000} max={500000} prefix="₹" />

                {/* EV Subsidy */}
                {isEV && (
                    <div className="p-4 rounded-2xl border shadow-sm space-y-3" style={{ backgroundColor: '#10B98110', borderColor: '#10B98130' }}>
                        <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-500" /><h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{t('tw.evSubsidies')}</h3></div>
                        <NumberInput label={t('tw.batteryKwh')} value={batteryKwh} onChange={setBatteryKwh} min={1} max={10} step={0.5} suffix=" kWh" />
                        <div className="flex justify-between text-xs"><span style={{ color: c.textSecondary }}>{t('tw.pmEdrive')}</span><span className="font-bold text-emerald-500">-{formatINR(centralSubsidy)}</span></div>
                        <p className="text-[9px]" style={{ color: c.textSecondary }}>₹{EV_SUBSIDY.ratePerKwh}/kWh, max ₹{EV_SUBSIDY.maxPerVehicle} · Valid till {EV_SUBSIDY.validUntil}</p>
                        {/* Expiry banner — PM E-DRIVE runs only till 31 Jul 2026.
                            Show an early-warning amber banner once we are within
                            120 days of expiry, and a red "expired" banner once
                            past it. The math uses the data file's validUntilDate
                            so it auto-cleans-up after a future scheme refresh. */}
                        {(() => {
                            const today = new Date();
                            const expiry = new Date(EV_SUBSIDY.validUntilDate);
                            const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            if (daysLeft < 0) {
                                return (
                                    <div className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: '#EF444415', border: '1px solid #EF444430' }}>
                                        <Info className="w-3 h-3 mt-0.5 text-red-500 flex-shrink-0" />
                                        <p className="text-[10px] text-red-600 dark:text-red-400 leading-snug">
                                            {t('tw.subsidyExpired', `PM E-DRIVE subsidy ended on ${EV_SUBSIDY.validUntil}. The amount above is shown for reference only — confirm latest scheme details with your dealer.`)}
                                        </p>
                                    </div>
                                );
                            }
                            if (daysLeft <= 120) {
                                return (
                                    <div className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B30' }}>
                                        <Info className="w-3 h-3 mt-0.5 text-amber-500 flex-shrink-0" />
                                        <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-snug">
                                            {t('tw.subsidyExpiringSoon', `Heads up: PM E-DRIVE expires in ${daysLeft} days (${EV_SUBSIDY.validUntil}). If you plan to buy after that, the subsidy may no longer apply.`)}
                                        </p>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                        {/* Eligibility warning when bike exceeds the PM E-DRIVE ex-factory cap */}
                        {isEV && exShowroom > EV_SUBSIDY.priceCapExFactory && (
                            <div className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B30' }}>
                                <Info className="w-3 h-3 mt-0.5 text-amber-500 flex-shrink-0" />
                                <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-snug">
                                    {t('tw.subsidyCapExceeded', `PM E-DRIVE subsidy is only available on EVs priced at or below ₹${(EV_SUBSIDY.priceCapExFactory / 100000).toFixed(1)}L ex-factory. Your bike exceeds this cap, so no central subsidy applies.`)}
                                </p>
                            </div>
                        )}
                        <div>
                            <label className="text-[10px] font-bold mb-1 block" style={{ color: c.textSecondary }}>{t('tw.yourState')}</label>
                            <select value={selectedState} onChange={e => setSelectedState(e.target.value)}
                                className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none" style={{ borderColor: c.border, color: c.text }}>
                                <option value="">{t('tw.selectState')}</option>
                                {Object.keys(STATE_EV_BENEFITS).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {selectedState && STATE_EV_BENEFITS[selectedState] && <p className="text-[10px] mt-1 text-emerald-500 font-medium">{STATE_EV_BENEFITS[selectedState]}</p>}
                        </div>
                        {totalSubsidy > 0 && (
                            <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#10B98120' }}>
                                <p className="text-[9px] uppercase font-bold text-emerald-500">{t('tw.effectivePrice')}</p>
                                <p className="text-lg font-black text-emerald-500">{formatINR(Math.max(0, exShowroom - totalSubsidy))}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* {t('tw.onRoadPrice')} */}
                <div className="p-4 rounded-2xl border shadow-sm space-y-3" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('tw.onRoadPrice')}</h3></div>
                    <NumberInput label={t('tw.rtoReg')} value={effectiveRto} onChange={setRtoCharges} min={0} max={50000} prefix="₹" helperText={isEV ? t('tw.rtoWaivedEv') : `~${(ONROAD_DEFAULTS.rtoPercentPetrol * 100).toFixed(0)}% of ex-showroom`} />
                    <NumberInput label={t('tw.insurance1yr')} value={effectiveInsurance} onChange={setInsuranceAmt} min={0} max={30000} prefix="₹" />
                    <NumberInput label={t('tw.handling')} value={handlingCharges} onChange={setHandlingCharges} min={0} max={10000} prefix="₹" />
                    <NumberInput label={t('tw.accessories')} value={accessories} onChange={setAccessories} min={0} max={50000} prefix="₹" />
                    <div className="border-t pt-3 space-y-1.5" style={{ borderColor: c.border }}>
                        {[[t('tw.pdfExShowroom'), exShowroom], [`+ ${t('tw.pdfRto')}`, effectiveRto], [`+ ${t('tw.pdfInsurance')}`, effectiveInsurance], [`+ ${t('tw.pdfHandling')}`, handlingCharges], ...(accessories > 0 ? [[`+ ${t('tw.pdfAccessories')}`, accessories]] : [])].map(([label, val]) => (
                            <div key={String(label)} className="flex justify-between text-xs"><span style={{ color: c.textSecondary }}>{label}</span><span className="font-medium" style={{ color: c.text }}>{formatINR(Number(val))}</span></div>
                        ))}
                        <div className="flex justify-between text-sm font-bold border-t pt-2" style={{ borderColor: c.border, color: c.text }}><span>{t('tw.onRoadPrice')}</span><span>{formatINR(onRoadPrice)}</span></div>
                        {isEV && totalSubsidy > 0 && (
                            <>
                                <div className="flex justify-between text-xs text-emerald-500"><span>{t('tw.centralSub')}</span><span>-{formatINR(centralSubsidy)}</span></div>
                                {stateSubsidy > 0 && <div className="flex justify-between text-xs text-emerald-500"><span>{t('tw.stateSub')}</span><span>-{formatINR(stateSubsidy)}</span></div>}
                                <div className="flex justify-between text-sm font-black text-emerald-500 border-t pt-2" style={{ borderColor: c.border }}><span>{t('tw.effectivePriceLabel')}</span><span>{formatINR(effectivePrice)}</span></div>
                            </>
                        )}
                    </div>
                </div>

                {/* {t('tw.loanDetails')} */}
                <div className="p-4 rounded-2xl border shadow-sm space-y-3" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('tw.loanDetails')}</h3>
                    <div>
                        <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('tw.downPayment')} ({downPaymentPct}%)</label>
                        <input type="range" min={0} max={50} value={downPaymentPct} onChange={e => setDownPaymentPct(Number(e.target.value))} className="w-full accent-violet-600" />
                        <p className="text-[10px] font-medium" style={{ color: c.text }}>{formatINR(downPayment)} ({downPaymentPct}% of {formatINR(effectivePrice)})</p>
                    </div>
                    <div>
                        <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('tw.cibilScore')}</label>
                        <div className="flex flex-wrap gap-1.5">
                            {CIBIL_TIERS.map((tier, i) => (
                                <button key={tier.id} onClick={() => setCibilIdx(i)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold ${cibilIdx === i ? 'bg-violet-600 text-white' : 'border'}`}
                                    style={cibilIdx !== i ? { borderColor: c.border, color: c.textSecondary } : {}}
                                >{tier.label}</button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: c.border }}>
                        <div><span className="text-xs font-medium" style={{ color: c.text }}>{t('tw.womenBorrower')}</span><p className="text-[9px]" style={{ color: c.textSecondary }}>{t('tw.womenDiscount')}</p></div>
                        <button onClick={() => setIsFemale(!isFemale)} className={`w-12 h-6 rounded-full transition-all relative ${isFemale ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isFemale ? 'left-[26px]' : 'left-0.5'}`} />
                        </button>
                    </div>
                    <div>
                        <p className="text-[9px] mb-1 font-medium" style={{ color: c.textSecondary }}>{t('tw.suggestedRate')}: {suggestedRange[0]}% — {suggestedRange[1]}% {isFemale ? `(${t('tw.womenDiscountApplied')})` : ''}</p>
                        <NumberInput label={t('tw.rate')} value={rate} onChange={setRate} min={1} max={36} suffix="%" step={0.25} helperText="Typical range 10-15% (Apr 2026)" />
                    </div>
                    <div>
                        <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('tw.tenure')}</label>
                        <div className="flex gap-2">
                            {[12, 24, 36, 48, 60].map(m => (
                                <button key={m} onClick={() => setTenureMonths(m)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold ${tenureMonths === m ? 'bg-violet-600 text-white' : 'border'}`}
                                    style={tenureMonths !== m ? { borderColor: c.border, color: c.textSecondary } : {}}
                                >{m / 12}{t('tw.yr')}</button>
                            ))}
                        </div>
                    </div>
                    <NumberInput label={t('tw.processingFee')} value={processingFee} onChange={setProcessingFee} min={0} max={10000} prefix="₹" />
                </div>

                {/* Calculate Button */}
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleCalculate}
                    className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/20">
                    {t('tw.calcBtn')}
                </motion.button>

                {/* ═══ RESULTS ═══ */}
                {calculated && result && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* EMI Result */}
                        <div className="p-5 rounded-2xl border-2 shadow-sm text-center" style={{ backgroundColor: c.card, borderColor: '#10B981' }}>
                            <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: c.textSecondary }}>{t('tw.monthlyEmi')}</p>
                            <p className="text-3xl font-black text-emerald-500">{formatINR(emi)}</p>
                            <div className="grid grid-cols-3 gap-2 mt-4">
                                <div className="p-2 rounded-xl" style={{ backgroundColor: '#3B82F615' }}><p className="text-[8px] uppercase font-bold text-blue-500">{t('tw.loanAmt')}</p><p className="text-[11px] font-black text-blue-500">{formatINR(loanAmount)}</p></div>
                                <div className="p-2 rounded-xl" style={{ backgroundColor: '#F59E0B15' }}><p className="text-[8px] uppercase font-bold text-amber-500">{t('tw.totalInt')}</p><p className="text-[11px] font-black text-amber-500">{formatINR(totalInterest)}</p></div>
                                <div className="p-2 rounded-xl" style={{ backgroundColor: '#10B98115' }}><p className="text-[8px] uppercase font-bold text-emerald-500">{t('tw.totalPayment')}</p><p className="text-[11px] font-black text-emerald-500">{formatINR(totalPayment)}</p></div>
                            </div>
                            {ltv > 90 && <p className="text-[10px] text-amber-500 font-medium mt-2">LTV {ltv.toFixed(0)}% — {t('tw.ltvWarn')}</p>}
                        </div>

                        {/* {t('tw.trueCost')} */}
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('tw.trueCost')} ({tenureYears.toFixed(0)}{t('tw.yr')})</h3>
                            <NumberInput label={t('tw.yearlyKm')} value={yearlyKm} onChange={setYearlyKm} min={1000} max={30000} suffix=" km" />
                            <div className="space-y-1.5 mt-3 text-xs">
                                {[[t('tw.loanEmiTotal'), totalPayment], [t('tw.processingFeeLabel'), processingFee], [`${isEV ? t('tw.chargingCost') : t('tw.fuelCost')} (${tenureYears.toFixed(0)}${t('tw.yr')})`, ownershipCost.fuelCost], [`${t('tw.serviceCost')} (${tenureYears.toFixed(0)}${t('tw.yr')})`, ownershipCost.serviceCost], [`${t('tw.insuranceCost')} (${tenureYears.toFixed(0)}${t('tw.yr')})`, ownershipCost.insuranceCost]].map(([l, v]) => (
                                    <div key={String(l)} className="flex justify-between"><span style={{ color: c.textSecondary }}>{l}</span><span className="font-medium" style={{ color: c.text }}>{formatINR(Number(v))}</span></div>
                                ))}
                                <div className="flex justify-between font-bold text-sm border-t pt-2" style={{ borderColor: c.border, color: c.text }}><span>{t('tw.totalOwnership')}</span><span>{formatINR(ownershipCost.total)}</span></div>
                            </div>
                        </div>

                        {/* Petrol vs EV Comparison — uses the user's actual loan tenure */}
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>
                                ⛽ {t('tw.petrol')} vs ⚡ {t('tw.electric')} — {comparison.years.toFixed(comparison.years % 1 ? 1 : 0)} {t('tw.years', 'year')}{comparison.years === 1 ? '' : 's'}
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[10px]">
                                    <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-1.5 text-left font-bold">{t('tw.cost')}</th><th className="py-1.5 text-right font-bold">{t('tw.petrol')}</th><th className="py-1.5 text-right font-bold">{t('tw.electric')}</th><th className="py-1.5 text-right font-bold text-emerald-500">{t('tw.save')}</th></tr></thead>
                                    <tbody>
                                        {[[t('tw.fuelCharging'), comparison.petrolFuel, comparison.evFuel], [t('tw.service'), comparison.petrolService, comparison.evService], [t('tw.insuranceCost'), comparison.petrolIns, comparison.evIns]].map(([l, p, e]) => (
                                            <tr key={String(l)} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}>
                                                <td className="py-1.5">{l}</td><td className="py-1.5 text-right">{formatINR(Number(p))}</td><td className="py-1.5 text-right">{formatINR(Number(e))}</td><td className="py-1.5 text-right text-emerald-500 font-bold">{formatINR(Number(p) - Number(e))}</td>
                                            </tr>
                                        ))}
                                        <tr style={{ borderTop: `2px solid ${c.border}`, color: c.text }} className="font-bold">
                                            <td className="py-1.5">{`${t('tw.total', 'Total')} (${comparison.years.toFixed(comparison.years % 1 ? 1 : 0)} ${comparison.years === 1 ? 'yr' : 'yrs'})`}</td>
                                            <td className="py-1.5 text-right">{formatINR(comparison.petrolTotal)}</td><td className="py-1.5 text-right">{formatINR(comparison.evTotal)}</td><td className="py-1.5 text-right text-emerald-500">{formatINR(comparison.saving)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Affordability */}
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('tw.canAfford')}</h3>
                            <NumberInput label={t('tw.monthlyIncome')} value={monthlyIncome} onChange={setMonthlyIncome} min={0} max={500000} prefix="₹" />
                            {affordability && (
                                <div className="mt-3 p-3 rounded-xl" style={{ backgroundColor: affordability.status === 'red' ? '#EF444415' : affordability.status === 'yellow' ? '#F59E0B15' : '#10B98115' }}>
                                    <p className={`text-xs font-bold ${affordability.status === 'red' ? 'text-red-500' : affordability.status === 'yellow' ? 'text-amber-500' : 'text-emerald-500'}`}>
                                        EMI-to-Income: {affordability.ratio.toFixed(1)}% — {affordability.msg}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Prepayment */}
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('tw.extraEmiTitle')}</h3>
                            <NumberInput label={t('tw.extraEmi')} value={extraEmi} onChange={setExtraEmi} min={0} max={emi * 2} prefix="₹" />
                            {prepayResult && prepayResult.monthsSaved > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#10B98115' }}><p className="text-[8px] uppercase font-bold text-emerald-500">{t('tw.intSaved')}</p><p className="text-sm font-black text-emerald-500">{formatINR(prepayResult.interestSaved)}</p></div>
                                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#3B82F615' }}><p className="text-[8px] uppercase font-bold text-blue-500">{t('tw.closesEarly')}</p><p className="text-sm font-black text-blue-500">{prepayResult.monthsSaved} {t('tw.months')}</p></div>
                                </div>
                            )}
                        </div>

                        {/* Rate Sensitivity */}
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('tw.rateEffect')}</h3>
                            <table className="w-full text-[10px]">
                                <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-1.5 text-left font-bold">{t('tw.rate')}</th><th className="py-1.5 text-right font-bold">{t('tw.pdfEmi')}</th><th className="py-1.5 text-right font-bold">{t('tw.totalInt')}</th></tr></thead>
                                <tbody>
                                    {rateSensitivity.map(r => (
                                        <tr key={r.rate} className={r.isCurrent ? 'bg-emerald-500/10' : ''} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}>
                                            <td className={`py-1.5 ${r.isCurrent ? 'font-bold text-emerald-500' : ''}`}>{r.rate}%{r.isCurrent ? ' ←' : ''}</td>
                                            <td className="py-1.5 text-right font-medium">{formatINR(r.emi)}</td>
                                            <td className="py-1.5 text-right">{formatINR(r.interest)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Amortization */}
                        <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <button onClick={() => setShowAmort(!showAmort)} className="w-full p-4 flex items-center justify-between">
                                <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('tw.yearWiseAmort')}</h3>
                                {showAmort ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                            </button>
                            <AnimatePresence>
                                {showAmort && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                        <div className="px-4 pb-4 border-t" style={{ borderColor: c.border }}>
                                            <table className="w-full text-[10px] mt-2">
                                                <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-1.5 text-left font-bold">{t('tw.pdfYear')}</th><th className="py-1.5 text-right font-bold">{t('tw.pdfPrincipal')}</th><th className="py-1.5 text-right font-bold">{t('tw.pdfInterest')}</th><th className="py-1.5 text-right font-bold">{t('tw.pdfBalance')}</th></tr></thead>
                                                <tbody>
                                                    {yearWise.map(r => (
                                                        <tr key={r.year} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}>
                                                            <td className="py-1.5 font-medium">{r.year}</td>
                                                            <td className="py-1.5 text-right text-blue-500">{formatINR(r.principal)}</td>
                                                            <td className="py-1.5 text-right text-amber-500">{formatINR(r.interest)}</td>
                                                            <td className="py-1.5 text-right font-medium">{formatINR(r.balance)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <button onClick={() => setShowAmortMonthly(!showAmortMonthly)} className="w-full mt-2 text-[10px] font-bold text-violet-500">{showAmortMonthly ? t('tw.hideMonthly') : t('tw.showMonthly')}</button>
                                            {showAmortMonthly && result.schedule && (
                                                <div className="overflow-x-auto mt-2">
                                                    <table className="w-full text-[9px] min-w-[400px]">
                                                        <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-1 text-left">{t('tw.moShort')}</th><th className="py-1 text-right">{t('tw.pdfEmi')}</th><th className="py-1 text-right">{t('tw.prinShort')}</th><th className="py-1 text-right">{t('tw.intShort')}</th><th className="py-1 text-right">{t('tw.balShort')}</th></tr></thead>
                                                        <tbody>
                                                            {result.schedule.map(r => (
                                                                <tr key={r.month} style={{ borderBottom: `1px solid ${c.border}20`, color: c.text }}>
                                                                    <td className="py-0.5">{r.month}</td>
                                                                    <td className="py-0.5 text-right">{formatINR(r.emi)}</td>
                                                                    <td className="py-0.5 text-right text-blue-500">{formatINR(r.principal)}</td>
                                                                    <td className="py-0.5 text-right text-amber-500">{formatINR(r.interest)}</td>
                                                                    <td className="py-0.5 text-right">{formatINR(r.closingBalance)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Live Loan Tracker — same pattern as EMI/Mortgage/Gold.
                            Empty start date by default; the moment user picks a date,
                            the EMI due-day picker reveals and the LiveLoanStatus
                            widget appears below with real-time tracking. */}
                        <div className="p-4 rounded-2xl border shadow-sm space-y-3" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <div className="flex items-center gap-2">
                                <Info size={16} className="text-violet-500" />
                                <div>
                                    <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('tw.liveTracker')}</h3>
                                    <p className="text-[10px]" style={{ color: c.textSecondary }}>{t('tw.liveTrackerDesc')}</p>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold mb-1.5 block" style={{ color: c.textSecondary }}>{t('tw.disbursementDate')}</label>
                                <DateInput value={loanStartDate} onChange={setLoanStartDate} />
                            </div>
                            {loanStartDate && (
                                <div>
                                    <label className="text-xs font-semibold mb-1.5 block" style={{ color: c.textSecondary }}>{t('tw.emiDueDay')}</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {[1, 5, 7, 10, 15].map(d => (
                                            <button key={d} onClick={() => setEmiDueDay(d)}
                                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${emiDueDay === d ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm' : 'border'}`}
                                                style={emiDueDay !== d ? { borderColor: c.border, color: c.textSecondary, backgroundColor: c.bg } : {}}
                                            >{d}</button>
                                        ))}
                                    </div>
                                    <p className="text-[9px] mt-1" style={{ color: c.textSecondary }}>{t('tw.emiDueDayHint')}</p>
                                </div>
                            )}
                        </div>

                        {loanProfile && (
                            <LiveLoanStatus profile={loanProfile} loanCategory="two_wheeler_loan" />
                        )}

                        {/* CIBIL Advisory — prefers actual saved score, falls back to picker tier.
                            Score samples align with each tier's midpoint:
                            0 excellent → 800, 1 very_good → 765, 2 good → 725, 3 average → 675, 4 poor → 600 */}
                        <CibilAdvisoryCard
                            score={cibilProfile?.score && !cibilProfile.isNTC
                                ? cibilProfile.score
                                : (cibilIdx === 0 ? 800 : cibilIdx === 1 ? 765 : cibilIdx === 2 ? 725 : cibilIdx === 3 ? 675 : 600)}
                            loanType="two_wheeler_loan"
                            loanAmount={loanAmount}
                            tenureMonths={tenureMonths}
                        />

                        {/* Advisor Tips */}
                        <div className="p-4 rounded-2xl" style={{ backgroundColor: '#10B98110', border: '1px solid #10B98125' }}>
                            <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4 text-emerald-500" /><h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{t('tw.advisorTips')}</h3></div>
                            <div className="space-y-2 text-[11px] leading-relaxed" style={{ color: c.textSecondary }}>
                                {isEV && <p><strong>⚡ {t('tw.tipEvRate')}:</strong> {t('tw.tipEvRateDesc')}</p>}
                                {/* Was idx>=2 (Average); now idx>=3 since "Very Good" was inserted at idx 1 */}
                                {cibilIdx >= 3 && <p><strong>📊 {t('tw.tipCibilAlert')}:</strong> {t('tw.tipCibilAlertDesc')}</p>}
                                {downPaymentPct < 10 && <p><strong>💰 {t('tw.downPayment')}:</strong> {t('tw.tipDownPaymentDesc')}</p>}
                                {tenureMonths >= 60 && <p><strong>⏰ {t('tw.tipTenureWarn')}:</strong> {t('tw.tipTenureWarnDesc')}</p>}
                                {exShowroom > 200000 && <p><strong>🏍 {t('tw.tipPremium')}:</strong> {t('tw.tipPremiumDesc')}</p>}
                                <p><strong>📋 {t('tw.tipDocs')}:</strong> {t('tw.tipDocsDesc')}</p>
                                <p><strong>🔍 {t('tw.tipHidden')}:</strong> {t('tw.tipHiddenDesc')}</p>
                            </div>
                        </div>

                        {/* EV Guide */}
                        {isEV && (
                            <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                <button onClick={() => setShowEvGuide(!showEvGuide)} className="w-full p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('tw.evGuide')}</h3></div>
                                    {showEvGuide ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                                </button>
                                <AnimatePresence>
                                    {showEvGuide && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                            <div className="px-4 pb-4 border-t space-y-3 text-[11px] leading-relaxed" style={{ borderColor: c.border, color: c.textSecondary }}>
                                                <p><strong>{t('tw.evRunningCost')}:</strong> {t('tw.evRunningCostDesc')}</p>
                                                <p><strong>{t('tw.evBattery')}:</strong> {t('tw.evBatteryDesc')}</p>
                                                <p><strong>{t('tw.evCharging')}:</strong> {t('tw.evChargingDesc')}</p>
                                                <p><strong>{t('tw.evResale')}:</strong> {t('tw.evResaleDesc')}</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Petrol Guide */}
                        {!isEV && (
                            <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                                <button onClick={() => setShowPetrolGuide(!showPetrolGuide)} className="w-full p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('tw.petrolGuide')}</h3></div>
                                    {showPetrolGuide ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                                </button>
                                <AnimatePresence>
                                    {showPetrolGuide && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                            <div className="px-4 pb-4 border-t space-y-3 text-[11px] leading-relaxed" style={{ borderColor: c.border, color: c.textSecondary }}>
                                                <p><strong>{t('tw.petrolFixedRate')}:</strong> {t('tw.petrolFixedRateDesc')}</p>
                                                <p><strong>{t('tw.petrolForeclosure')}:</strong> {t('tw.petrolForeclosureDesc')}</p>
                                                <p><strong>{t('tw.petrolInsBundle')}:</strong> {t('tw.petrolInsBundleDesc')}</p>
                                                <p><strong>{t('tw.petrolAccessories')}:</strong> {t('tw.petrolAccessoriesDesc')}</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Borrower Rights */}
                        <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <button onClick={() => setShowRights(!showRights)} className="w-full p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('tw.yourRights')}</h3></div>
                                {showRights ? <ChevronUp size={16} style={{ color: c.textSecondary }} /> : <ChevronDown size={16} style={{ color: c.textSecondary }} />}
                            </button>
                            <AnimatePresence>
                                {showRights && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                        <div className="px-4 pb-4 border-t space-y-2 text-[11px]" style={{ borderColor: c.border, color: c.textSecondary }}>
                                            {[
                                                [t('tw.rightApr'), t('tw.rightAprDesc')],
                                                [t('tw.rightInsurance'), t('tw.rightInsuranceDesc')],
                                                [t('tw.rightForeclosure'), t('tw.rightForeclosureDesc')],
                                                [t('tw.rightPrepay'), t('tw.rightPrepayDesc')],
                                                [t('tw.rightFairCode'), t('tw.rightFairCodeDesc')],
                                                [t('tw.rightCredit'), t('tw.rightCreditDesc')],
                                            ].map(([title, desc]) => (
                                                <div key={title} className="flex gap-2"><span className="text-emerald-500 flex-shrink-0">✅</span><p><strong>{title}:</strong> {desc}</p></div>
                                            ))}
                                            <p className="text-[9px] italic mt-2">{t('tw.rbiSource')}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Save Calculation */}
                        {isAlreadySaved ? (
                            <div className="flex gap-2">
                                <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><Check size={16} /> {t('common.saved')}</div>
                                <button onClick={handleRemove} className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/20"><Trash2 size={16} /></button>
                            </div>
                        ) : (
                            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20"><Save size={18} /> {t('tw.saveCalc')}</motion.button>
                        )}

                        {/* Export */}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={handlePDF} className="flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold" style={{ borderColor: c.border, color: c.text }}><Download size={16} /> PDF</button>
                            <button onClick={handleShare} className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-bold"><Share2 size={16} /> {t('tw.share')}</button>
                        </div>

                        {/* Save to My Loans */}
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            {loanSaved ? (
                                <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm font-bold text-emerald-500">{t('tw.savedToMyLoans')}</span>
                                    <button onClick={() => navigate('/my-loans')} className="ml-auto text-xs font-bold text-violet-500">{t('tw.viewInMyLoans')}</button>
                                </div>
                            ) : (
                                <button onClick={() => setShowNameDialog(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-sm border border-emerald-500/20"><Save size={16} /> {t('tw.saveToMyLoans')}</button>
                            )}
                        </div>

                        <SaveNameDialog
                            open={showNameDialog}
                            onClose={() => setShowNameDialog(false)}
                            onConfirm={(name) => handleSaveToMyLoans(name)}
                            defaultName={`${isEV ? t('tw.ev') + ' ' : ''}${segment.label} — ${formatINR(loanAmount)}`}
                        />
                    </motion.div>
                )}

                <DisclaimerComponent module="emi" />
            </div>
        </div>
    );
}
