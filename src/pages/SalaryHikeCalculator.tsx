import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Info, Share2, TrendingUp, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import NumberInput from '../components/NumberInput';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { formatINR } from '../utils/calculations';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { Save, Check } from 'lucide-react';
import { exportToPDF, exportToExcel, ExportConfig } from '../utils/exportReport';
import CalculatorInfoModal from '../components/CalculatorInfoModal';
import { AnalyticsService } from '../lib/analytics';
import { nativeShare } from '../utils/nativeShare';

// India FY 2026-27 industry avg hike benchmarks (Source: Aon Salary Survey 2026, EY Future of Pay 2026)
const INDUSTRY_BENCHMARKS: { name: string; avg: number; top: number }[] = [
    { name: 'IT / Software', avg: 11.0, top: 18 },
    { name: 'AI / ML / Cybersecurity', avg: 15.0, top: 25 },
    { name: 'GCC / Global Captives', avg: 10.4, top: 18 },
    { name: 'BFSI', avg: 10.0, top: 17 },
    { name: 'Pharma / Life Sciences', avg: 9.7, top: 16 },
    { name: 'Manufacturing / Auto', avg: 9.5, top: 15 },
    { name: 'E-Commerce / Retail', avg: 9.9, top: 17 },
    { name: 'FMCG / Consumer', avg: 9.0, top: 15 },
    { name: 'Startups', avg: 12.0, top: 25 },
    { name: 'Consulting', avg: 10.0, top: 20 },
    { name: 'India Overall Avg', avg: 9.1, top: 18 },
];
const INDIA_INFLATION = 4.8; // CPI FY 2026-27 estimate (RBI)

// Simple tax slab function — new regime FY 2026-27
function estimateTaxOnIncome(annual: number): number {
    if (annual <= 400000) return 0;
    let tax = 0;
    const slabs = [
        { upto: 800000, rate: 0.05 },
        { upto: 1200000, rate: 0.10 },
        { upto: 1600000, rate: 0.15 },
        { upto: 2000000, rate: 0.20 },
        { upto: 2400000, rate: 0.25 },
        { upto: Infinity, rate: 0.30 },
    ];
    let prev = 400000;
    for (const slab of slabs) {
        if (annual <= prev) break;
        const taxable = Math.min(annual, slab.upto) - prev;
        tax += taxable * slab.rate;
        prev = slab.upto;
    }
    // Rebate u/s 87A: no tax if taxable income (after std ded, already deducted by caller) ≤ 12L
    if (annual <= 1200000) return 0;
    return tax * 1.04; // + 4% cess
}

export default function SalaryHikeCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Salary_Hike'); }, []);
    useTrackCalculator();
    const navigate = useNavigate();

    // Mode: 'findHike' | 'findSalary' | 'ctcBreakdown' | 'compare'
    const [mode, setMode] = useState<'findHike' | 'findSalary' | 'ctcBreakdown' | 'compare'>('findSalary');

    const [currentSalary, setCurrentSalary] = useState(1300000);
    const [newSalaryInput, setNewSalaryInput] = useState(1800000);
    const [hikePct, setHikePct] = useState(10);
    const [period, setPeriod] = useState(1);
    const [periodUnit, setPeriodUnit] = useState<'months' | 'years'>('years');
    const [selectedIndustry, setSelectedIndustry] = useState('India Overall Avg');
    const [isSaved, setIsSaved] = useState(false);
    const { addHistory, addSaved, savedCalculations } = useCalculatorStore();
    const [showInfo, setShowInfo] = useState(false);

    // CTC Breakdown inputs
    const [ctcAmount, setCtcAmount] = useState(1500000);
    const [variablePct, setVariablePct] = useState(20);
    const [achievementPct, setAchievementPct] = useState(100);
    const [fixedHikePct, setFixedHikePct] = useState(10);
    const [variableHikePct, setVariableHikePct] = useState(10);
    const [useCustomVariableHike, setUseCustomVariableHike] = useState(false);

    // Offer Comparison inputs
    const [offerA_salary, setOfferA_salary] = useState(1500000);
    const [offerA_variable, setOfferA_variable] = useState(15);
    const [offerA_joining, setOfferA_joining] = useState(0);
    const [offerA_esop, setOfferA_esop] = useState(0);
    const [offerB_salary, setOfferB_salary] = useState(1600000);
    const [offerB_variable, setOfferB_variable] = useState(20);
    const [offerB_joining, setOfferB_joining] = useState(200000);
    const [offerB_esop, setOfferB_esop] = useState(0);

    const result = useMemo(() => {
        let computedHikePct: number;
        let computedNewSalary: number;
        let hikeAmount: number;

        if (mode === 'findHike') {
            hikeAmount = newSalaryInput - currentSalary;
            computedHikePct = currentSalary > 0 ? (hikeAmount / currentSalary) * 100 : 0;
            computedNewSalary = newSalaryInput;
        } else {
            computedHikePct = hikePct;
            hikeAmount = currentSalary * (hikePct / 100);
            computedNewSalary = currentSalary + hikeAmount;
        }

        const currentMonthly = currentSalary / 12;
        const newMonthly = computedNewSalary / 12;
        const hikeMonthly = hikeAmount / 12;

        // Real (inflation-adjusted) hike
        const realHikePct = ((1 + computedHikePct / 100) / (1 + INDIA_INFLATION / 100) - 1) * 100;
        const beatsInflation = computedHikePct > INDIA_INFLATION;

        // Tax impact
        const currentTax = estimateTaxOnIncome(currentSalary - 75000); // after std ded
        const newTax = estimateTaxOnIncome(computedNewSalary - 75000);
        const additionalTax = Math.max(0, newTax - currentTax);
        const netTakeHomeIncrease = hikeAmount - additionalTax;

        // Industry benchmark
        const bench = INDUSTRY_BENCHMARKS.find(b => b.name === selectedIndustry) || INDUSTRY_BENCHMARKS[INDUSTRY_BENCHMARKS.length - 1];
        let benchStatus = '';
        if (computedHikePct >= bench.top * 0.8) benchStatus = 'Excellent — Top Performer';
        else if (computedHikePct >= bench.avg) benchStatus = 'Above Average';
        else if (computedHikePct >= bench.avg * 0.7) benchStatus = 'Below Average';
        else benchStatus = 'Significantly Below Market';

        const projection: { month: number; salary: number; cumulative: number; year: number; isNewYear: boolean }[] = [];
        let cumulative = 0;
        const yearsToProject = periodUnit === 'years' ? period : Math.ceil(period / 12);
        const maxYears = Math.max(yearsToProject + 1, 2);

        for (let yr = 1; yr <= maxYears; yr++) {
            cumulative = 0;
            const monthlySalary = yr === 1 ? currentMonthly : (currentSalary * Math.pow(1 + computedHikePct / 100, yr - 1)) / 12;
            for (let m = 1; m <= 12; m++) {
                cumulative += monthlySalary;
                projection.push({
                    month: (yr - 1) * 12 + m,
                    salary: Math.round(monthlySalary),
                    cumulative: Math.round(cumulative),
                    year: yr,
                    isNewYear: m === 1 && yr > 1,
                });
            }
        }

        return {
            hikeAmount,
            hikeMonthly,
            hikePctComputed: computedHikePct,
            newSalary: computedNewSalary,
            currentMonthly,
            newMonthly,
            currentAnnual: currentSalary,
            newAnnual: computedNewSalary,
            annualIncrease: hikeAmount,
            realHikePct,
            beatsInflation,
            currentTax,
            newTax,
            additionalTax,
            netTakeHomeIncrease,
            bench,
            benchStatus,
            projection,
        };
    }, [currentSalary, newSalaryInput, hikePct, period, periodUnit, mode, selectedIndustry]);

    // CTC Breakdown computation
    const ctcResult = useMemo(() => {
        const varPct = Math.min(Math.max(variablePct, 0), 100) / 100;
        const achPct = Math.min(Math.max(achievementPct, 0), 150) / 100;
        const effVariableHike = useCustomVariableHike ? variableHikePct : fixedHikePct;

        const currentFixed = ctcAmount * (1 - varPct);
        const currentVariableTarget = ctcAmount * varPct;
        const currentVariableActual = currentVariableTarget * achPct;

        const newFixed = currentFixed * (1 + fixedHikePct / 100);
        const fixedHikeAmount = newFixed - currentFixed;

        const newCTC = newFixed / (1 - varPct);
        const newVariableTarget = newCTC * varPct;
        const newVariableActual = newVariableTarget * achPct;

        const basic = newFixed * 0.5;
        const pfAnnual = basic * 0.12;
        const profTaxAnnual = 200 * 12;
        const estimatedTakeHomeAnnual = newFixed - pfAnnual - profTaxAnnual;
        const estimatedTakeHomeMonthly = estimatedTakeHomeAnnual / 12;
        const inHandPct = newCTC > 0 ? (estimatedTakeHomeAnnual / newCTC) * 100 : 0;

        const varAt80 = currentVariableTarget * 0.8;
        const varAt100 = currentVariableTarget;
        const varAt120 = currentVariableTarget * 1.2;

        const ctcProjection: { year: number; fixed: number; variableTarget: number; variablePayout: number; totalCTC: number }[] = [];
        const yearsToProject = periodUnit === 'years' ? period : Math.ceil(period / 12);
        const maxYears = Math.max(yearsToProject + 1, 2);
        for (let yr = 1; yr <= maxYears; yr++) {
            const yFixed = yr === 1 ? currentFixed : currentFixed * Math.pow(1 + fixedHikePct / 100, yr - 1);
            const yVarTarget = yr === 1 ? currentVariableTarget : currentVariableTarget * Math.pow(1 + effVariableHike / 100, yr - 1);
            const yVarPayout = yVarTarget * achPct;
            const yTotalCTC = yFixed + yVarTarget;
            ctcProjection.push({ year: yr, fixed: Math.round(yFixed), variableTarget: Math.round(yVarTarget), variablePayout: Math.round(yVarPayout), totalCTC: Math.round(yTotalCTC) });
        }

        return {
            currentFixed, currentVariableTarget, currentVariableActual,
            newFixed, fixedHikeAmount, newVariableTarget, newVariableActual, newCTC,
            basic, pfAnnual, profTaxAnnual, estimatedTakeHomeAnnual, estimatedTakeHomeMonthly,
            inHandPct, varAt80, varAt100, varAt120, ctcProjection, effVariableHike,
        };
    }, [ctcAmount, variablePct, achievementPct, fixedHikePct, variableHikePct, useCustomVariableHike, period, periodUnit]);

    // Offer Comparison computation
    const compareResult = useMemo(() => {
        const calcOffer = (fixed: number, varPct: number, joining: number, esop: number) => {
            const varTarget = fixed * (varPct / 100);
            const totalCTC = fixed + varTarget;
            const basic = fixed * 0.5;
            const pf = basic * 0.12;
            const profTax = 2400;
            const takeHomeAnnual = fixed - pf - profTax;
            const takeHomeMonthly = takeHomeAnnual / 12;
            const totalYear1 = takeHomeAnnual + varTarget + joining;
            const totalYear1CTC = totalCTC + joining;
            return { fixed, varTarget, totalCTC, basic, pf, takeHomeAnnual, takeHomeMonthly, totalYear1, totalYear1CTC, joining, esop };
        };
        const a = calcOffer(offerA_salary, offerA_variable, offerA_joining, offerA_esop);
        const b = calcOffer(offerB_salary, offerB_variable, offerB_joining, offerB_esop);
        const betterCTC = a.totalCTC >= b.totalCTC ? 'A' : 'B';
        const betterTakeHome = a.takeHomeAnnual >= b.takeHomeAnnual ? 'A' : 'B';
        const betterYear1 = a.totalYear1 >= b.totalYear1 ? 'A' : 'B';
        return { a, b, betterCTC, betterTakeHome, betterYear1 };
    }, [offerA_salary, offerA_variable, offerA_joining, offerA_esop, offerB_salary, offerB_variable, offerB_joining, offerB_esop]);

    const handleDownloadPDF = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;

        if (mode === 'ctcBreakdown') {
            const config: ExportConfig = {
                title: 'Salary Hike — Full CTC Breakdown Report',
                inputs: [
                    { label: 'Current Total CTC (Annual)', value: `₹${Math.round(ctcAmount).toLocaleString('en-IN')}` },
                    { label: 'Variable Pay %', value: `${variablePct}%` },
                    { label: 'Achievement %', value: `${achievementPct}%` },
                    { label: 'Fixed Pay Hike %', value: `${fixedHikePct}%` },
                    { label: 'Variable Hike %', value: `${ctcResult.effVariableHike}%` },
                ],
                results: [
                    { label: 'Current Fixed Pay (Annual)', value: `₹${Math.round(ctcResult.currentFixed).toLocaleString('en-IN')}` },
                    { label: 'New Fixed Pay (Annual)', value: `₹${Math.round(ctcResult.newFixed).toLocaleString('en-IN')}` },
                    { label: 'New CTC (Annual)', value: `₹${Math.round(ctcResult.newCTC).toLocaleString('en-IN')}` },
                    { label: 'Variable Payout (at achievement %)', value: `₹${Math.round(ctcResult.newVariableActual).toLocaleString('en-IN')}` },
                    { label: 'Est. Take-Home (Monthly)', value: `₹${Math.round(ctcResult.estimatedTakeHomeMonthly).toLocaleString('en-IN')}` },
                    { label: 'In-Hand % of new CTC', value: `${ctcResult.inHandPct.toFixed(1)}%` },
                ],
                projectionTitle: 'Year-wise CTC Projection',
                projectionColumns: ['Year', 'Fixed Pay', 'Variable Target', 'Variable Payout', 'Total CTC'],
                projectionRows: ctcResult.ctcProjection.map(r => [
                    `Year ${r.year}`,
                    `₹${r.fixed.toLocaleString('en-IN')}`,
                    `₹${r.variableTarget.toLocaleString('en-IN')}`,
                    `₹${r.variablePayout.toLocaleString('en-IN')}`,
                    `₹${r.totalCTC.toLocaleString('en-IN')}`,
                ]),
                filename: `FinCalix_CTC_Breakdown_${tag}`,
            };
            await exportToPDF(config);
            return;
        }

        if (mode === 'compare') {
            const { a, b } = compareResult;
            const config: ExportConfig = {
                title: 'Salary Hike — Offer Comparison Report',
                inputs: [
                    { label: 'Offer A Fixed CTC', value: `₹${Math.round(a.fixed).toLocaleString('en-IN')}` },
                    { label: 'Offer A Variable %', value: `${offerA_variable}%` },
                    { label: 'Offer B Fixed CTC', value: `₹${Math.round(b.fixed).toLocaleString('en-IN')}` },
                    { label: 'Offer B Variable %', value: `${offerB_variable}%` },
                ],
                results: [
                    { label: 'Offer A Total CTC', value: `₹${Math.round(a.totalCTC).toLocaleString('en-IN')}` },
                    { label: 'Offer B Total CTC', value: `₹${Math.round(b.totalCTC).toLocaleString('en-IN')}` },
                    { label: 'Better CTC', value: `Offer ${compareResult.betterCTC}` },
                    { label: 'Better Take-Home', value: `Offer ${compareResult.betterTakeHome}` },
                    { label: 'Better Year 1 (incl. joining bonus)', value: `Offer ${compareResult.betterYear1}` },
                ],
                projectionTitle: '',
                projectionColumns: [],
                projectionRows: [],
                filename: `FinCalix_OfferComparison_${tag}`,
            };
            await exportToPDF(config);
            return;
        }

        const config: ExportConfig = {
            title: 'Salary Hike Calculator Report',
            inputs: [
                { label: 'Current Salary (Annual)', value: `₹${Math.round(result.currentAnnual).toLocaleString('en-IN')}` },
                { label: 'Hike Percentage', value: `${result.hikePctComputed.toFixed(1)}%` },
                { label: 'Period', value: `${period} ${periodUnit}` },
            ],
            results: [
                { label: 'New Annual CTC', value: `₹${Math.round(result.newAnnual).toLocaleString('en-IN')}` },
                { label: 'Hike Amount (Annual)', value: `₹${Math.round(result.hikeAmount).toLocaleString('en-IN')}` }, // fixed: was *12
                { label: 'New Monthly Salary', value: `₹${Math.round(result.newMonthly).toLocaleString('en-IN')}` },
                { label: 'Monthly Increase', value: `₹${Math.round(result.newMonthly - result.currentMonthly).toLocaleString('en-IN')}` },
                { label: 'Real Hike (after inflation)', value: `${result.realHikePct.toFixed(2)}%` },
                { label: 'Additional Tax (approx)', value: `₹${Math.round(result.additionalTax).toLocaleString('en-IN')}` },
            ],
            projectionTitle: 'Monthly Salary Projection',
            projectionColumns: ['Month', 'Monthly Salary', 'Cumulative Earnings'],
            projectionRows: result.projection.map((r: any) => [
                `Month ${r.month} (Yr ${r.year})`,
                `₹${Math.round(r.salary).toLocaleString('en-IN')}`,
                `₹${Math.round(r.cumulative).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_SalaryHike_Report_${tag}`,
        };
        await exportToPDF(config);
    };

    const handleDownloadExcel = async () => {
        const dt = new Date();
        const tag = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;

        if (mode === 'ctcBreakdown') {
            const config: ExportConfig = {
                title: 'Salary Hike — Full CTC Breakdown Report',
                inputs: [
                    { label: 'Current Total CTC (Annual)', value: `₹${Math.round(ctcAmount).toLocaleString('en-IN')}` },
                    { label: 'Variable Pay %', value: `${variablePct}%` },
                    { label: 'Achievement %', value: `${achievementPct}%` },
                    { label: 'Fixed Pay Hike %', value: `${fixedHikePct}%` },
                ],
                results: [
                    { label: 'Current Fixed Pay', value: `₹${Math.round(ctcResult.currentFixed).toLocaleString('en-IN')}` },
                    { label: 'New Fixed Pay', value: `₹${Math.round(ctcResult.newFixed).toLocaleString('en-IN')}` },
                    { label: 'New CTC', value: `₹${Math.round(ctcResult.newCTC).toLocaleString('en-IN')}` },
                    { label: 'Est. Monthly Take-Home', value: `₹${Math.round(ctcResult.estimatedTakeHomeMonthly).toLocaleString('en-IN')}` },
                ],
                projectionTitle: 'Year-wise CTC Projection',
                projectionColumns: ['Year', 'Fixed Pay', 'Variable Target', 'Variable Payout', 'Total CTC'],
                projectionRows: ctcResult.ctcProjection.map(r => [
                    `Year ${r.year}`,
                    `₹${r.fixed.toLocaleString('en-IN')}`,
                    `₹${r.variableTarget.toLocaleString('en-IN')}`,
                    `₹${r.variablePayout.toLocaleString('en-IN')}`,
                    `₹${r.totalCTC.toLocaleString('en-IN')}`,
                ]),
                filename: `FinCalix_CTC_Breakdown_${tag}`,
            };
            await exportToExcel(config);
            return;
        }

        if (mode === 'compare') {
            const { a, b } = compareResult;
            const config: ExportConfig = {
                title: 'Salary Hike — Offer Comparison Report',
                inputs: [
                    { label: 'Offer A Fixed CTC', value: `₹${Math.round(a.fixed).toLocaleString('en-IN')}` },
                    { label: 'Offer B Fixed CTC', value: `₹${Math.round(b.fixed).toLocaleString('en-IN')}` },
                ],
                results: [
                    { label: 'Offer A Total CTC', value: `₹${Math.round(a.totalCTC).toLocaleString('en-IN')}` },
                    { label: 'Offer B Total CTC', value: `₹${Math.round(b.totalCTC).toLocaleString('en-IN')}` },
                    { label: 'Better CTC', value: `Offer ${compareResult.betterCTC}` },
                ],
                projectionTitle: 'Offer Comparison Details',
                projectionColumns: ['Metric', 'Offer A', 'Offer B'],
                projectionRows: [
                    ['Fixed CTC', `₹${Math.round(a.fixed).toLocaleString('en-IN')}`, `₹${Math.round(b.fixed).toLocaleString('en-IN')}`],
                    ['Variable Target', `₹${Math.round(a.varTarget).toLocaleString('en-IN')}`, `₹${Math.round(b.varTarget).toLocaleString('en-IN')}`],
                    ['Total CTC', `₹${Math.round(a.totalCTC).toLocaleString('en-IN')}`, `₹${Math.round(b.totalCTC).toLocaleString('en-IN')}`],
                    ['Est. Take-Home/mo', `₹${Math.round(a.takeHomeMonthly).toLocaleString('en-IN')}`, `₹${Math.round(b.takeHomeMonthly).toLocaleString('en-IN')}`],
                    ['Joining Bonus', `₹${Math.round(a.joining).toLocaleString('en-IN')}`, `₹${Math.round(b.joining).toLocaleString('en-IN')}`],
                    ['Total Year 1 Value', `₹${Math.round(a.totalYear1).toLocaleString('en-IN')}`, `₹${Math.round(b.totalYear1).toLocaleString('en-IN')}`],
                ],
                filename: `FinCalix_OfferComparison_${tag}`,
            };
            await exportToExcel(config);
            return;
        }

        const config: ExportConfig = {
            title: 'Salary Hike Calculator Report',
            inputs: [
                { label: 'Current Annual Salary', value: `₹${Math.round(result.currentAnnual).toLocaleString('en-IN')}` },
                { label: 'Hike Percentage', value: `${result.hikePctComputed.toFixed(1)}%` },
            ],
            results: [
                { label: 'New Annual CTC', value: `₹${Math.round(result.newAnnual).toLocaleString('en-IN')}` },
                { label: 'New Monthly Salary', value: `₹${Math.round(result.newMonthly).toLocaleString('en-IN')}` },
                { label: 'Real Hike (after inflation)', value: `${result.realHikePct.toFixed(2)}%` },
            ],
            projectionTitle: 'Monthly Salary Projection',
            projectionColumns: ['Month', 'Year', 'Monthly Salary', 'Cumulative Earnings'],
            projectionRows: result.projection.map((r: any) => [
                `Month ${r.month}`,
                `Year ${r.year}`,
                `₹${Math.round(r.salary).toLocaleString('en-IN')}`,
                `₹${Math.round(r.cumulative).toLocaleString('en-IN')}`,
            ]),
            filename: `FinCalix_SalaryHike_Report_${tag}`,
        };
        await exportToExcel(config);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            addHistory({
                id: `SalaryHike-${Date.now()}`,
                calculatorType: 'Salary Hike Calculator',
                inputValues: mode === 'ctcBreakdown'
                    ? { ctcAmount, variablePct, achievementPct, fixedHikePct, mode }
                    : mode === 'compare'
                        ? { offerA_salary, offerB_salary, mode }
                        : { currentSalary, hikePct: mode === 'findHike' ? result.hikePctComputed : hikePct, period, periodUnit, mode },
                resultValues: mode === 'ctcBreakdown'
                    ? { primary: ctcResult.newCTC, ...ctcResult }
                    : mode === 'compare'
                        ? { primary: compareResult.a.totalCTC }
                        : { primary: result.newSalary, ...result },
                timestamp: Date.now(),
            });
        }, 1000);
        return () => clearTimeout(timer);
    }, [currentSalary, hikePct, newSalaryInput, period, periodUnit, mode, result.newSalary, ctcAmount, variablePct, achievementPct, fixedHikePct, ctcResult.newCTC, offerA_salary, offerB_salary, compareResult.a.totalCTC, addHistory]);

    useEffect(() => {
        try {
            const recent: string[] = JSON.parse(localStorage.getItem('fincalix_recently_used') || '[]');
            const path = window.location.pathname;
            const updated = [path, ...recent.filter((p) => p !== path)].slice(0, 6);
            localStorage.setItem('fincalix_recently_used', JSON.stringify(updated));
        } catch { }
    }, []);

    const handleSave = () => {
        addSaved({
            id: `SalaryHike-Save-${Date.now()}`,
            calculatorType: 'Salary Hike Calculator',
            inputValues: mode === 'ctcBreakdown'
                ? { ctcAmount, variablePct, achievementPct, fixedHikePct, mode }
                : mode === 'compare'
                    ? { offerA_salary, offerB_salary, mode }
                    : { currentSalary, hikePct: mode === 'findHike' ? result.hikePctComputed : hikePct, period, periodUnit },
            resultValues: mode === 'ctcBreakdown'
                ? { primary: ctcResult.newCTC, ...ctcResult }
                : mode === 'compare'
                    ? { primary: compareResult.a.totalCTC }
                    : { primary: result.newSalary, ...result },
            timestamp: Date.now(),
        });
        setIsSaved(true);
    };

    const isAlreadySaved = useMemo(() => {
        const key = mode === 'ctcBreakdown'
            ? { ctcAmount, variablePct, achievementPct, fixedHikePct, mode }
            : mode === 'compare'
                ? { offerA_salary, offerB_salary, mode }
                : { currentSalary, hikePct: mode === 'findHike' ? result.hikePctComputed : hikePct, period, periodUnit };
        return savedCalculations.some(s => s.calculatorType === 'Salary Hike Calculator' && JSON.stringify(s.inputValues) === JSON.stringify(key));
    }, [savedCalculations, currentSalary, hikePct, period, periodUnit, mode, result.hikePctComputed, ctcAmount, variablePct, achievementPct, fixedHikePct, offerA_salary, offerB_salary]);

    const modeOptions: { key: 'findHike' | 'findSalary' | 'ctcBreakdown' | 'compare'; label: string }[] = [
        { key: 'findSalary', label: 'Find Hike %' },
        { key: 'findHike', label: 'Find New Salary' },
        { key: 'ctcBreakdown', label: 'CTC Breakdown' },
        { key: 'compare', label: 'Compare Offers' },
    ];

    const benchmarkItem = INDUSTRY_BENCHMARKS.find(b => b.name === selectedIndustry) || INDUSTRY_BENCHMARKS[INDUSTRY_BENCHMARKS.length - 1];
    const benchColor =
        result.hikePctComputed >= benchmarkItem.top * 0.8 ? 'text-brand-green' :
        result.hikePctComputed >= benchmarkItem.avg ? 'text-brand-blue' :
        result.hikePctComputed >= benchmarkItem.avg * 0.7 ? 'text-amber-500' : 'text-red-400';

    return (
        <div className="min-h-dvh bg-white dark:bg-background animate-fade-in">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-[#0F172A] px-4 pt-14 pb-3 border-b border-slate-200 dark:border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <ArrowLeft size={18} className="text-muted-foreground dark:text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-foreground">Salary Hike Calculator</h1>
                            <p className="text-muted-foreground text-xs">Plan your increment</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowInfo(true)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <Info size={16} className="text-muted-foreground" />
                        </button>
                        <button
                            className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border"
                            onClick={() => nativeShare('Salary Hike Calculator', `My salary after ${result.hikePctComputed.toFixed(1)}% hike: ${formatINR(result.newSalary)}`)}
                        >
                            <Share2 size={16} className="text-muted-foreground" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-32 pt-4">
                {/* Mode Selector — 4 modes */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-card border border-slate-200 dark:border-border mb-4 mt-2">
                    <p className="text-muted-foreground dark:text-muted-foreground text-xs font-semibold mb-3 uppercase tracking-wider">Calculator Mode</p>
                    <div className="grid grid-cols-2 gap-2">
                        {modeOptions.map(opt => (
                            <label
                                key={opt.key}
                                className={`flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all border ${mode === opt.key ? 'bg-brand-green/10 border-brand-green/30 dark:bg-brand-green/5' : 'bg-white dark:bg-card border-slate-200 dark:border-border'}`}
                                onClick={() => { setMode(opt.key); setIsSaved(false); }}
                            >
                                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${mode === opt.key ? 'border-brand-green' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {mode === opt.key && <div className="w-2 h-2 rounded-full bg-brand-green" />}
                                </div>
                                <span className={`text-[11px] font-medium leading-tight ${mode === opt.key ? 'text-slate-900 dark:text-foreground' : 'text-muted-foreground'}`}>{opt.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* ── MODES 1 & 2 ── */}
                {(mode === 'findSalary' || mode === 'findHike') && (
                    <>
                        <div className="space-y-3 mb-5">
                            <NumberInput
                                label="Current Annual Salary"
                                value={currentSalary}
                                onChange={setCurrentSalary}
                                min={1000}
                                max={100000000}
                                prefix="₹"
                                helperText="₹1,000 - ₹10,00,00,000"
                            />

                            {mode === 'findHike' ? (
                                <NumberInput
                                    label="New Salary"
                                    value={newSalaryInput}
                                    onChange={setNewSalaryInput}
                                    min={1000}
                                    max={100000000}
                                    prefix="₹"
                                    helperText="₹1,000 - ₹10,00,00,000"
                                />
                            ) : (
                                <NumberInput
                                    label="Expected Hike Percentage"
                                    value={hikePct}
                                    onChange={setHikePct}
                                    min={0}
                                    max={200}
                                    suffix="%"
                                    step={0.5}
                                    helperText="0% - 200%"
                                />
                            )}

                            {/* Industry selector */}
                            <div className="rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border p-4">
                                <p className="text-xs font-semibold text-muted-foreground mb-2">Your Industry (for benchmark)</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {INDUSTRY_BENCHMARKS.map(b => (
                                        <button
                                            key={b.name}
                                            onClick={() => setSelectedIndustry(b.name)}
                                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${selectedIndustry === b.name ? 'bg-brand-green text-white' : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'}`}
                                        >
                                            {b.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border p-1 mb-2">
                                    {(['months', 'years'] as const).map((u) => (
                                        <button
                                            key={u}
                                            onClick={() => {
                                                if (u === 'years' && periodUnit === 'months') setPeriod(Math.round(period / 12) || 1);
                                                if (u === 'months' && periodUnit === 'years') setPeriod(period * 12);
                                                setPeriodUnit(u);
                                            }}
                                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${periodUnit === u ? 'bg-brand-green text-white' : 'text-muted-foreground'}`}
                                        >
                                            {u}
                                        </button>
                                    ))}
                                </div>
                                <NumberInput
                                    label="Projection Period"
                                    value={period}
                                    onChange={setPeriod}
                                    min={1}
                                    max={periodUnit === 'months' ? 120 : 10}
                                    suffix={periodUnit === 'months' ? ' months' : ' years'}
                                    helperText={periodUnit === 'months' ? '1 - 120 months' : '1 - 10 years'}
                                />
                            </div>
                        </div>

                        {/* Result Card */}
                        <motion.div layout className="p-5 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border mb-4 shadow-sm">
                            <div className="text-center mb-4">
                                {mode === 'findHike' ? (
                                    <>
                                        <p className="text-muted-foreground text-sm mb-1">Hike Percentage</p>
                                        <motion.p key={result.hikePctComputed} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-bold text-brand-green">
                                            {result.hikePctComputed.toFixed(2)}%
                                        </motion.p>
                                        <p className="text-brand-blue text-sm font-medium mt-1">Hike: {formatINR(result.hikeMonthly)}/mo · {formatINR(result.hikeAmount)}/yr</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-muted-foreground text-sm mb-1">Salary After Hike</p>
                                        <motion.p key={result.newSalary} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-bold text-brand-green">
                                            {formatINR(result.newSalary)}
                                        </motion.p>
                                        <p className="text-brand-blue text-sm font-medium mt-1">Annual Increase: {formatINR(result.annualIncrease)}</p>
                                    </>
                                )}
                            </div>

                            <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-border">
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-xs">Current Annual Salary</span>
                                    <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{formatINR(result.currentAnnual)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-xs">Current Monthly Salary</span>
                                    <span className="font-semibold text-sm text-slate-600 dark:text-slate-300">{formatINR(result.currentMonthly)}</span>
                                </div>
                                {mode === 'findHike' && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-xs">New Annual Salary</span>
                                        <span className="font-semibold text-sm text-brand-blue">{formatINR(newSalaryInput)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-xs">Hike Percentage</span>
                                    <span className="font-semibold text-sm text-brand-green">{result.hikePctComputed.toFixed(2)}%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-xs">Hike Amount (Annual)</span>
                                    <span className="font-semibold text-sm text-brand-green">{formatINR(result.hikeAmount)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-xs">Hike Amount (Monthly)</span>
                                    <span className="font-semibold text-sm text-brand-green">{formatINR(result.hikeMonthly)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-xs">New Annual Salary</span>
                                    <span className="font-semibold text-sm text-brand-blue">{formatINR(result.newAnnual)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground text-xs">New Monthly Salary</span>
                                    <span className="font-semibold text-sm text-brand-blue">{formatINR(result.newMonthly)}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Real Hike vs Inflation */}
                        <div className={`rounded-2xl border mb-4 p-4 ${result.beatsInflation ? 'bg-brand-green/5 border-brand-green/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
                            <div className="flex items-center gap-2 mb-2">
                                <TrendingUp size={15} className={result.beatsInflation ? 'text-brand-green' : 'text-amber-500'} />
                                <p className="text-xs font-bold text-slate-700 dark:text-foreground">Real Hike vs Inflation</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground">Nominal Hike</p>
                                    <p className="font-bold text-sm text-slate-800 dark:text-foreground">{result.hikePctComputed.toFixed(1)}%</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground">India Inflation</p>
                                    <p className="font-bold text-sm text-amber-500">{INDIA_INFLATION}%</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-muted-foreground">Real Hike</p>
                                    <p className={`font-bold text-sm ${result.realHikePct > 0 ? 'text-brand-green' : 'text-red-400'}`}>{result.realHikePct.toFixed(2)}%</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                {result.beatsInflation
                                    ? `✓ Your hike beats inflation by ${(result.hikePctComputed - INDIA_INFLATION).toFixed(1)}%. Real purchasing power increases.`
                                    : `⚠ Your hike is below inflation (${INDIA_INFLATION}%). You need ≥${INDIA_INFLATION}% just to maintain purchasing power.`}
                            </p>
                        </div>

                        {/* Industry Benchmark */}
                        <div className="rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border mb-4 p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle size={15} className="text-brand-blue" />
                                <p className="text-xs font-bold text-slate-700 dark:text-foreground">Industry Benchmark — {selectedIndustry}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                <div className="text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2">
                                    <p className="text-[10px] text-muted-foreground">Your Hike</p>
                                    <p className={`font-bold text-sm ${benchColor}`}>{result.hikePctComputed.toFixed(1)}%</p>
                                </div>
                                <div className="text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2">
                                    <p className="text-[10px] text-muted-foreground">Avg Hike</p>
                                    <p className="font-bold text-sm text-slate-700 dark:text-foreground">{benchmarkItem.avg}%</p>
                                </div>
                                <div className="text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2">
                                    <p className="text-[10px] text-muted-foreground">Top Performer</p>
                                    <p className="font-bold text-sm text-brand-blue">{benchmarkItem.top}%</p>
                                </div>
                            </div>
                            <div className={`px-3 py-2 rounded-xl text-center text-xs font-semibold ${
                                result.hikePctComputed >= benchmarkItem.top * 0.8 ? 'bg-brand-green/10 text-brand-green' :
                                result.hikePctComputed >= benchmarkItem.avg ? 'bg-brand-blue/10 text-brand-blue' :
                                'bg-amber-500/10 text-amber-600'
                            }`}>
                                {result.benchStatus}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2">Source: Aon Salary Survey 2026 · EY Future of Pay 2026 (approximate)</p>
                        </div>

                        {/* Tax Impact */}
                        {result.additionalTax > 0 && (
                            <div className="rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border mb-4 p-4">
                                <p className="text-xs font-bold text-slate-700 dark:text-foreground mb-3">Tax Impact of Hike (New Regime estimate)</p>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-xs">Gross Hike Amount</span>
                                        <span className="font-semibold text-sm text-brand-green">{formatINR(result.hikeAmount)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-xs">Additional Tax on Hike</span>
                                        <span className="font-semibold text-sm text-red-400">-{formatINR(result.additionalTax)}</span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-border pt-2">
                                        <span className="text-slate-700 dark:text-foreground text-xs font-bold">Net Take-Home Increase</span>
                                        <span className="font-bold text-sm text-brand-green">{formatINR(result.netTakeHomeIncrease)}</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2 italic">* Approximate. New tax regime (Sec 115BAC/202). Consult a tax advisor for exact figures.</p>
                            </div>
                        )}
                    </>
                )}

                {/* ── MODE 3: Full CTC Breakdown ── */}
                {mode === 'ctcBreakdown' && (
                    <>
                        <div className="space-y-3 mb-5">
                            <NumberInput
                                label="Current Total CTC (Annual)"
                                value={ctcAmount}
                                onChange={setCtcAmount}
                                min={100000}
                                max={100000000}
                                prefix="₹"
                                helperText="Total annual CTC package (fixed + variable)"
                            />
                            <NumberInput
                                label="Variable Pay Component"
                                value={variablePct}
                                onChange={setVariablePct}
                                min={0}
                                max={50}
                                suffix="%"
                                step={1}
                                helperText="% of CTC offered as performance bonus"
                            />
                            <NumberInput
                                label="Achievement vs Target"
                                value={achievementPct}
                                onChange={setAchievementPct}
                                min={0}
                                max={150}
                                suffix="%"
                                step={5}
                                helperText="Your performance achievement % (default 100%)"
                            />
                            <NumberInput
                                label="Hike % on Fixed Pay"
                                value={fixedHikePct}
                                onChange={setFixedHikePct}
                                min={0}
                                max={100}
                                suffix="%"
                                step={0.5}
                                helperText="Expected hike percentage on fixed pay"
                            />
                            <div className="flex items-center gap-3 px-1">
                                <input
                                    type="checkbox"
                                    id="customVarHike"
                                    checked={useCustomVariableHike}
                                    onChange={e => setUseCustomVariableHike(e.target.checked)}
                                    className="w-4 h-4 accent-brand-green"
                                />
                                <label htmlFor="customVarHike" className="text-xs text-muted-foreground cursor-pointer">
                                    Set different hike % for variable pay (optional)
                                </label>
                            </div>
                            {useCustomVariableHike && (
                                <NumberInput
                                    label="Hike % on Variable Pay"
                                    value={variableHikePct}
                                    onChange={setVariableHikePct}
                                    min={0}
                                    max={100}
                                    suffix="%"
                                    step={0.5}
                                    helperText="Defaults to same as fixed pay hike"
                                />
                            )}
                            <div>
                                <div className="flex rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border p-1 mb-2">
                                    {(['months', 'years'] as const).map((u) => (
                                        <button key={u}
                                            onClick={() => {
                                                if (u === 'years' && periodUnit === 'months') setPeriod(Math.round(period / 12) || 1);
                                                if (u === 'months' && periodUnit === 'years') setPeriod(period * 12);
                                                setPeriodUnit(u);
                                            }}
                                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${periodUnit === u ? 'bg-brand-green text-white' : 'text-muted-foreground'}`}
                                        >{u}</button>
                                    ))}
                                </div>
                                <NumberInput
                                    label="Projection Period"
                                    value={period}
                                    onChange={setPeriod}
                                    min={1}
                                    max={periodUnit === 'months' ? 120 : 10}
                                    suffix={periodUnit === 'months' ? ' months' : ' years'}
                                    helperText={periodUnit === 'months' ? '1 - 120 months' : '1 - 10 years'}
                                />
                            </div>
                        </div>

                        <motion.div layout className="rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border mb-4 shadow-sm overflow-hidden">
                            <div className="p-5 text-center border-b border-slate-100 dark:border-border">
                                <p className="text-muted-foreground text-sm mb-1">New Total CTC (Annual)</p>
                                <motion.p key={ctcResult.newCTC} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-bold text-brand-green">
                                    {formatINR(ctcResult.newCTC)}
                                </motion.p>
                                <p className="text-brand-blue text-sm font-medium mt-1">Est. Take-Home: {formatINR(ctcResult.estimatedTakeHomeMonthly)}/month</p>
                                <p className="text-muted-foreground text-xs mt-0.5">In-hand ≈ {ctcResult.inHandPct.toFixed(1)}% of new CTC</p>
                            </div>

                            <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-border">
                                <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2.5">Fixed Pay</p>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Current Fixed Pay (Annual)', val: ctcResult.currentFixed, color: 'text-slate-900 dark:text-foreground' },
                                        { label: 'Current Fixed Pay (Monthly)', val: ctcResult.currentFixed / 12, color: 'text-slate-600 dark:text-slate-300' },
                                        { label: 'New Fixed Pay (Annual)', val: ctcResult.newFixed, color: 'text-brand-green' },
                                        { label: 'New Fixed Pay (Monthly)', val: ctcResult.newFixed / 12, color: 'text-brand-green' },
                                        { label: 'Fixed Pay Hike (Annual)', val: ctcResult.fixedHikeAmount, color: 'text-brand-blue' },
                                    ].map(r => (
                                        <div key={r.label} className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-xs">{r.label}</span>
                                            <span className={`font-semibold text-sm ${r.color}`}>{formatINR(r.val)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-border">
                                <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2.5">Variable Pay</p>
                                <div className="space-y-2">
                                    {[
                                        { label: 'Current Variable Target (Annual)', val: ctcResult.currentVariableTarget, color: 'text-slate-900 dark:text-foreground' },
                                        { label: `Actual Payout (at ${achievementPct}% achievement)`, val: ctcResult.currentVariableActual, color: 'text-brand-blue' },
                                        { label: 'New Variable Target (Annual)', val: ctcResult.newVariableTarget, color: 'text-brand-green' },
                                        { label: `New Payout (at ${achievementPct}% achievement)`, val: ctcResult.newVariableActual, color: 'text-brand-green' },
                                    ].map(r => (
                                        <div key={r.label} className="flex items-center justify-between">
                                            <span className="text-muted-foreground text-xs">{r.label}</span>
                                            <span className={`font-semibold text-sm ${r.color}`}>{formatINR(r.val)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-border">
                                <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2.5">Estimated Take-Home (New Fixed)</p>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-xs">Basic (50% of new fixed)</span>
                                        <span className="font-semibold text-sm text-slate-900 dark:text-foreground">{formatINR(ctcResult.basic)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-xs">PF Deduction (12% of basic)</span>
                                        <span className="font-semibold text-sm text-red-400">-{formatINR(ctcResult.pfAnnual)}/yr</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-xs">Professional Tax</span>
                                        <span className="font-semibold text-sm text-red-400">-{formatINR(ctcResult.profTaxAnnual)}/yr</span>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-border pt-2 mt-1">
                                        <span className="text-slate-700 dark:text-foreground text-xs font-bold">Est. Take-Home (Annual)</span>
                                        <span className="font-bold text-sm text-brand-green">{formatINR(ctcResult.estimatedTakeHomeAnnual)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-700 dark:text-foreground text-xs font-bold">Est. Take-Home (Monthly)</span>
                                        <span className="font-bold text-sm text-brand-green">{formatINR(ctcResult.estimatedTakeHomeMonthly)}</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2 italic">* Estimate only. Excludes income tax, gratuity, ESIC, and other deductions.</p>
                            </div>

                            <div className="px-5 pt-4 pb-4">
                                <p className="text-xs font-bold text-slate-500 dark:text-muted-foreground uppercase tracking-wider mb-2.5">Variable Pay — Achievement Scenarios</p>
                                <div className="p-3 rounded-xl bg-brand-blue/5 border border-brand-blue/15 text-xs text-muted-foreground leading-relaxed mb-3">
                                    Your variable pay target is <span className="font-semibold text-slate-800 dark:text-foreground">{formatINR(ctcResult.currentVariableTarget)}/year</span>.{' '}
                                    At <span className="text-amber-500 font-semibold">80%</span> you receive <span className="font-semibold text-slate-800 dark:text-foreground">{formatINR(ctcResult.varAt80)}</span>.{' '}
                                    At <span className="text-brand-green font-semibold">100%</span> you receive <span className="font-semibold text-slate-800 dark:text-foreground">{formatINR(ctcResult.varAt100)}</span>.{' '}
                                    At <span className="text-brand-blue font-semibold">120% stretch</span> you receive <span className="font-semibold text-slate-800 dark:text-foreground">{formatINR(ctcResult.varAt120)}</span>.
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: '80%', val: ctcResult.varAt80, color: 'text-amber-500', bg: 'bg-amber-500/8' },
                                        { label: '100%', val: ctcResult.varAt100, color: 'text-brand-green', bg: 'bg-brand-green/8' },
                                        { label: '120%', val: ctcResult.varAt120, color: 'text-brand-blue', bg: 'bg-brand-blue/8' },
                                    ].map(s => (
                                        <div key={s.label} className={`${s.bg} rounded-xl p-2.5 text-center`}>
                                            <p className={`text-[10px] font-semibold ${s.color}`}>{s.label} Achievement</p>
                                            <p className="text-slate-800 dark:text-foreground font-bold text-xs mt-0.5">{formatINR(s.val)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        <div className="rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border mb-4 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-border">
                                <p className="text-sm font-bold text-slate-900 dark:text-foreground">Year-wise CTC Projection</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                                            {['Year', 'Fixed Pay', 'Var. Target', 'Var. Payout', 'Total CTC'].map(h => (
                                                <th key={h} className={`px-3 py-2 ${h === 'Year' ? 'text-left' : 'text-right'} text-muted-foreground font-semibold whitespace-nowrap`}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ctcResult.ctcProjection.map((row, i) => (
                                            <tr key={row.year} className={`border-t border-slate-50 dark:border-slate-800 ${i === 0 ? 'bg-slate-50/50 dark:bg-slate-800/20' : ''}`}>
                                                <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-foreground">Yr {row.year}</td>
                                                <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">{formatINR(row.fixed)}</td>
                                                <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">{formatINR(row.variableTarget)}</td>
                                                <td className="px-3 py-2.5 text-right text-brand-blue font-medium">{formatINR(row.variablePayout)}</td>
                                                <td className="px-3 py-2.5 text-right text-brand-green font-bold">{formatINR(row.totalCTC)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* ── MODE 4: Compare Offers ── */}
                {mode === 'compare' && (
                    <>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {/* Offer A */}
                            <div className="rounded-2xl bg-white dark:bg-card border-2 border-brand-green/40 p-3 space-y-3">
                                <p className="text-xs font-bold text-brand-green uppercase tracking-wider text-center">Offer A</p>
                                <NumberInput label="Fixed CTC" value={offerA_salary} onChange={setOfferA_salary} min={100000} max={100000000} prefix="₹" />
                                <NumberInput label="Variable %" value={offerA_variable} onChange={setOfferA_variable} min={0} max={100} suffix="%" step={1} />
                                <NumberInput label="Joining Bonus" value={offerA_joining} onChange={setOfferA_joining} min={0} max={10000000} prefix="₹" />
                                <NumberInput label="ESOP Value (est.)" value={offerA_esop} onChange={setOfferA_esop} min={0} max={100000000} prefix="₹" />
                            </div>
                            {/* Offer B */}
                            <div className="rounded-2xl bg-white dark:bg-card border-2 border-brand-blue/40 p-3 space-y-3">
                                <p className="text-xs font-bold text-brand-blue uppercase tracking-wider text-center">Offer B</p>
                                <NumberInput label="Fixed CTC" value={offerB_salary} onChange={setOfferB_salary} min={100000} max={100000000} prefix="₹" />
                                <NumberInput label="Variable %" value={offerB_variable} onChange={setOfferB_variable} min={0} max={100} suffix="%" step={1} />
                                <NumberInput label="Joining Bonus" value={offerB_joining} onChange={setOfferB_joining} min={0} max={10000000} prefix="₹" />
                                <NumberInput label="ESOP Value (est.)" value={offerB_esop} onChange={setOfferB_esop} min={0} max={100000000} prefix="₹" />
                            </div>
                        </div>

                        {/* Comparison Results */}
                        <div className="rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border mb-4 overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-border">
                                <p className="text-sm font-bold text-slate-900 dark:text-foreground">Side-by-Side Comparison</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                                            <th className="px-3 py-2 text-left text-muted-foreground font-semibold">Metric</th>
                                            <th className="px-3 py-2 text-right text-brand-green font-semibold">Offer A</th>
                                            <th className="px-3 py-2 text-right text-brand-blue font-semibold">Offer B</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { label: 'Fixed CTC (Annual)', a: compareResult.a.fixed, b: compareResult.b.fixed },
                                            { label: 'Variable Target', a: compareResult.a.varTarget, b: compareResult.b.varTarget },
                                            { label: 'Total CTC', a: compareResult.a.totalCTC, b: compareResult.b.totalCTC, bold: true },
                                            { label: 'Est. Take-Home /mo', a: compareResult.a.takeHomeMonthly, b: compareResult.b.takeHomeMonthly },
                                            { label: 'Joining Bonus', a: compareResult.a.joining, b: compareResult.b.joining },
                                            { label: 'Total Year 1 Value', a: compareResult.a.totalYear1, b: compareResult.b.totalYear1, bold: true },
                                        ].map(row => {
                                            const aWins = row.a >= row.b;
                                            return (
                                                <tr key={row.label} className="border-t border-slate-50 dark:border-slate-800">
                                                    <td className={`px-3 py-2.5 text-muted-foreground ${row.bold ? 'font-bold text-slate-700 dark:text-foreground' : ''}`}>{row.label}</td>
                                                    <td className={`px-3 py-2.5 text-right font-${row.bold ? 'bold' : 'semibold'} ${aWins ? 'text-brand-green' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {formatINR(row.a)}{aWins && row.a !== row.b ? ' ✓' : ''}
                                                    </td>
                                                    <td className={`px-3 py-2.5 text-right font-${row.bold ? 'bold' : 'semibold'} ${!aWins ? 'text-brand-blue' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {formatINR(row.b)}{!aWins && row.a !== row.b ? ' ✓' : ''}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Verdict */}
                        <div className="rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border mb-4 p-4">
                            <p className="text-xs font-bold text-slate-700 dark:text-foreground mb-3 uppercase tracking-wider">Verdict</p>
                            <div className="space-y-2">
                                {[
                                    { label: 'Higher CTC', winner: compareResult.betterCTC, color: compareResult.betterCTC === 'A' ? 'text-brand-green' : 'text-brand-blue' },
                                    { label: 'Higher Take-Home', winner: compareResult.betterTakeHome, color: compareResult.betterTakeHome === 'A' ? 'text-brand-green' : 'text-brand-blue' },
                                    { label: 'Better Year 1 (incl. joining)', winner: compareResult.betterYear1, color: compareResult.betterYear1 === 'A' ? 'text-brand-green' : 'text-brand-blue' },
                                ].map(v => (
                                    <div key={v.label} className="flex items-center justify-between">
                                        <span className="text-muted-foreground text-xs">{v.label}</span>
                                        <span className={`font-bold text-sm ${v.color}`}>Offer {v.winner} ✓</span>
                                    </div>
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-3 italic">* Take-home estimates exclude income tax, ESIC & other deductions. ESOPs are vesting-schedule dependent.</p>
                        </div>
                    </>
                )}

                {/* Action Buttons */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    disabled={isSaved || isAlreadySaved}
                    className={`w-full py-3.5 rounded-2xl font-semibold text-sm mb-5 flex items-center justify-center gap-2 transition-all ${isSaved || isAlreadySaved ? 'bg-brand-green/10 text-brand-green border border-brand-green/20' : 'bg-brand-green text-white'}`}
                >
                    {isSaved || isAlreadySaved ? <><Check size={18} /> Saved</> : <><Save size={18} /> Save Calculation</>}
                </motion.button>

                <div className="flex gap-3 mb-5">
                    <button onClick={handleDownloadPDF} className="flex-1 py-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center justify-center gap-2 transition-colors active:bg-indigo-100 dark:active:bg-indigo-500/20">
                        📄 Export PDF
                    </button>
                    <button onClick={handleDownloadExcel} className="flex-1 py-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 transition-colors active:bg-emerald-100 dark:active:bg-emerald-500/20">
                        📊 Export Excel
                    </button>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-brand-blue/5 border border-blue-100 dark:border-brand-blue/15">
                    <p className="text-muted-foreground dark:text-muted-foreground text-[10px] leading-relaxed italic">
                        📐 Projection only. Actual hikes depend on company performance and market conditions. Take-home estimates exclude income tax and company-specific deductions. Industry benchmarks are approximate.
                    </p>
                </div>

                <CalculatorInfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} calculatorTitle="Salary Hike Calculator" />

                <div className="mt-8">
                    <DisclaimerComponent module="general" />
                </div>
            </div>
        </div>
    );
}
