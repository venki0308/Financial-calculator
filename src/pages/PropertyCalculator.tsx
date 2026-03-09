import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Building2, MapPin, ArrowRightLeft, Copy, Check, Home, FileText, Calculator, Info, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { AnalyticsService } from '../lib/analytics';
import { exportToPDF } from '../utils/exportUtils';

type Mode = 'land' | 'flat' | 'convert';

// ─── Unit Conversions (all expressed as sq.ft per unit) ──────────────────────
const UNIT_CONV: Record<string, number> = {
    sqft: 1,
    sqm: 10.7639,
    sqyard: 9,
    cent: 435.6,
    gunta: 1089,
    ankanam: 72,
    gajam: 9,
    acre: 43560,
    ground: 2400,
    bigha: 27000,
    hectare: 107639,
};

const UNIT_LABELS: Record<string, string> = {
    sqft: 'Square Feet',
    sqm: 'Square Meter',
    sqyard: 'Sq. Yard',
    cent: 'Cent',
    gunta: 'Gunta',
    ankanam: 'Ankanam',
    gajam: 'Gajam',
    acre: 'Acre',
    ground: 'Ground',
    bigha: 'Bigha',
    hectare: 'Hectare',
};

const UNIT_KEYS = Object.keys(UNIT_CONV);

// Short labels for compact unit selector buttons (must be distinct)
const UNIT_SHORT_LABELS: Record<string, string> = {
    sqft: 'Sq.ft',
    sqm: 'Sq.m',
    sqyard: 'Sq.yd',
    cent: 'Cent',
    gunta: 'Gunta',
    ankanam: 'Ankanam',
    gajam: 'Gajam',
    acre: 'Acre',
    ground: 'Ground',
    bigha: 'Bigha',
    hectare: 'Hectare',
};

// ─── Reference table rows ────────────────────────────────────────────────────
const REF_UNITS = ['cent', 'gunta', 'ankanam', 'gajam', 'acre', 'ground', 'bigha', 'hectare'];

// ─── Stamp Duty by state ─────────────────────────────────────────────────────
const STATE_RATES: Record<string, { name: string; stamp: number; reg: number; transfer: number }> = {
    telangana: { name: 'Telangana', stamp: 4, reg: 0.5, transfer: 1.5 },
    andhra: { name: 'Andhra Pradesh', stamp: 5, reg: 1, transfer: 1.5 },
    karnataka: { name: 'Karnataka', stamp: 5, reg: 1, transfer: 0 },
    tamilnadu: { name: 'Tamil Nadu', stamp: 7, reg: 1, transfer: 0 },
    maharashtra: { name: 'Maharashtra', stamp: 5, reg: 1, transfer: 0 },
    delhi: { name: 'Delhi', stamp: 6, reg: 1, transfer: 0 },
    gujarat: { name: 'Gujarat', stamp: 4.9, reg: 1, transfer: 0 },
    rajasthan: { name: 'Rajasthan', stamp: 6, reg: 1, transfer: 0 },
    kerala: { name: 'Kerala', stamp: 8, reg: 2, transfer: 0 },
    westbengal: { name: 'West Bengal', stamp: 6, reg: 1, transfer: 0 },
};

// ─── Helper: format INR ──────────────────────────────────────────────────────
const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
const fmtArea = (n: number) =>
    n.toLocaleString('en-IN', { maximumFractionDigits: 3 });

// ─── Helper: compute EMI ─────────────────────────────────────────────────────
function calcEMI(principal: number, ratePA: number, tenureYears: number) {
    const r = ratePA / (12 * 100);
    const n = tenureYears * 12;
    if (r === 0) return { emi: principal / n, totalPayment: principal, totalInterest: 0 };
    const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    return { emi, totalPayment, totalInterest: totalPayment - principal };
}

export default function PropertyCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Property'); }, []);
    useTrackCalculator();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const addSaved = useCalculatorStore((s) => s.addSaved);
    const [mode, setMode] = useState<Mode>('land');

    // ── Land ─────────────────────────────────────────────────────────────────
    const [landArea, setLandArea] = useState('');
    const [landUnit, setLandUnit] = useState('sqft');
    const [landPrice, setLandPrice] = useState('');
    const [landResult, setLandResult] = useState<{
        totalValue: number;
        conversions: { key: string; value: string }[];
    } | null>(null);

    // ── Flat ─────────────────────────────────────────────────────────────────
    const [builtUp, setBuiltUp] = useState('');
    const [carpet, setCarpet] = useState('');
    const [ppsf, setPpsf] = useState('');
    const [parking, setParking] = useState('');
    const [amenities, setAmenities] = useState('');
    const [maint, setMaint] = useState('');
    const [gstPct, setGstPct] = useState('5');
    const [flatResult, setFlatResult] = useState<{
        basePrice: number; parkingAmt: number; amenitiesAmt: number; maintAmt: number;
        subtotal: number; gstAmt: number; totalCost: number;
    } | null>(null);

    // ── Stamp Duty ────────────────────────────────────────────────────────────
    const [sdValue, setSdValue] = useState('');
    const [sdState, setSdState] = useState('telangana');
    const [sdStampPct, setSdStampPct] = useState(STATE_RATES.telangana.stamp.toString());
    const [sdRegPct, setSdRegPct] = useState(STATE_RATES.telangana.reg.toString());
    const [sdTransferPct, setSdTransferPct] = useState(STATE_RATES.telangana.transfer.toString());
    const [sdResult, setSdResult] = useState<{
        stamp: number; reg: number; transfer: number; total: number;
    } | null>(null);

    // ── Home Loan EMI ─────────────────────────────────────────────────────────
    const [loanAmt, setLoanAmt] = useState('');
    const [loanRate, setLoanRate] = useState('8.5');
    const [loanTenure, setLoanTenure] = useState('20');
    const [emiResult, setEmiResult] = useState<{
        emi: number; totalInterest: number; totalPayment: number;
    } | null>(null);

    // ── Unit Converter ────────────────────────────────────────────────────────
    const [convVal, setConvVal] = useState('');
    const [fromUnit, setFromUnit] = useState('sqft');
    const [toUnit, setToUnit] = useState('gunta');

    // ── Rental Yield ──────────────────────────────────────────────────────────
    const [ryPropertyValue, setRyPropertyValue] = useState('');
    const [ryMonthlyRent, setRyMonthlyRent] = useState('');
    const [ryMaintenance, setRyMaintenance] = useState('');
    const [ryVacancy, setRyVacancy] = useState('1'); // months vacant per year
    const [ryResult, setRyResult] = useState<{
        annualRent: number; grossYield: number; netYield: number; paybackYears: number;
    } | null>(null);

    // ── Appreciation Forecast ─────────────────────────────────────────────────
    const [apCurrentValue, setApCurrentValue] = useState('');
    const [apRate, setApRate] = useState('8');
    const [apResult, setApResult] = useState<{
        projections: { years: number; value: number; gain: number }[];
    } | null>(null);

    // ── Copy toast ────────────────────────────────────────────────────────────
    const [copied, setCopied] = useState<string | null>(null);
    const copyText = (text: string, key: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(key);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    // ── Calculations ──────────────────────────────────────────────────────────
    const calculateLand = () => {
        const a = Number(landArea), p = Number(landPrice);
        if (!a || !p) return;
        const totalValue = a * p;
        const sqftArea = a * UNIT_CONV[landUnit];
        const conversions = Object.keys(UNIT_CONV)
            .filter(k => k !== landUnit)
            .slice(0, 5) // show compact set of conversions
            .map(k => ({
                key: k,
                value: `${fmtArea(sqftArea / UNIT_CONV[k])} ${UNIT_LABELS[k]}`,
            }));
        setLandResult({ totalValue, conversions });
    };

    const calculateFlat = () => {
        const bua = Number(builtUp), p = Number(ppsf);
        if (!bua || !p) return;
        const basePrice = bua * p;
        const parkingAmt = Number(parking) || 0;
        const amenitiesAmt = Number(amenities) || 0;
        const maintAmt = Number(maint) || 0;
        const subtotal = basePrice + parkingAmt + amenitiesAmt + maintAmt;
        const gstAmt = (basePrice) * (Number(gstPct) / 100);
        const totalCost = subtotal + gstAmt;
        setFlatResult({ basePrice, parkingAmt, amenitiesAmt, maintAmt, subtotal, gstAmt, totalCost });
    };

    const calculateSD = () => {
        const val = Number(sdValue);
        if (!val) return;
        const s = Number(sdStampPct) || 0;
        const r = Number(sdRegPct) || 0;
        const t = Number(sdTransferPct) || 0;
        const stamp = val * (s / 100);
        const reg = val * (r / 100);
        const transfer = val * (t / 100);
        setSdResult({ stamp, reg, transfer, total: stamp + reg + transfer });
    };

    const calculateEMI = () => {
        const amt = Number(loanAmt), rate = Number(loanRate), tenure = Number(loanTenure);
        if (!amt || !rate || !tenure) return;
        const r = calcEMI(amt, rate, tenure);
        setEmiResult(r);
    };

    const calculateRentalYield = () => {
        const pv = Number(ryPropertyValue), mr = Number(ryMonthlyRent);
        if (!pv || !mr) return;
        const annualRent = mr * (12 - Number(ryVacancy || 0));
        const annualMaint = Number(ryMaintenance || 0) * 12;
        const grossYield = (mr * 12 / pv) * 100;
        const netYield = ((annualRent - annualMaint) / pv) * 100;
        const paybackYears = pv / (annualRent - annualMaint);
        setRyResult({ annualRent, grossYield, netYield, paybackYears: Math.max(0, paybackYears) });
    };

    const calculateAppreciation = () => {
        const cv = Number(apCurrentValue), ar = Number(apRate);
        if (!cv || !ar) return;
        const projections = [5, 10, 15, 20].map(y => {
            const value = cv * Math.pow(1 + ar / 100, y);
            return { years: y, value, gain: value - cv };
        });
        setApResult({ projections });
    };

    const convertedVal = useCallback(() => {
        const v = Number(convVal);
        if (!v) return '0';
        const sqft = v * UNIT_CONV[fromUnit];
        return fmtArea(sqft / UNIT_CONV[toUnit]);
    }, [convVal, fromUnit, toUnit]);

    // ── PDF Export ────────────────────────────────────────────────────────────
    const handleExportPDF = async () => {
        if (mode === 'land' && landResult) {
            await exportToPDF('Land Value Report', ['Item', 'Value'], [
                ['Area', `${landArea} ${UNIT_LABELS[landUnit]}`],
                ['Price per Unit', fmt(Number(landPrice))],
                ['---', '---'],
                ['Estimated Land Value', fmt(landResult.totalValue)],
            ], 'Land_Value_Report');
        } else if (mode === 'flat' && flatResult) {
            await exportToPDF('Flat / Apartment Cost Report', ['Component', 'Amount'], [
                ['Built-up Area', `${builtUp} sq.ft`],
                ['Price per sq.ft', fmt(Number(ppsf))],
                ['---', '---'],
                ['Base Price', fmt(flatResult.basePrice)],
                ['Parking Charges', fmt(flatResult.parkingAmt)],
                ['Amenities Charges', fmt(flatResult.amenitiesAmt)],
                ['Maintenance Deposit', fmt(flatResult.maintAmt)],
                ['Subtotal', fmt(flatResult.subtotal)],
                [`GST (${gstPct}%)`, fmt(flatResult.gstAmt)],
                ['Total Property Cost', fmt(flatResult.totalCost)],
            ], 'Flat_Cost_Report');
        }
    };

    const handleStampDutyPDF = async () => {
        if (!sdResult) return;
        const stateName = STATE_RATES[sdState]?.name || sdState;
        await exportToPDF('Stamp Duty & Registration Report', ['Component', 'Amount'], [
            ['State', stateName],
            ['Property Value', fmt(Number(sdValue))],
            ['---', '---'],
            [`Stamp Duty (${sdStampPct}%)`, fmt(sdResult.stamp)],
            [`Registration Charges (${sdRegPct}%)`, fmt(sdResult.reg)],
            ...(sdResult.transfer > 0 ? [[`Transfer Duty (${sdTransferPct}%)`, fmt(sdResult.transfer)] as [string, string]] : []),
            ['---', '---'],
            ['Total Registration Cost', fmt(sdResult.total)],
            ['Grand Total (Property + Reg.)', fmt(Number(sdValue) + sdResult.total)],
        ], 'Stamp_Duty_Report');
    };

    const handleRentalYieldPDF = async () => {
        if (!ryResult) return;
        await exportToPDF('Rental Yield Analysis Report', ['Metric', 'Value'], [
            ['Property Value', fmt(Number(ryPropertyValue))],
            ['Monthly Rent', fmt(Number(ryMonthlyRent))],
            ['Monthly Maintenance', fmt(Number(ryMaintenance || '0'))],
            ['Vacant Months/Year', `${ryVacancy} months`],
            ['---', '---'],
            ['Annual Rent Income', fmt(ryResult.annualRent)],
            ['Gross Yield', `${ryResult.grossYield.toFixed(2)}%`],
            ['Net Yield', `${ryResult.netYield.toFixed(2)}%`],
            ['Payback Period', `${ryResult.paybackYears.toFixed(1)} years`],
        ], 'Rental_Yield_Report');
    };

    const handleAppreciationPDF = async () => {
        if (!apResult) return;
        await exportToPDF('Property Appreciation Forecast', ['Metric', 'Value'], [
            ['Current Property Value', fmt(Number(apCurrentValue))],
            ['Annual Appreciation Rate', `${apRate}%`],
            ['---', '---'],
            ...apResult.projections.map(p => [
                `After ${p.years} Years`, `${fmt(p.value)} (Gain: ${fmt(p.gain)})`
            ] as [string, string]),
        ], 'Appreciation_Forecast');
    };

    const handleHomeLoanPDF = async () => {
        if (!emiResult) return;
        await exportToPDF('Home Loan EMI Report', ['Component', 'Amount'], [
            ['Loan Amount', fmt(Number(loanAmt))],
            ['Interest Rate', `${loanRate}% p.a.`],
            ['Tenure', `${loanTenure} years`],
            ['---', '---'],
            ['Monthly EMI', fmt(emiResult.emi)],
            ['Total Interest', fmt(emiResult.totalInterest)],
            ['Total Payment', fmt(emiResult.totalPayment)],
        ], 'Home_Loan_EMI_Report');
    };

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            <div className="px-4 pt-14 pb-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white">Property Calculator</h1>
                        <p className="text-slate-500 text-xs">Real Estate Financial Toolkit</p>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="mb-4 p-3 bg-amber-100/40 dark:bg-amber-500/10 border border-amber-300 dark:border-amber-500/25 rounded-xl flex gap-2 items-start">
                    <Info size={16} className="text-amber-700 dark:text-amber-500/80 mt-0.5 flex-shrink-0" />
                    <p className="text-amber-900 dark:text-amber-300/90 text-[11px] leading-relaxed font-medium">
                        Disclaimer: This calculation is an estimate. Government rates, stamp duties, and registration charges vary by state, location, and owner category. Please verify with local authorities.
                    </p>
                </div>

                {/* Mode Tabs */}
                <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
                    {([
                        { key: 'land', icon: MapPin, label: 'Land' },
                        { key: 'flat', icon: Building2, label: 'Flat' },
                        { key: 'convert', icon: ArrowRightLeft, label: 'Convert' },
                    ] as const).map(({ key, icon: Icon, label }) => (
                        <button
                            key={key}
                            onClick={() => { setMode(key); }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-w-[80px] ${mode === key
                                ? 'bg-brand-green text-black shadow-lg shadow-brand-green/20'
                                : 'bg-dark-card border border-dark-border text-slate-400'
                                }`}
                        >
                            <Icon size={13} />
                            {label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                    >
                        {/* ══ LAND TAB ══════════════════════════════════════════════ */}
                        {mode === 'land' && (
                            <div className="space-y-4">
                                <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-4">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                        <MapPin size={15} className="text-brand-green" /> Land Value Calculator
                                    </h3>

                                    {/* Area + Unit selector */}
                                    <Field label="Area" value={landArea} onChange={setLandArea} type="number" placeholder="e.g. 2000" />
                                    <div>
                                        <label className="text-xs text-slate-400 mb-2 block">Unit</label>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {UNIT_KEYS.map(u => (
                                                <button
                                                    key={u}
                                                    onClick={() => setLandUnit(u)}
                                                    className={`py-2 rounded-lg text-[10px] font-semibold transition-all ${landUnit === u
                                                        ? 'bg-brand-green text-black'
                                                        : 'bg-dark-bg border border-dark-border text-slate-400'
                                                        }`}
                                                >
                                                    {UNIT_SHORT_LABELS[u]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <Field label="Price per Unit (₹)" value={landPrice} onChange={setLandPrice} type="number" prefix="₹" placeholder="e.g. 3000" />
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={calculateLand}
                                    className="w-full py-4 bg-gradient-to-r from-brand-green to-emerald-500 text-black font-bold rounded-xl"
                                >
                                    Calculate Land Value
                                </motion.button>

                                {landResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-3"
                                    >
                                        {/* Main result */}
                                        <div className="bg-gradient-to-br from-brand-green/15 to-emerald-900/10 border border-brand-green/30 rounded-2xl p-5 text-center">
                                            <p className="text-slate-400 text-xs mb-1">Estimated Land Value</p>
                                            <p className="text-3xl font-extrabold text-brand-green">
                                                {fmt(landResult.totalValue)}
                                            </p>
                                            <p className="text-slate-500 text-xs mt-2">
                                                {landArea} {UNIT_LABELS[landUnit]} × {fmt(Number(landPrice))} per unit
                                            </p>
                                        </div>

                                        {/* Converted areas */}
                                        <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
                                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Area Conversions</p>
                                            <div className="space-y-2">
                                                {landResult.conversions.map(c => (
                                                    <div key={c.key} className="flex justify-between items-center">
                                                        <span className="text-slate-500 text-xs">{landArea} {UNIT_LABELS[landUnit]} =</span>
                                                        <span className="text-white text-xs font-semibold">{c.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => addSaved({ id: Date.now().toString(), type: 'Land Value', inputs: { landArea, landUnit, landPrice }, result: { primary: landResult.totalValue }, timestamp: Date.now() })}
                                                className="py-3 rounded-xl bg-brand-purple/20 border border-brand-purple/30 text-brand-purple text-xs font-bold"
                                            >
                                                Save
                                            </button>
                                            <button onClick={handleExportPDF} className="py-3 rounded-xl bg-slate-700 text-slate-300 text-xs font-bold">
                                                📄 PDF
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Stamp Duty Calculator */}
                                <StampDutySection
                                    sdValue={sdValue} setSdValue={setSdValue}
                                    sdState={sdState} setSdState={setSdState}
                                    sdStampPct={sdStampPct} setSdStampPct={setSdStampPct}
                                    sdRegPct={sdRegPct} setSdRegPct={setSdRegPct}
                                    sdTransferPct={sdTransferPct} setSdTransferPct={setSdTransferPct}
                                    sdResult={sdResult} calculateSD={calculateSD}
                                    onDownloadPDF={handleStampDutyPDF}
                                />

                                {/* Home Loan EMI */}
                                <HomeLoanSection
                                    loanAmt={loanAmt} setLoanAmt={setLoanAmt}
                                    loanRate={loanRate} setLoanRate={setLoanRate}
                                    loanTenure={loanTenure} setLoanTenure={setLoanTenure}
                                    emiResult={emiResult} calculateEMI={calculateEMI}
                                    onDownloadPDF={handleHomeLoanPDF}
                                />
                            </div>
                        )}

                        {/* ══ FLAT / APARTMENT TAB ══════════════════════════════════ */}
                        {mode === 'flat' && (
                            <div className="space-y-4">
                                <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                        <Building2 size={15} className="text-brand-green" /> Flat / Apartment Price
                                    </h3>
                                    <Field label="Built-up Area (sq.ft)" value={builtUp} onChange={setBuiltUp} type="number" placeholder="e.g. 1200" />
                                    <Field label="Carpet Area (sq.ft) — optional" value={carpet} onChange={setCarpet} type="number" placeholder="e.g. 900" />
                                    <Field label="Price per sq.ft (₹)" value={ppsf} onChange={setPpsf} type="number" prefix="₹" placeholder="e.g. 7000" />
                                    <div className="grid grid-cols-3 gap-2">
                                        <Field label="Parking (₹)" value={parking} onChange={setParking} type="number" prefix="₹" placeholder="0" />
                                        <Field label="Amenities (₹)" value={amenities} onChange={setAmenities} type="number" prefix="₹" placeholder="0" />
                                        <Field label="Maintenance (₹)" value={maint} onChange={setMaint} type="number" prefix="₹" placeholder="0" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 mb-2 block">GST Rate</label>
                                        <div className="flex gap-2">
                                            {['5', '12', '18', '28'].map(g => (
                                                <button key={g} onClick={() => setGstPct(g)}
                                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${gstPct === g ? 'bg-brand-green text-black' : 'bg-dark-bg border border-dark-border text-slate-400'}`}>
                                                    {g}%
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <motion.button whileTap={{ scale: 0.97 }} onClick={calculateFlat}
                                    className="w-full py-4 bg-gradient-to-r from-brand-green to-emerald-500 text-black font-bold rounded-xl">
                                    Calculate Property Cost
                                </motion.button>

                                {flatResult && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                                        {/* Breakdown card */}
                                        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-2.5">
                                            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Cost Breakdown</p>
                                            <CostRow label={`Base Price (${builtUp} × ${fmt(Number(ppsf))})`} value={flatResult.basePrice} />
                                            {flatResult.parkingAmt > 0 && <CostRow label="Parking Charges" value={flatResult.parkingAmt} />}
                                            {flatResult.amenitiesAmt > 0 && <CostRow label="Club / Amenities" value={flatResult.amenitiesAmt} />}
                                            {flatResult.maintAmt > 0 && <CostRow label="Maintenance Deposit" value={flatResult.maintAmt} />}
                                            <div className="border-t border-slate-700 pt-2">
                                                <CostRow label="Subtotal" value={flatResult.subtotal} />
                                            </div>
                                            <CostRow label={`GST (${gstPct}%)`} value={flatResult.gstAmt} accent="text-yellow-400" />
                                            <div className="border-t border-brand-green/30 pt-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-white text-sm font-bold">Total Property Cost</span>
                                                    <span className="text-brand-green text-xl font-extrabold">{fmt(flatResult.totalCost)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Carpet vs Builtup efficiency */}
                                        {carpet && Number(carpet) > 0 && (
                                            <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
                                                <p className="text-slate-400 text-xs mb-2">Carpet Efficiency</p>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${Math.min((Number(carpet) / Number(builtUp)) * 100, 100)}%` }}
                                                            transition={{ duration: 0.6 }}
                                                            className="h-full bg-brand-green rounded-full"
                                                        />
                                                    </div>
                                                    <span className="text-brand-green font-bold text-sm">
                                                        {((Number(carpet) / Number(builtUp)) * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <p className="text-slate-500 text-xs mt-1">{carpet} sq.ft carpet of {builtUp} sq.ft built-up</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => addSaved({ id: Date.now().toString(), type: 'Flat Price', inputs: { builtUp, carpet, ppsf, parking, amenities, maint, gstPct }, result: { primary: flatResult.totalCost }, timestamp: Date.now() })}
                                                className="py-3 rounded-xl bg-brand-purple/20 border border-brand-purple/30 text-brand-purple text-xs font-bold">Save</button>
                                            <button onClick={handleExportPDF} className="py-3 rounded-xl bg-slate-700 text-slate-300 text-xs font-bold">📄 PDF</button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Stamp Duty + EMI on flat tab too */}
                                <StampDutySection sdValue={sdValue} setSdValue={setSdValue} sdState={sdState} setSdState={setSdState} sdStampPct={sdStampPct} setSdStampPct={setSdStampPct} sdRegPct={sdRegPct} setSdRegPct={setSdRegPct} sdTransferPct={sdTransferPct} setSdTransferPct={setSdTransferPct} sdResult={sdResult} calculateSD={calculateSD} onDownloadPDF={handleStampDutyPDF} />
                                <HomeLoanSection loanAmt={loanAmt} setLoanAmt={setLoanAmt} loanRate={loanRate} setLoanRate={setLoanRate} loanTenure={loanTenure} setLoanTenure={setLoanTenure} emiResult={emiResult} calculateEMI={calculateEMI} onDownloadPDF={handleHomeLoanPDF} />
                            </div>
                        )}

                        {/* ══ CONVERT / REFERENCE TAB ═══════════════════════════════ */}
                        {mode === 'convert' && (
                            <div className="space-y-4">
                                {/* Converter */}
                                <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3">
                                    <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                                        <ArrowRightLeft size={15} className="text-brand-green" /> Unit Converter
                                    </h3>
                                    <Field label="Value" value={convVal} onChange={setConvVal} type="number" placeholder="e.g. 1" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">From</label>
                                            <select value={fromUnit} onChange={e => setFromUnit(e.target.value)}
                                                className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-3 text-white text-sm focus:outline-none focus:border-brand-green">
                                                {UNIT_KEYS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 mb-1 block">To</label>
                                            <select value={toUnit} onChange={e => setToUnit(e.target.value)}
                                                className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-3 text-white text-sm focus:outline-none focus:border-brand-green">
                                                {UNIT_KEYS.map(u => <option key={u} value={u}>{UNIT_LABELS[u]}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    {convVal && (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                            className="p-4 rounded-xl bg-gradient-to-r from-brand-green/10 to-brand-blue/10 border border-brand-green/30 text-center">
                                            <p className="text-slate-400 text-xs mb-1">{convVal} {UNIT_LABELS[fromUnit]} =</p>
                                            <p className="text-2xl font-bold text-brand-green">{convertedVal()}</p>
                                            <p className="text-slate-400 text-xs mt-1">{UNIT_LABELS[toUnit]}</p>
                                            <button
                                                onClick={() => copyText(`${convVal} ${UNIT_LABELS[fromUnit]} = ${convertedVal()} ${UNIT_LABELS[toUnit]}`, 'conv')}
                                                className="mt-3 flex items-center gap-1 text-xs text-slate-400 mx-auto"
                                            >
                                                {copied === 'conv' ? <Check size={12} className="text-brand-green" /> : <Copy size={12} />}
                                                {copied === 'conv' ? 'Copied!' : 'Copy'}
                                            </button>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Quick Reference Table */}
                                <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
                                    <h3 className="text-white font-semibold text-sm mb-1">Quick Reference</h3>
                                    <p className="text-slate-500 text-xs mb-3">Tap any row to copy</p>
                                    <div className="space-y-0">
                                        {REF_UNITS.map(u => {
                                            const sqftVal = UNIT_CONV[u].toLocaleString('en-IN');
                                            const copyKey = `ref-${u}`;
                                            return (
                                                <motion.button
                                                    key={u}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => copyText(`1 ${UNIT_LABELS[u]} = ${sqftVal} sq.ft`, copyKey)}
                                                    className="w-full flex justify-between items-center py-3 border-b border-dark-border last:border-0 text-left"
                                                >
                                                    <span className="text-slate-400 text-sm">1 {UNIT_LABELS[u]}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white text-sm font-semibold">{sqftVal} sq.ft</span>
                                                        {copied === copyKey
                                                            ? <Check size={13} className="text-brand-green" />
                                                            : <Copy size={12} className="text-slate-600" />
                                                        }
                                                    </div>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* All conversions from sq.ft */}
                                <div className="bg-dark-card border border-dark-border rounded-2xl p-4">
                                    <h3 className="text-white font-semibold text-sm mb-3">Complete Conversion Chart</h3>
                                    <p className="text-slate-500 text-[10px] mb-2">From → Square Feet</p>
                                    <div className="space-y-1">
                                        {UNIT_KEYS.map(u => {
                                            const sqftVal = UNIT_CONV[u];
                                            const display = sqftVal >= 1000
                                                ? sqftVal.toLocaleString('en-IN')
                                                : sqftVal.toLocaleString('en-IN', { maximumFractionDigits: 4 });
                                            return (
                                                <div key={u} className="flex justify-between py-1.5 border-b border-dark-border/60 last:border-0">
                                                    <span className="text-slate-400 text-xs">1 {UNIT_LABELS[u]}</span>
                                                    <span className="text-white text-xs font-medium">{display} sq.ft</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* ── Rental Yield Estimation ──────────────────────────────────── */}
                <div className="mt-6 bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">📊 Rental Yield Estimation</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Property Value" value={ryPropertyValue} onChange={setRyPropertyValue} prefix="₹" type="number" />
                        <Field label="Monthly Rent" value={ryMonthlyRent} onChange={setRyMonthlyRent} prefix="₹" type="number" />
                        <Field label="Monthly Maintenance" value={ryMaintenance} onChange={setRyMaintenance} prefix="₹" type="number" />
                        <Field label="Vacant Months/Year" value={ryVacancy} onChange={setRyVacancy} type="number" />
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={calculateRentalYield}
                        className="w-full py-3 bg-brand-green text-white font-bold rounded-xl text-sm shadow-lg shadow-brand-green/20">
                        Calculate Yield
                    </motion.button>
                    {ryResult && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 mt-2">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Annual Rent Income', value: fmt(ryResult.annualRent), color: 'text-brand-green' },
                                    { label: 'Gross Yield', value: `${ryResult.grossYield.toFixed(2)}%`, color: 'text-blue-400' },
                                    { label: 'Net Yield', value: `${ryResult.netYield.toFixed(2)}%`, color: 'text-brand-gold' },
                                    { label: 'Payback Period', value: `${ryResult.paybackYears.toFixed(1)} yrs`, color: 'text-brand-purple' },
                                ].map(s => (
                                    <div key={s.label} className="text-center p-3 rounded-xl bg-slate-800/30">
                                        <p className="text-slate-500 text-[9px] uppercase font-bold">{s.label}</p>
                                        <p className={`font-bold text-sm mt-1 ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleRentalYieldPDF}
                                className="w-full py-3 rounded-xl bg-brand-green/10 border border-brand-green/30 text-brand-green text-xs font-bold flex items-center justify-center gap-2">
                                <Download size={14} /> Download Rental Yield Report
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* ── Property Appreciation Forecast ───────────────────────────── */}
                <div className="mt-4 bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3 mb-10">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">📈 Appreciation Forecast</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Current Property Value" value={apCurrentValue} onChange={setApCurrentValue} prefix="₹" type="number" />
                        <Field label="Annual Appreciation %" value={apRate} onChange={setApRate} suffix="%" type="number" />
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={calculateAppreciation}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-600/20">
                        Forecast Value
                    </motion.button>
                    {apResult && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 mt-2">
                            {apResult.projections.map((p: { years: number; value: number; gain: number }) => (
                                <div key={p.years} className="flex justify-between items-center p-3 rounded-xl bg-slate-800/30">
                                    <div>
                                        <p className="text-white font-bold text-sm">{p.years} Years</p>
                                        <p className="text-slate-500 text-[10px]">Gain: {fmt(p.gain)}</p>
                                    </div>
                                    <p className="text-brand-green font-extrabold text-sm">{fmt(p.value)}</p>
                                </div>
                            ))}
                            <button onClick={handleAppreciationPDF}
                                className="w-full py-3 rounded-xl bg-indigo-600/10 border border-indigo-600/30 text-indigo-400 text-xs font-bold flex items-center justify-center gap-2 mt-2">
                                <Download size={14} /> Download Appreciation Report
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Stamp Duty Section ───────────────────────────────────────────────────────
function StampDutySection({
    sdValue, setSdValue,
    sdState, setSdState,
    sdStampPct, setSdStampPct,
    sdRegPct, setSdRegPct,
    sdTransferPct, setSdTransferPct,
    sdResult, calculateSD, onDownloadPDF
}: {
    sdValue: string; setSdValue: (v: string) => void;
    sdState: string; setSdState: (v: string) => void;
    sdStampPct: string; setSdStampPct: (v: string) => void;
    sdRegPct: string; setSdRegPct: (v: string) => void;
    sdTransferPct: string; setSdTransferPct: (v: string) => void;
    sdResult: { stamp: number; reg: number; transfer: number; total: number } | null;
    calculateSD: () => void;
    onDownloadPDF: () => void;
}) {
    // When state changes, pre-fill the editable rate fields
    const handleStateChange = (key: string) => {
        setSdState(key);
        const r = STATE_RATES[key];
        setSdStampPct(r.stamp.toString());
        setSdRegPct(r.reg.toString());
        setSdTransferPct(r.transfer.toString());
    };

    return (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <FileText size={15} className="text-yellow-400" /> Stamp Duty Calculator
                </h3>
                <span className="text-[10px] text-yellow-400/70 bg-yellow-400/10 rounded px-1.5 py-0.5">Rates Editable</span>
            </div>

            {/* Disclaimer note */}
            <div className="p-2.5 bg-amber-100/40 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/20 rounded-lg">
                <p className="text-amber-900 dark:text-amber-300/80 text-[10px] leading-relaxed font-medium">
                    Disclaimer: Rates vary by state and category. Verify with local sub-registrar office.
                </p>
            </div>

            <Field label="Property Value (₹)" value={sdValue} onChange={setSdValue} type="number" prefix="₹" placeholder="e.g. 5000000" />

            {/* State selector */}
            <div>
                <label className="text-xs text-slate-400 mb-1 block">State (pre-fills standard rates)</label>
                <select value={sdState} onChange={e => handleStateChange(e.target.value)}
                    className="w-full bg-dark-bg border border-dark-border rounded-xl py-3 px-3 text-white text-sm focus:outline-none focus:border-brand-green">
                    {Object.entries(STATE_RATES).map(([k, v]) => (
                        <option key={k} value={k}>{v.name}</option>
                    ))}
                </select>
            </div>

            {/* Editable rate fields */}
            <div className="grid grid-cols-3 gap-2">
                <div>
                    <label className="text-[10px] text-slate-400 mb-1 block">Stamp Duty %</label>
                    <div className="relative">
                        <input type="number" value={sdStampPct} onChange={e => setSdStampPct(e.target.value)}
                            className="w-full bg-dark-bg border border-yellow-400/30 rounded-xl py-3 pr-6 pl-3 text-white text-sm focus:outline-none focus:border-yellow-400" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] text-slate-400 mb-1 block">Reg. Charges %</label>
                    <div className="relative">
                        <input type="number" value={sdRegPct} onChange={e => setSdRegPct(e.target.value)}
                            className="w-full bg-dark-bg border border-yellow-400/30 rounded-xl py-3 pr-6 pl-3 text-white text-sm focus:outline-none focus:border-yellow-400" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] text-slate-400 mb-1 block">Transfer Duty %</label>
                    <div className="relative">
                        <input type="number" value={sdTransferPct} onChange={e => setSdTransferPct(e.target.value)}
                            className="w-full bg-dark-bg border border-yellow-400/30 rounded-xl py-3 pr-6 pl-3 text-white text-sm focus:outline-none focus:border-yellow-400" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">%</span>
                    </div>
                </div>
            </div>

            <motion.button whileTap={{ scale: 0.97 }} onClick={calculateSD}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-bold rounded-xl text-sm">
                Calculate Registration Cost
            </motion.button>

            {sdResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 pt-1">
                    <CostRow label={`Stamp Duty (${sdStampPct}%)`} value={sdResult.stamp} />
                    <CostRow label={`Registration Charges (${sdRegPct}%)`} value={sdResult.reg} />
                    {sdResult.transfer > 0 && <CostRow label={`Transfer Duty (${sdTransferPct}%)`} value={sdResult.transfer} />}
                    <div className="border-t border-yellow-400/30 pt-2 flex justify-between items-center">
                        <span className="text-white text-sm font-bold">Total Registration Cost</span>
                        <span className="text-yellow-400 text-lg font-extrabold">₹{Math.round(sdResult.total).toLocaleString('en-IN')}</span>
                    </div>
                    <button onClick={onDownloadPDF}
                        className="w-full py-3 rounded-xl bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-bold flex items-center justify-center gap-2 mt-3">
                        📄 Download Stamp Duty Report
                    </button>
                </motion.div>
            )}
        </div>
    );
}

// ─── Home Loan EMI Section ────────────────────────────────────────────────────
function HomeLoanSection({
    loanAmt, setLoanAmt, loanRate, setLoanRate, loanTenure, setLoanTenure, emiResult, calculateEMI, onDownloadPDF
}: {
    loanAmt: string; setLoanAmt: (v: string) => void;
    loanRate: string; setLoanRate: (v: string) => void;
    loanTenure: string; setLoanTenure: (v: string) => void;
    emiResult: { emi: number; totalInterest: number; totalPayment: number } | null;
    calculateEMI: () => void;
    onDownloadPDF: () => void;
}) {
    return (
        <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                <Home size={15} className="text-brand-purple" /> Home Loan EMI
            </h3>
            <Field label="Loan Amount (₹)" value={loanAmt} onChange={setLoanAmt} type="number" prefix="₹" placeholder="e.g. 6000000" />
            <div className="grid grid-cols-2 gap-2">
                <Field label="Interest Rate (% p.a.)" value={loanRate} onChange={setLoanRate} type="number" suffix="%" placeholder="8.5" />
                <Field label="Tenure (years)" value={loanTenure} onChange={setLoanTenure} type="number" suffix=" yrs" placeholder="20" />
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={calculateEMI}
                className="w-full py-3 bg-brand-purple text-white font-bold rounded-xl text-sm shadow-lg shadow-brand-purple/20">
                Calculate EMI
            </motion.button>
            {emiResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="p-4 bg-brand-purple/10 border border-brand-purple/20 rounded-xl text-center mb-3">
                        <p className="text-slate-400 text-xs mb-1">Monthly EMI</p>
                        <p className="text-2xl font-extrabold text-brand-purple">₹{Math.round(emiResult.emi).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="space-y-2">
                        <CostRow label="Principal" value={Number(loanAmt)} />
                        <CostRow label="Total Interest" value={emiResult.totalInterest} accent="text-red-400" />
                        <div className="border-t border-slate-700 pt-2">
                            <CostRow label="Total Payment" value={emiResult.totalPayment} />
                        </div>
                    </div>
                    <button onClick={onDownloadPDF}
                        className="w-full py-3 rounded-xl bg-brand-purple/10 border border-brand-purple/30 text-brand-purple text-xs font-bold flex items-center justify-center gap-2 mt-3">
                        📄 Download EMI Report
                    </button>
                </motion.div>
            )}
        </div>
    );
}

// ─── Reusable Field ───────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text', prefix, suffix, placeholder }: {
    label: string; value: string; onChange: (v: string) => void;
    type?: string; prefix?: string; suffix?: string; placeholder?: string;
}) {
    return (
        <div>
            <label className="text-xs text-slate-400 mb-1 block">{label}</label>
            <div className="relative">
                {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{prefix}</span>}
                <input
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`w-full bg-dark-bg border border-dark-border rounded-xl py-3 text-white text-sm focus:outline-none focus:border-brand-green transition-colors ${prefix ? 'pl-8 pr-4' : suffix ? 'pl-4 pr-8' : 'px-4'}`}
                />
                {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{suffix}</span>}
            </div>
        </div>
    );
}

// ─── Cost Row ─────────────────────────────────────────────────────────────────
function CostRow({ label, value, accent }: { label: string; value: number; accent?: string }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs">{label}</span>
            <span className={`font-semibold text-sm ${accent || 'text-white'}`}>
                ₹{Math.round(value).toLocaleString('en-IN')}
            </span>
        </div>
    );
}