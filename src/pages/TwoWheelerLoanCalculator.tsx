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
import { VEHICLE_TYPES, VEHICLE_SEGMENTS, CIBIL_TIERS, EV_SUBSIDY, STATE_EV_BENEFITS, RUNNING_COSTS, ONROAD_DEFAULTS, type VehicleType } from '../data/twoWheelerData';

export default function TwoWheelerLoanCalculator() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const c = useAppColors();
    useTrackCalculator();
    const { addHistory, addSaved, removeSaved, savedCalculations } = useCalculatorStore();

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
    const [rate, setRate] = useState(12);
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

    const segment = VEHICLE_SEGMENTS[segmentIdx];
    const cibil = CIBIL_TIERS[cibilIdx];
    const isEV = vehicleType === 'electric';

    // Auto-set price when segment changes
    useEffect(() => {
        const seg = VEHICLE_SEGMENTS[segmentIdx];
        setExShowroom(Math.round((seg.priceRange[0] + seg.priceRange[1]) / 2));
    }, [segmentIdx]);

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

    const centralSubsidy = isEV ? Math.min(batteryKwh * EV_SUBSIDY.ratePerKwh, EV_SUBSIDY.maxPerVehicle) : 0;
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

    // True cost of ownership
    const tenureYears = tenureMonths / 12;
    const ownershipCost = useMemo(() => {
        const segId = segment.id;
        let fuelCost = 0, serviceCost = 0, insuranceCost = 0;
        if (isEV) {
            fuelCost = (yearlyKm / RUNNING_COSTS.evKmPerUnit) * RUNNING_COSTS.electricityPerUnit * tenureYears;
            serviceCost = (RUNNING_COSTS.servicePerYear.electric[segId] || 2000) * tenureYears;
            insuranceCost = (RUNNING_COSTS.insurancePerYear.electric[segId] || 3000) * tenureYears;
            if (tenureYears > RUNNING_COSTS.batteryLifeYears) fuelCost += RUNNING_COSTS.batteryReplaceCost;
        } else {
            const mileage = RUNNING_COSTS.avgMileage[segId] || 50;
            fuelCost = (yearlyKm / mileage) * RUNNING_COSTS.petrolPerLitre * tenureYears;
            serviceCost = (RUNNING_COSTS.servicePerYear.petrol[segId] || 4500) * tenureYears;
            insuranceCost = (RUNNING_COSTS.insurancePerYear.petrol[segId] || 4000) * tenureYears;
        }
        return { fuelCost: Math.round(fuelCost), serviceCost: Math.round(serviceCost), insuranceCost: Math.round(insuranceCost), total: Math.round(totalPayment + processingFee + fuelCost + serviceCost + insuranceCost) };
    }, [isEV, segment, yearlyKm, tenureYears, totalPayment, processingFee]);

    // Petrol vs EV comparison (5 years)
    const comparison = useMemo(() => {
        const yrs = 5;
        const mileage = RUNNING_COSTS.avgMileage[segment.id] || 50;
        const petrolFuel = Math.round((yearlyKm / mileage) * RUNNING_COSTS.petrolPerLitre * yrs);
        const evFuel = Math.round((yearlyKm / RUNNING_COSTS.evKmPerUnit) * RUNNING_COSTS.electricityPerUnit * yrs);
        const petrolService = Math.round((RUNNING_COSTS.servicePerYear.petrol[segment.id] || 4500) * yrs);
        const evService = Math.round(2000 * yrs);
        const petrolIns = Math.round((RUNNING_COSTS.insurancePerYear.petrol[segment.id] || 4000) * yrs);
        const evIns = Math.round(3000 * yrs);
        const petrolTotal = petrolFuel + petrolService + petrolIns;
        const evTotal = evFuel + evService + evIns;
        return { petrolFuel, evFuel, petrolService, evService, petrolIns, evIns, petrolTotal, evTotal, saving: petrolTotal - evTotal };
    }, [segment, yearlyKm]);

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
        return { interestSaved: Math.round(totalInterest - totalInt), monthsSaved: tenureMonths - months };
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
        let msg = 'Very affordable';
        if (ratio > 40) { status = 'red'; msg = 'High burden — consider lower tenure or higher down payment'; }
        else if (ratio > 30) { status = 'yellow'; msg = 'Manageable — keep other EMIs low'; }
        else if (ratio > 20) { status = 'green'; msg = 'Comfortable — good EMI ratio'; }
        return { ratio, maxEmi, status, msg };
    }, [emi, monthlyIncome]);

    const isAlreadySaved = isSaved || savedCalculations.some(s => s.calculatorType === 'Two Wheeler Loan' && s.inputValues?.exShowroom === exShowroom && s.inputValues?.rate === rate);

    const handleCalculate = () => {
        setCalculated(true);
        addHistory({ id: Date.now().toString(), calculatorType: 'Two Wheeler Loan', timestamp: Date.now(), inputValues: { vehicleType, exShowroom, rate, tenureMonths, loanAmount }, resultValues: { emi, totalInterest, totalPayment } });
    };

    const handleSave = () => {
        const id = Date.now().toString();
        addSaved({ id, calculatorType: 'Two Wheeler Loan', timestamp: Date.now(), inputValues: { vehicleType, segment: segment.label, exShowroom, rate, tenureMonths, loanAmount, downPayment }, resultValues: { emi, totalInterest, totalPayment } });
        setIsSaved(true);
        setSavedId(id);
    };

    const handleRemove = () => {
        if (savedId) { removeSaved(savedId); setIsSaved(false); setSavedId(null); }
    };

    const handleShare = async () => {
        const text = `🛵 ${t('tw.title')}\n\n${isEV ? '⚡' : '⛽'} ${segment.label}\n💰 ${t('tw.exShowroom')}: ${formatINR(exShowroom)}\n📊 ${t('tw.loanAmt')}: ${formatINR(loanAmount)}\n📈 ${t('tw.rate')}: ${rate}%\n📅 ${t('tw.tenure')}: ${tenureMonths} months\n\n✅ EMI: ${formatINR(emi)}\n💵 ${t('tw.totalInt')}: ${formatINR(totalInterest)}\n\nCalculated with FinCalix 🧮`;
        await nativeShare('Two Wheeler Loan — FinCalix', text);
    };

    const handleSaveToMyLoans = () => {
        const loan: SavedLoan = {
            id: generateLoanId(),
            nickName: `${isEV ? 'EV' : ''} ${segment.label}`,
            loanType: 'two_wheeler_loan',
            lenderName: '',
            loanAmount,
            interestRate: rate,
            tenureMonths,
            emiAmount: emi,
            rateType: 'fixed',
            disbursementDate: new Date().toISOString().split('T')[0],
            emiDueDay: 5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true,
        };
        saveLoanToStorage(loan);
        setLoanSaved(true);
    };

    const handlePDF = async () => {
        const tag = new Date().toISOString().split('T')[0];
        const config: ExportConfig = {
            title: t('tw.title'),
            subtitle: `${isEV ? t('tw.electric') : t('tw.petrol')} — ${segment.label}`,
            inputs: [
                { label: 'Vehicle Type', value: isEV ? 'Electric (EV)' : 'Petrol' },
                { label: 'Segment', value: segment.label },
                { label: 'Ex-showroom', value: formatINR(exShowroom) },
                { label: 'On-road Price', value: formatINR(onRoadPrice) },
                ...(isEV ? [{ label: 'Subsidy', value: `-${formatINR(totalSubsidy)}` }] : []),
                { label: 'Down Payment', value: `${formatINR(downPayment)} (${downPaymentPct}%)` },
                { label: 'Loan Amount', value: formatINR(loanAmount) },
                { label: 'Interest Rate', value: `${rate}% p.a.` },
                { label: 'Tenure', value: `${tenureMonths} months` },
            ],
            results: [
                { label: 'Monthly EMI', value: formatINR(emi) },
                { label: 'Total Interest', value: formatINR(totalInterest) },
                { label: 'Total Payment', value: formatINR(totalPayment) },
                { label: `Ownership Cost (${tenureYears}yr)`, value: formatINR(ownershipCost.total) },
                { label: 'Fuel/Charging Cost', value: formatINR(ownershipCost.fuelCost) },
            ],
            projectionTitle: t('tw.yearWiseAmort'),
            projectionColumns: ['Year', 'Principal', 'Interest', 'Balance'],
            projectionRows: yearWise.map(r => [r.year, formatINR(r.principal), formatINR(r.interest), formatINR(r.balance)]),
            additionalTables: result?.schedule ? [{
                title: 'Month-wise Schedule',
                columns: ['Month', 'EMI', 'Principal', 'Interest', 'Balance'],
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
                {/* Vehicle Type */}
                <div className="flex rounded-2xl border p-1" style={{ borderColor: c.border, backgroundColor: c.card }}>
                    {VEHICLE_TYPES.map(vt => (
                        <button key={vt.id} onClick={() => { setVehicleType(vt.id); setSegmentIdx(vt.id === 'electric' ? 4 : 1); }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${vehicleType === vt.id ? 'bg-violet-600 text-white shadow-lg' : ''}`}
                            style={vehicleType !== vt.id ? { color: c.textSecondary } : {}}
                        >
                            {vt.icon} {vt.label}
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
                                    {s.label}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[9px] mt-1" style={{ color: c.textSecondary }}>{segment.desc} · {segment.for} · Typical: {formatINR(segment.priceRange[0])} — {formatINR(segment.priceRange[1])}</p>
                </div>

                {/* Ex-showroom */}
                <NumberInput label="{t('tw.exShowroom')}" value={exShowroom} onChange={setExShowroom} min={20000} max={500000} prefix="₹" />

                {/* EV Subsidy */}
                {isEV && (
                    <div className="p-4 rounded-2xl border shadow-sm space-y-3" style={{ backgroundColor: '#10B98110', borderColor: '#10B98130' }}>
                        <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-500" /><h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{t('tw.evSubsidies')}</h3></div>
                        <NumberInput label="{t('tw.batteryKwh')}" value={batteryKwh} onChange={setBatteryKwh} min={1} max={10} step={0.5} suffix=" kWh" />
                        <div className="flex justify-between text-xs"><span style={{ color: c.textSecondary }}>PM E-DRIVE subsidy</span><span className="font-bold text-emerald-500">-{formatINR(centralSubsidy)}</span></div>
                        <p className="text-[9px]" style={{ color: c.textSecondary }}>₹{EV_SUBSIDY.ratePerKwh}/kWh, max ₹{EV_SUBSIDY.maxPerVehicle} · Valid till {EV_SUBSIDY.validUntil}</p>
                        <div>
                            <label className="text-[10px] font-bold mb-1 block" style={{ color: c.textSecondary }}>Your State (for state EV benefits)</label>
                            <select value={selectedState} onChange={e => setSelectedState(e.target.value)}
                                className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none" style={{ borderColor: c.border, color: c.text }}>
                                <option value="">Select State</option>
                                {Object.keys(STATE_EV_BENEFITS).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {selectedState && STATE_EV_BENEFITS[selectedState] && <p className="text-[10px] mt-1 text-emerald-500 font-medium">{STATE_EV_BENEFITS[selectedState]}</p>}
                        </div>
                        {totalSubsidy > 0 && (
                            <div className="p-3 rounded-xl text-center" style={{ backgroundColor: '#10B98120' }}>
                                <p className="text-[9px] uppercase font-bold text-emerald-500">Effective Price After Subsidies</p>
                                <p className="text-lg font-black text-emerald-500">{formatINR(Math.max(0, exShowroom - totalSubsidy))}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* {t('tw.onRoadPrice')} */}
                <div className="p-4 rounded-2xl border shadow-sm space-y-3" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-2"><Info className="w-4 h-4 text-blue-500" /><h3 className="text-sm font-bold" style={{ color: c.text }}>{t('tw.onRoadPrice')}</h3></div>
                    <NumberInput label="{t('tw.rtoReg')}" value={effectiveRto} onChange={setRtoCharges} min={0} max={50000} prefix="₹" helperText={isEV ? 'Waived in many states for EVs' : `~${(ONROAD_DEFAULTS.rtoPercentPetrol * 100).toFixed(0)}% of ex-showroom`} />
                    <NumberInput label="{t('tw.insurance1yr')}" value={effectiveInsurance} onChange={setInsuranceAmt} min={0} max={30000} prefix="₹" />
                    <NumberInput label="{t('tw.handling')}" value={handlingCharges} onChange={setHandlingCharges} min={0} max={10000} prefix="₹" />
                    <NumberInput label="{t('tw.accessories')}" value={accessories} onChange={setAccessories} min={0} max={50000} prefix="₹" />
                    <div className="border-t pt-3 space-y-1.5" style={{ borderColor: c.border }}>
                        {[['Ex-showroom', exShowroom], ['+ RTO', effectiveRto], ['+ Insurance', effectiveInsurance], ['+ Handling', handlingCharges], ...(accessories > 0 ? [['+ Accessories', accessories]] : [])].map(([label, val]) => (
                            <div key={String(label)} className="flex justify-between text-xs"><span style={{ color: c.textSecondary }}>{label}</span><span className="font-medium" style={{ color: c.text }}>{formatINR(Number(val))}</span></div>
                        ))}
                        <div className="flex justify-between text-sm font-bold border-t pt-2" style={{ borderColor: c.border, color: c.text }}><span>{t('tw.onRoadPrice')}</span><span>{formatINR(onRoadPrice)}</span></div>
                        {isEV && totalSubsidy > 0 && (
                            <>
                                <div className="flex justify-between text-xs text-emerald-500"><span>- Central Subsidy</span><span>-{formatINR(centralSubsidy)}</span></div>
                                {stateSubsidy > 0 && <div className="flex justify-between text-xs text-emerald-500"><span>- State Subsidy</span><span>-{formatINR(stateSubsidy)}</span></div>}
                                <div className="flex justify-between text-sm font-black text-emerald-500 border-t pt-2" style={{ borderColor: c.border }}><span>Effective Price</span><span>{formatINR(effectivePrice)}</span></div>
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
                        <div><span className="text-xs font-medium" style={{ color: c.text }}>{t('tw.womenBorrower')}</span><p className="text-[9px]" style={{ color: c.textSecondary }}>~0.5% lower rate</p></div>
                        <button onClick={() => setIsFemale(!isFemale)} className={`w-12 h-6 rounded-full transition-all relative ${isFemale ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isFemale ? 'left-[26px]' : 'left-0.5'}`} />
                        </button>
                    </div>
                    <div>
                        <p className="text-[9px] mb-1 font-medium" style={{ color: c.textSecondary }}>Suggested rate: {suggestedRange[0]}% — {suggestedRange[1]}% {isFemale ? '(women discount applied)' : ''}</p>
                        <NumberInput label="{t('tw.rate')}" value={rate} onChange={setRate} min={1} max={36} suffix="%" step={0.25} />
                    </div>
                    <div>
                        <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>Tenure</label>
                        <div className="flex gap-2">
                            {[12, 24, 36, 48, 60].map(m => (
                                <button key={m} onClick={() => setTenureMonths(m)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold ${tenureMonths === m ? 'bg-violet-600 text-white' : 'border'}`}
                                    style={tenureMonths !== m ? { borderColor: c.border, color: c.textSecondary } : {}}
                                >{m / 12}yr</button>
                            ))}
                        </div>
                    </div>
                    <NumberInput label="{t('tw.processingFee')}" value={processingFee} onChange={setProcessingFee} min={0} max={10000} prefix="₹" />
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
                            {ltv > 90 && <p className="text-[10px] text-amber-500 font-medium mt-2">LTV {ltv.toFixed(0)}% — Most lenders cap at 90%. Verify with your lender.</p>}
                        </div>

                        {/* {t('tw.trueCost')} */}
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('tw.trueCost')} ({tenureYears.toFixed(0)}yr)</h3>
                            <NumberInput label="{t('tw.yearlyKm')}" value={yearlyKm} onChange={setYearlyKm} min={1000} max={30000} suffix=" km" />
                            <div className="space-y-1.5 mt-3 text-xs">
                                {[['Loan EMI total', totalPayment], ['Processing fee', processingFee], [`${isEV ? 'Charging' : 'Fuel'} cost (${tenureYears.toFixed(0)}yr)`, ownershipCost.fuelCost], [`Service (${tenureYears.toFixed(0)}yr)`, ownershipCost.serviceCost], [`Insurance (${tenureYears.toFixed(0)}yr)`, ownershipCost.insuranceCost]].map(([l, v]) => (
                                    <div key={String(l)} className="flex justify-between"><span style={{ color: c.textSecondary }}>{l}</span><span className="font-medium" style={{ color: c.text }}>{formatINR(Number(v))}</span></div>
                                ))}
                                <div className="flex justify-between font-bold text-sm border-t pt-2" style={{ borderColor: c.border, color: c.text }}><span>{t('tw.totalOwnership')}</span><span>{formatINR(ownershipCost.total)}</span></div>
                            </div>
                        </div>

                        {/* Petrol vs EV Comparison */}
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>⛽ Petrol vs ⚡ Electric — 5yr Running Cost</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-[10px]">
                                    <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-1.5 text-left font-bold">Cost</th><th className="py-1.5 text-right font-bold">Petrol</th><th className="py-1.5 text-right font-bold">Electric</th><th className="py-1.5 text-right font-bold text-emerald-500">Save</th></tr></thead>
                                    <tbody>
                                        {[['Fuel/Charging', comparison.petrolFuel, comparison.evFuel], ['Service', comparison.petrolService, comparison.evService], ['Insurance', comparison.petrolIns, comparison.evIns]].map(([l, p, e]) => (
                                            <tr key={String(l)} style={{ borderBottom: `1px solid ${c.border}40`, color: c.text }}>
                                                <td className="py-1.5">{l}</td><td className="py-1.5 text-right">{formatINR(Number(p))}</td><td className="py-1.5 text-right">{formatINR(Number(e))}</td><td className="py-1.5 text-right text-emerald-500 font-bold">{formatINR(Number(p) - Number(e))}</td>
                                            </tr>
                                        ))}
                                        <tr style={{ borderTop: `2px solid ${c.border}`, color: c.text }} className="font-bold">
                                            <td className="py-1.5">Total 5yr</td><td className="py-1.5 text-right">{formatINR(comparison.petrolTotal)}</td><td className="py-1.5 text-right">{formatINR(comparison.evTotal)}</td><td className="py-1.5 text-right text-emerald-500">{formatINR(comparison.saving)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Affordability */}
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('tw.canAfford')}</h3>
                            <NumberInput label="{t('tw.monthlyIncome')}" value={monthlyIncome} onChange={setMonthlyIncome} min={0} max={500000} prefix="₹" />
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
                            <NumberInput label="{t('tw.extraEmi')}" value={extraEmi} onChange={setExtraEmi} min={0} max={emi * 2} prefix="₹" />
                            {prepayResult && prepayResult.monthsSaved > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-3">
                                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#10B98115' }}><p className="text-[8px] uppercase font-bold text-emerald-500">{t('tw.intSaved')}</p><p className="text-sm font-black text-emerald-500">{formatINR(prepayResult.interestSaved)}</p></div>
                                    <div className="p-2 rounded-lg text-center" style={{ backgroundColor: '#3B82F615' }}><p className="text-[8px] uppercase font-bold text-blue-500">{t('tw.closesEarly')}</p><p className="text-sm font-black text-blue-500">{prepayResult.monthsSaved} months</p></div>
                                </div>
                            )}
                        </div>

                        {/* Rate Sensitivity */}
                        <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                            <h3 className="text-sm font-bold mb-3" style={{ color: c.text }}>{t('tw.rateEffect')}</h3>
                            <table className="w-full text-[10px]">
                                <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-1.5 text-left font-bold">Rate</th><th className="py-1.5 text-right font-bold">EMI</th><th className="py-1.5 text-right font-bold">{t('tw.totalInt')}</th></tr></thead>
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
                                                <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-1.5 text-left font-bold">Year</th><th className="py-1.5 text-right font-bold">Principal</th><th className="py-1.5 text-right font-bold">Interest</th><th className="py-1.5 text-right font-bold">Balance</th></tr></thead>
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
                                            <button onClick={() => setShowAmortMonthly(!showAmortMonthly)} className="w-full mt-2 text-[10px] font-bold text-violet-500">{showAmortMonthly ? 'Hide' : 'Show'} month-wise schedule</button>
                                            {showAmortMonthly && result.schedule && (
                                                <div className="overflow-x-auto mt-2">
                                                    <table className="w-full text-[9px] min-w-[400px]">
                                                        <thead><tr style={{ color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}><th className="py-1 text-left">Mo</th><th className="py-1 text-right">EMI</th><th className="py-1 text-right">Prin</th><th className="py-1 text-right">Int</th><th className="py-1 text-right">Bal</th></tr></thead>
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

                        {/* Advisor Tips */}
                        <div className="p-4 rounded-2xl" style={{ backgroundColor: '#10B98110', border: '1px solid #10B98125' }}>
                            <div className="flex items-center gap-2 mb-3"><Lightbulb className="w-4 h-4 text-emerald-500" /><h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{t('tw.advisorTips')}</h3></div>
                            <div className="space-y-2 text-[11px] leading-relaxed" style={{ color: c.textSecondary }}>
                                {isEV && <p><strong>⚡ EV Rate:</strong> Electric two-wheeler loans are typically 0.5-1% cheaper than petrol due to green incentives. Ask your lender for EV-specific rates.</p>}
                                {cibilIdx >= 2 && <p><strong>📊 CIBIL Alert:</strong> With CIBIL below 700, expect rates of 15-22%. Pay all EMIs on time for 6 months to improve your score.</p>}
                                {downPaymentPct < 10 && <p><strong>💰 {t('tw.downPayment')}:</strong> A 10-15% down payment significantly reduces your EMI and total interest.</p>}
                                {tenureMonths >= 60 && <p><strong>⏰ Tenure Warning:</strong> 5-year tenure means you may pay more in interest than the bike's resale value. Consider 3 years.</p>}
                                {exShowroom > 200000 && <p><strong>🏍 Premium Tip:</strong> For bikes above ₹2L, banks offer better rates than NBFCs. Ensure CIBIL is 750+ for best rates.</p>}
                                <p><strong>📋 Documents:</strong> Keep ready — Aadhaar, PAN, 3 months salary slips/ITR, 6-month bank statement, passport photo.</p>
                                <p><strong>🔍 Hidden Costs:</strong> Always ask for the total on-road price breakdown in writing. Check for hidden charges: extended warranty, accessories added without consent.</p>
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
                                                <p><strong>Running Cost:</strong> Electric ₹0.15-0.30/km vs Petrol ₹2-3/km. At 8,000 km/year: Save ₹14,000-22,000/year.</p>
                                                <p><strong>Battery Life:</strong> Typical 4-6 year life. Replacement: ₹25,000-40,000. Factor into 5-year cost.</p>
                                                <p><strong>Charging:</strong> Home charging is cheapest (₹5-8/unit). Full charge in 4-6 hours on standard socket.</p>
                                                <p><strong>Resale:</strong> EV resale value is still uncertain vs petrol. Factor potential lower resale if selling in 3 years.</p>
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
                                                <p><strong>Fixed Rate:</strong> Most two-wheeler loans are FIXED rate — EMI does not change. Confirm before signing.</p>
                                                <p><strong>Foreclosure:</strong> Charges are typically 2-4% on outstanding. Check before taking the loan.</p>
                                                <p><strong>Insurance Bundling:</strong> You have the RIGHT to buy insurance separately — often 30-40% cheaper from standalone insurers.</p>
                                                <p><strong>Accessories on Loan:</strong> Adding ₹20,000 accessories at 14% for 3 years costs ₹24,800. Better to pay cash.</p>
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
                                                ['Right to know full APR', 'Lender must disclose all charges, not just interest rate'],
                                                ['No forced insurance', 'You can choose your own insurance provider'],
                                                ['Foreclosure right', 'You can close your loan anytime. Max charge ~4%'],
                                                ['Part-prepayment right', 'You can make extra payments anytime'],
                                                ['Fair practices code', 'All lenders must follow RBI guidelines. Harassment is prohibited'],
                                                ['Credit reporting', 'On-time payments build your CIBIL. Late payments hurt it'],
                                            ].map(([title, desc]) => (
                                                <div key={title} className="flex gap-2"><span className="text-emerald-500 flex-shrink-0">✅</span><p><strong>{title}:</strong> {desc}</p></div>
                                            ))}
                                            <p className="text-[9px] italic mt-2">Source: RBI Fair Practices Code, IRDAI guidelines</p>
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
                                <button onClick={handleSaveToMyLoans} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-sm border border-emerald-500/20"><Save size={16} /> {t('tw.saveToMyLoans')}</button>
                            )}
                        </div>
                    </motion.div>
                )}

                <DisclaimerComponent module="emi" />
            </div>
        </div>
    );
}
