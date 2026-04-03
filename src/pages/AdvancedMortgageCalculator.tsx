import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Plus, Trash2, ChevronDown, ChevronUp, Calculator, Home, AlertTriangle, AlertCircle, CheckCircle2, IndianRupee, Receipt, FileText, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import NumberInput from '../components/NumberInput';
import {
    calculateAdvancedMortgage,
    calculateLTV,
    formatINR,
    formatINRShort,
} from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';
import { exportToPDF, exportToExcel, dateTag, type ExportConfig } from '../utils/exportReport';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const ROWS_PER_PAGE = 24; // Show 2 years per page for better view

export default function AdvancedMortgageCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Advanced_Mortgage_Calculator'); }, []);
    const navigate = useNavigate();
    const c = useAppColors();

    // ─── Input State ────────────────────────────────────────────────────────
    const [propertyValue, setPropertyValue] = useState(10000000);
    const [downPayment, setDownPayment] = useState(2000000);
    const [interestRate, setInterestRate] = useState(8.5);
    const [tenureYears, setTenureYears] = useState(20);
    const [monthlyIncome, setMonthlyIncome] = useState(150000);

    // ─── Prepayment State ───────────────────────────────────────────────────
    const [enablePrepayment, setEnablePrepayment] = useState(false);
    const [monthlyExtraEMI, setMonthlyExtraEMI] = useState(0);
    const [lumpSums, setLumpSums] = useState<{ id: string; month: number; amount: number }[]>([
        { id: '1', month: 12, amount: 100000 }
    ]);
    const [prepaymentMode, setPrepaymentMode] = useState<'reduce_tenure' | 'reduce_emi'>('reduce_tenure');

    const [showAmortization, setShowAmortization] = useState(false);
    const [amortPage, setAmortPage] = useState(0);

    // ─── Computed Values ────────────────────────────────────────────────────
    const loanAmount = Math.max(0, propertyValue - downPayment);
    const ltv = calculateLTV(loanAmount, propertyValue);
    // RBI tiered LTV: ≤₹30L → 90%, ₹30L–₹75L → 80%, >₹75L → 75%
    const maxLtv = loanAmount <= 3000000 ? 90 : loanAmount <= 7500000 ? 80 : 75;
    const months = tenureYears * 12;

    const result = useMemo(() => {
        const config = {
            monthlyExtraEMI: enablePrepayment ? monthlyExtraEMI : 0,
            lumpSums: enablePrepayment ? lumpSums : [],
            mode: prepaymentMode
        };
        return calculateAdvancedMortgage(loanAmount, interestRate, months, config);
    }, [loanAmount, interestRate, months, enablePrepayment, monthlyExtraEMI, lumpSums, prepaymentMode]);

    // ─── Chart Config ───────────────────────────────────────────────────────
    const chartData = {
        labels: ['Principal', 'Interest'],
        datasets: [{
            data: [loanAmount, result.totalInterest],
            backgroundColor: ['#10B981', '#F59E0B'],
            borderColor: [c.card, c.card],
            borderWidth: 2,
        }]
    };

    const chartOptions = {
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: c.textSecondary,
                    padding: 20,
                    font: { family: 'Inter', size: 13 }
                }
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => ` ${context.label}: ${formatINR(context.raw)}`
                }
            }
        },
        maintainAspectRatio: false
    };

    // ─── Pagination ─────────────────────────────────────────────────────────
    const totalPages = Math.ceil(result.schedule.length / ROWS_PER_PAGE);
    const pagedSchedule = useMemo(() => {
        const start = amortPage * ROWS_PER_PAGE;
        return result.schedule.slice(start, start + ROWS_PER_PAGE);
    }, [result.schedule, amortPage]);

    // ─── Handlers ───────────────────────────────────────────────────────────
    const addLumpSum = () => {
        setLumpSums([...lumpSums, { id: Date.now().toString(), month: 12, amount: 0 }]);
    };

    const removeLumpSum = (id: string) => {
        setLumpSums(lumpSums.filter(ls => ls.id !== id));
    };

    const updateLumpSum = (id: string, field: 'month' | 'amount', value: number) => {
        setLumpSums(lumpSums.map(ls => ls.id === id ? { ...ls, [field]: value } : ls));
    };

    // ─── Export helpers ──────────────────────────────────────────────────
    const buildExportConfig = (forExcel = false): ExportConfig => {
        const tag = dateTag();
        const emiRatio = monthlyIncome > 0 ? (result.originalEmi / monthlyIncome) * 100 : 0;
        const affordStatus = emiRatio > 50 ? 'HIGH RISK (>50%)' : emiRatio > 40 ? 'CAUTION (>40%)' : 'SAFE';

        const inputs: ExportConfig['inputs'] = [
            { label: 'Property Value', value: formatINR(propertyValue) },
            { label: 'Down Payment', value: formatINR(downPayment) },
            { label: 'Loan Amount', value: formatINR(loanAmount) },
            { label: 'LTV (Loan to Value)', value: `${ltv.toFixed(1)}% (RBI max: ${maxLtv}%)` },
            { label: 'Interest Rate', value: `${interestRate}% p.a.` },
            { label: 'Tenure', value: `${tenureYears} Years (${months} months)` },
            ...(monthlyIncome > 0 ? [{ label: 'Monthly Income', value: formatINR(monthlyIncome) }] : []),
        ];

        const results: ExportConfig['results'] = [
            { label: 'Monthly EMI', value: formatINR(result.originalEmi) },
            { label: 'Total Interest', value: formatINR(result.totalInterest) },
            { label: 'Total Payment', value: formatINR(result.totalPayment) },
            ...(monthlyIncome > 0 ? [
                { label: 'EMI to Income Ratio', value: `${emiRatio.toFixed(1)}%` },
                { label: 'Affordability Status', value: affordStatus },
            ] : []),
            ...(enablePrepayment ? [
                { label: 'Prepayment Strategy', value: prepaymentMode === 'reduce_tenure' ? 'Reduce Tenure' : 'Reduce EMI' },
                ...(monthlyExtraEMI > 0 ? [{ label: 'Monthly Extra EMI', value: formatINR(monthlyExtraEMI) }] : []),
                ...(result.interestSaved > 0 ? [{ label: 'Interest Saved', value: formatINR(result.interestSaved) }] : []),
                ...(result.timeSavedMonths > 0 ? [{ label: 'Time Saved', value: `${Math.floor(result.timeSavedMonths / 12)}y ${result.timeSavedMonths % 12}m` }] : []),
            ] : []),
            { label: 'Sec 80C (Principal) — Total', value: formatINR(result.taxBenefits.total80C) },
            { label: 'Sec 24(b) (Interest) — Total', value: formatINR(result.taxBenefits.total24) },
        ];

        // Year-wise summary: aggregate monthly schedule into annual rows
        const yearlyMap = new Map<number, { principal: number; interest: number; totalPaid: number; closingBalance: number }>();
        result.schedule.forEach(row => {
            const yr = Math.ceil(row.month / 12);
            const existing = yearlyMap.get(yr) || { principal: 0, interest: 0, totalPaid: 0, closingBalance: 0 };
            existing.principal += row.principal;
            existing.interest += row.interest;
            existing.totalPaid += row.emi;
            existing.closingBalance = row.closingBalance;
            yearlyMap.set(yr, existing);
        });

        const yearlyRows = Array.from(yearlyMap.entries()).map(([yr, d]) => [
            yr,
            forExcel ? Math.round(d.totalPaid) : formatINR(d.totalPaid),
            forExcel ? Math.round(d.principal) : formatINR(d.principal),
            forExcel ? Math.round(d.interest) : formatINR(d.interest),
            forExcel ? Math.round(d.closingBalance) : formatINR(d.closingBalance),
        ]);

        const taxRows = result.taxBenefits.schedule.map(t => [
            t.year,
            forExcel ? t.principal : formatINR(t.principal),
            forExcel ? t.interest : formatINR(t.interest),
            forExcel ? t.deduction80C : formatINR(t.deduction80C),
            forExcel ? t.deduction24 : formatINR(t.deduction24),
            forExcel ? (t.deduction80C + t.deduction24) : formatINR(t.deduction80C + t.deduction24),
        ]);

        return {
            title: 'Advanced Mortgage Report',
            subtitle: 'Home Loan Analysis',
            inputs,
            results,
            chart: {
                type: 'pie',
                segments: [
                    { label: 'Principal', value: loanAmount, color: '#10B981' },
                    { label: 'Total Interest', value: result.totalInterest, color: '#F59E0B' },
                ],
            },
            projectionTitle: 'Monthly Amortization Schedule',
            projectionColumns: ['Month', 'Payment', 'Principal', 'Interest', 'Balance'],
            projectionRows: result.schedule.map(r => [
                r.month,
                forExcel ? Math.round(r.emi) : formatINR(r.emi),
                forExcel ? Math.round(r.principal) : formatINR(r.principal),
                forExcel ? Math.round(r.interest) : formatINR(r.interest),
                forExcel ? Math.round(r.closingBalance) : formatINR(r.closingBalance),
            ]),
            additionalTables: [
                {
                    title: 'Year-wise Summary',
                    columns: ['Year', 'Total Paid', 'Principal', 'Interest', 'Balance'],
                    rows: yearlyRows,
                },
                {
                    title: 'Tax Benefits (Year-wise)',
                    columns: ['Year', 'Principal Paid', 'Interest Paid', '80C Deduction', '24(b) Deduction', 'Total Benefit'],
                    rows: taxRows,
                },
            ],
            filename: `FinCalix_Mortgage_Report_${tag}`,
        };
    };

    const handleDownloadPDF = async () => {
        await exportToPDF(buildExportConfig(false));
    };

    const handleDownloadExcel = async () => {
        await exportToExcel(buildExportConfig(true));
    };

    // ─── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen pb-safe-nav" style={{ backgroundColor: c.bg, color: c.text }}>
            {/* Header */}
            <div className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3 backdrop-blur-md shadow-sm border-b"
                 style={{ backgroundColor: `${c.card}E6`, borderColor: c.border }}>
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full transition-colors"
                        style={{ color: c.textSecondary }}>
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-lg font-bold" style={{ color: c.text }}>Advanced Mortgage</h1>
                    <p className="text-xs" style={{ color: c.textSecondary }}>Home Loan Simulator</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 space-y-6">
                
                {/* 1. INPUTS SECTION */}
                <div className="p-5 rounded-2xl border shadow-sm space-y-6" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: c.border }}>
                        <Home className="w-5 h-5" style={{ color: '#10B981' }} />
                        <h2 className="font-semibold text-lg">Property & Loan Details</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <NumberInput
                            label="Property Value"
                            value={propertyValue}
                            onChange={setPropertyValue}
                            min={100000}
                            max={500000000}
                            step={100000}
                            prefix="₹"
                        />
                        <NumberInput
                            label="Down Payment"
                            value={downPayment}
                            onChange={setDownPayment}
                            min={0}
                            max={propertyValue}
                            step={100000}
                            prefix="₹"
                        />
                    </div>
                    
                    <div className="p-4 rounded-xl flex flex-wrap justify-between items-center gap-4" style={{ backgroundColor: c.bg }}>
                        <div>
                            <p className="text-sm font-medium" style={{ color: c.textSecondary }}>Loan Amount</p>
                            <p className="text-2xl font-bold" style={{ color: c.text }}>{formatINR(loanAmount)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-medium" style={{ color: c.textSecondary }}>LTV (Loan to Value)</p>
                            <p className={`text-xl font-bold ${ltv > maxLtv ? 'text-red-500' : 'text-emerald-500'}`}>
                                {ltv.toFixed(1)}%
                            </p>
                            {ltv > maxLtv && <p className="text-xs mt-1 text-red-500">RBI max: {maxLtv}% for this loan size</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <NumberInput
                            label="Interest Rate (p.a.)"
                            value={interestRate}
                            onChange={setInterestRate}
                            min={4}
                            max={20}
                            step={0.1}
                            suffix="%"
                        />
                        <NumberInput
                            label="Tenure (Years)"
                            value={tenureYears}
                            onChange={setTenureYears}
                            min={1}
                            max={30}
                            step={1}
                            suffix="Yr"
                        />
                    </div>
                    
                    <NumberInput
                        label="Net Monthly Income (Take-home)"
                        value={monthlyIncome}
                        onChange={setMonthlyIncome}
                        min={0}
                        max={10000000}
                        step={10000}
                        prefix="₹"
                        helperText="Used for Affordability Risk Analysis"
                    />
                </div>

                {/* 2. AFFORDABILITY & INSIGHTS */}
                <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="w-5 h-5" style={{ color: '#10B981' }} />
                        <h2 className="font-semibold text-lg">Affordability Analysis</h2>
                    </div>
                    
                    {(() => {
                        const emiRatio = monthlyIncome > 0 ? (result.originalEmi / monthlyIncome) * 100 : 0;
                        let statusColor = '#10B981'; // Emerald
                        let icon = <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
                        let message = "Excellent! Your EMI is well within safe limits.";
                        
                        if (emiRatio > 50) {
                            statusColor = '#EF4444'; // Red
                            icon = <AlertTriangle className="w-5 h-5 text-red-500" />;
                            message = "Danger! Your EMI exceeds 50% of your income. High risk of default.";
                        } else if (emiRatio > 40) {
                            statusColor = '#F59E0B'; // Amber
                            icon = <AlertTriangle className="w-5 h-5 text-amber-500" />;
                            message = "Caution! Your EMI is over 40% of your income. Banks might reject the loan.";
                        }

                        return monthlyIncome === 0 ? (
                            <p className="text-sm italic" style={{ color: c.textSecondary }}>Enter monthly income to see affordability insights.</p>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ backgroundColor: `${statusColor}1A` }}>
                                    {icon}
                                    <div>
                                        <p className="font-semibold" style={{ color: statusColor }}>EMI to Income Ratio: {emiRatio.toFixed(1)}%</p>
                                        <p className="text-sm mt-1" style={{ color: c.textSecondary }}>{message}</p>
                                    </div>
                                </div>
                                <div className="h-2 w-full rounded-full overflow-hidden flex" style={{ backgroundColor: c.border }}>
                                    <div className="h-full transition-all duration-500" style={{ width: `${Math.min(emiRatio, 100)}%`, backgroundColor: statusColor }} />
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* 3. PREPAYMENT ENGINE */}
                <div className="p-5 rounded-2xl border shadow-sm space-y-4" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-5 h-5" style={{ color: '#10B981' }} />
                            <h2 className="font-semibold text-lg">Smart Prepayment Engine</h2>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={enablePrepayment} onChange={(e) => setEnablePrepayment(e.target.checked)} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <AnimatePresence>
                        {enablePrepayment && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-5 pt-4 border-t"
                                style={{ borderColor: c.border }}
                            >
                                {/* Strategy Selector */}
                                <div>
                                    <p className="text-sm font-medium mb-3">Prepayment Strategy</p>
                                    <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: c.border }}>
                                        <button
                                            onClick={() => setPrepaymentMode('reduce_tenure')}
                                            className="flex-1 py-2 text-sm font-medium transition-colors"
                                            style={{
                                                backgroundColor: prepaymentMode === 'reduce_tenure' ? '#10B981' : 'transparent',
                                                color: prepaymentMode === 'reduce_tenure' ? '#fff' : c.textSecondary
                                            }}
                                        >
                                            Reduce Tenure
                                        </button>
                                        <button
                                            onClick={() => setPrepaymentMode('reduce_emi')}
                                            className="flex-1 py-2 text-sm font-medium transition-colors border-l"
                                            style={{
                                                borderColor: c.border,
                                                backgroundColor: prepaymentMode === 'reduce_emi' ? '#10B981' : 'transparent',
                                                color: prepaymentMode === 'reduce_emi' ? '#fff' : c.textSecondary
                                            }}
                                        >
                                            Reduce EMI
                                        </button>
                                    </div>
                                    <p className="text-xs mt-2" style={{ color: c.textSecondary }}>
                                        {prepaymentMode === 'reduce_tenure' 
                                            ? "Your EMI remains fixed, but extra payments reduce the total duration of the loan, saving huge interest."
                                            : "Your loan tenure remains full, but each lump-sum payment reduces your upcoming monthly EMI burden."}
                                    </p>
                                </div>

                                {/* Monthly Extra EMI */}
                                <div>
                                    <NumberInput
                                        label="Monthly Extra EMI"
                                        value={monthlyExtraEMI}
                                        onChange={setMonthlyExtraEMI}
                                        min={0}
                                        max={loanAmount}
                                        step={1000}
                                        prefix="₹"
                                        helperText="Add a fixed amount to your EMI every month"
                                    />
                                </div>

                                {/* Lump Sums */}
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-sm font-medium">Lump Sum Prepayments</p>
                                        <button onClick={addLumpSum} className="text-xs flex items-center gap-1 text-emerald-500 font-medium px-2 py-1 rounded hover:bg-emerald-500/10 transition-colors">
                                            <Plus className="w-3 h-3" /> Add
                                        </button>
                                    </div>
                                    
                                    {lumpSums.length === 0 ? (
                                        <p className="text-xs italic" style={{ color: c.textSecondary }}>No lump sum payments scheduled.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {lumpSums.map((ls, idx) => (
                                                <div key={ls.id} className="flex items-center gap-3 p-3 rounded-lg border" style={{ borderColor: c.border, backgroundColor: c.bg }}>
                                                    <div className="w-20">
                                                        <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: c.textSecondary }}>Month</label>
                                                        <input
                                                            type="number"
                                                            value={ls.month}
                                                            onChange={(e) => updateLumpSum(ls.id, 'month', Math.max(1, parseInt(e.target.value) || 1))}
                                                            className="w-full bg-transparent outline-none font-medium text-sm border-b focus:border-emerald-500 transition-colors"
                                                            style={{ color: c.text, borderColor: c.border }}
                                                            min={1}
                                                            max={months}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="text-[10px] uppercase font-bold tracking-wider" style={{ color: c.textSecondary }}>Amount (₹)</label>
                                                        <input
                                                            type="number"
                                                            value={ls.amount}
                                                            onChange={(e) => updateLumpSum(ls.id, 'amount', parseInt(e.target.value) || 0)}
                                                            className="w-full bg-transparent outline-none font-medium text-sm border-b focus:border-emerald-500 transition-colors"
                                                            style={{ color: c.text, borderColor: c.border }}
                                                            min={0}
                                                        />
                                                    </div>
                                                    <button onClick={() => removeLumpSum(ls.id)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 4. RESULTS SECTION */}
                <div className="p-5 rounded-2xl shadow-sm text-white relative overflow-hidden" 
                     style={{ background: `linear-gradient(135deg, #10B981, #059669)` }}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <IndianRupee className="w-32 h-32" />
                    </div>
                    
                    <div className="relative z-10 grid grid-cols-2 gap-y-6">
                        <div className="col-span-2">
                            <p className="text-emerald-100 text-sm font-medium">Base Monthly EMI</p>
                            <p className="text-4xl font-bold mt-1 tracking-tight">
                                {formatINR(result.originalEmi)}
                            </p>
                            {enablePrepayment && result.emi !== result.originalEmi && (
                                <p className="text-sm mt-1 text-emerald-200">
                                    Current Effective EMI: {formatINR(result.emi)}
                                </p>
                            )}
                        </div>

                        <div>
                            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Total Interest</p>
                            <p className="text-xl font-bold mt-1">{formatINR(result.totalInterest)}</p>
                        </div>
                        
                        <div>
                            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Total Payment</p>
                            <p className="text-xl font-bold mt-1">{formatINR(result.totalPayment)}</p>
                        </div>
                    </div>
                </div>

                {/* Export Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadPDF}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border font-bold text-sm"
                        style={{ backgroundColor: c.card, borderColor: c.border, color: c.textSecondary }}>
                        <FileText size={18} className="text-violet-500" /> Export PDF
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleDownloadExcel}
                        className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border font-bold text-sm"
                        style={{ backgroundColor: c.card, borderColor: c.border, color: c.textSecondary }}>
                        <Download size={18} className="text-emerald-500" /> Export Excel
                    </motion.button>
                </div>

                {/* Savings Banner */}
                {enablePrepayment && (result.interestSaved > 0 || result.timeSavedMonths > 0) && (
                    <div className="p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-start md:items-center justify-between" 
                         style={{ backgroundColor: c.card, borderColor: '#10B981', borderLeftWidth: '4px' }}>
                        <div>
                            <h3 className="font-bold text-lg" style={{ color: c.text }}>Prepayment Impact</h3>
                            <p className="text-sm mt-1" style={{ color: c.textSecondary }}>By using your smart prepayment strategy, you save huge!</p>
                        </div>
                        <div className="flex gap-4 text-right">
                            {result.interestSaved > 0 && (
                                <div>
                                    <p className="text-xs uppercase font-bold" style={{ color: c.textSecondary }}>Interest Saved</p>
                                    <p className="text-emerald-500 font-bold text-xl">{formatINR(result.interestSaved)}</p>
                                </div>
                            )}
                            {result.timeSavedMonths > 0 && (
                                <div>
                                    <p className="text-xs uppercase font-bold" style={{ color: c.textSecondary }}>Time Saved</p>
                                    <p className="text-emerald-500 font-bold text-xl">
                                        {Math.floor(result.timeSavedMonths / 12)}y {result.timeSavedMonths % 12}m
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 5. VISUALIZATION */}
                <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <h2 className="font-semibold text-lg mb-4 text-center">Principal vs Interest Breakup</h2>
                    <div className="h-64 relative">
                        <Pie data={chartData} options={chartOptions} />
                    </div>
                </div>

                {/* 6. TAX BENEFITS */}
                <div className="p-5 rounded-2xl border shadow-sm space-y-4" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="flex items-center gap-2">
                        <Receipt className="w-5 h-5" style={{ color: '#10B981' }} />
                        <h2 className="font-semibold text-lg">Income Tax Benefits</h2>
                    </div>
                    <p className="text-sm" style={{ color: c.textSecondary }}>
                        Based on Indian tax laws (Old Regime): Section 80C covers Principal up to ₹1.5L/yr (only after possession), and Section 24(b) covers Interest up to ₹2L/yr for self-occupied property.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: c.textSecondary }}>Sec 80C (Principal)</p>
                            <p className="text-2xl font-bold text-emerald-500">{formatINRShort(result.taxBenefits.total80C)}</p>
                            <p className="text-xs mt-1" style={{ color: c.textSecondary }}>Total potential claim over tenure</p>
                        </div>
                        <div className="p-4 rounded-xl border" style={{ backgroundColor: c.bg, borderColor: c.border }}>
                            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: c.textSecondary }}>Sec 24 (Interest)</p>
                            <p className="text-2xl font-bold text-amber-500">{formatINRShort(result.taxBenefits.total24)}</p>
                            <p className="text-xs mt-1" style={{ color: c.textSecondary }}>Total potential claim over tenure</p>
                        </div>
                    </div>
                </div>

                {/* 7. AMORTIZATION SCHEDULE */}
                <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <button 
                        onClick={() => setShowAmortization(!showAmortization)}
                        className="w-full flex items-center justify-between font-semibold text-lg"
                        style={{ color: c.text }}
                    >
                        Amortization Schedule
                        {showAmortization ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    <AnimatePresence>
                        {showAmortization && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 overflow-hidden"
                            >
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right text-sm">
                                        <thead>
                                            <tr className="border-b" style={{ borderColor: c.border, color: c.textSecondary }}>
                                                <th className="py-3 px-2 text-center font-medium">Month</th>
                                                <th className="py-3 px-2 font-medium hidden sm:table-cell">Opening</th>
                                                <th className="py-3 px-2 font-medium">Payment</th>
                                                <th className="py-3 px-2 font-medium">Interest</th>
                                                <th className="py-3 px-2 font-medium">Principal</th>
                                                <th className="py-3 px-2 font-medium">Balance</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pagedSchedule.map((row) => (
                                                <tr key={row.month} className="border-b border-opacity-50" style={{ borderColor: c.border, color: c.text }}>
                                                    <td className="py-3 px-2 text-center font-medium">{row.month}</td>
                                                    <td className="py-3 px-2 hidden sm:table-cell" style={{ color: c.textSecondary }}>{formatINR(row.openingBalance)}</td>
                                                    <td className="py-3 px-2 font-medium text-emerald-500">{formatINR(row.emi)}</td>
                                                    <td className="py-3 px-2 text-amber-500">{formatINR(row.interest)}</td>
                                                    <td className="py-3 px-2 text-blue-500">{formatINR(row.principal)}</td>
                                                    <td className="py-3 px-2 font-medium">{formatINR(row.closingBalance)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-4 mt-6">
                                        <button
                                            onClick={() => setAmortPage(p => Math.max(0, p - 1))}
                                            disabled={amortPage === 0}
                                            className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                            style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                                        >
                                            ← Prev
                                        </button>
                                        <span className="text-sm font-medium" style={{ color: c.textSecondary }}>
                                            Yr {amortPage * 2 + 1}–{Math.min((amortPage + 1) * 2, Math.ceil(result.schedule.length / 12))} of {Math.ceil(result.schedule.length / 12)}
                                        </span>
                                        <button
                                            onClick={() => setAmortPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={amortPage === totalPages - 1}
                                            className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                            style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                                        >
                                            Next →
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                
                {/* Spacer so content is not hidden behind safe navigation */}
                <div className="h-6"></div>
            </div>
        </div>
    );
}
