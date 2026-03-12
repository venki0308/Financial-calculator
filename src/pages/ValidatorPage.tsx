import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Beaker } from 'lucide-react';

// ── Financial formula implementations ──────────────────────────────
function calcEMI(principal: number, annualRate: number, tenureMonths: number): number {
    if (annualRate === 0) return principal / tenureMonths;
    const r = annualRate / 12 / 100;
    return Math.round((principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1));
}

function calcSIPFV(monthly: number, annualRate: number, years: number): number {
    const r = annualRate / 12 / 100;
    const n = years * 12;
    return Math.round(monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r));
}

function calcCompoundInterest(principal: number, rate: number, years: number, freq: number): number {
    return Math.round(principal * Math.pow(1 + rate / (freq * 100), freq * years));
}

function calcGST(base: number, gstPercent: number): { gst: number; total: number } {
    const gst = Math.round(base * gstPercent / 100);
    return { gst, total: base + gst };
}

function calcPPFBalance(yearlyDeposit: number, rate: number, years: number): number {
    let balance = 0;
    for (let y = 0; y < years; y++) {
        balance = Math.round((balance + yearlyDeposit) * (1 + rate / 100));
    }
    return balance;
}

function calcSimpleInterest(principal: number, rate: number, years: number): number {
    return Math.round(principal + (principal * rate * years / 100));
}

// ── Test case type ──────────────────────────────────────────────────
interface TestCase {
    id: string;
    category: string;
    name: string;
    input: Record<string, number | string>;
    expected: number;
    actual: number;
    tolerance: number; // percentage, e.g. 0.5 = ±0.5%
}

function runTests(): TestCase[] {
    const tests: TestCase[] = [
        // EMI Tests
        {
            id: 'emi-1', category: 'EMI Calculator', name: 'Home Loan 30L @8.5% 20yr',
            input: { principal: 3000000, rate: 8.5, tenure: 240 },
            expected: 26035,
            actual: calcEMI(3000000, 8.5, 240),
            tolerance: 1,
        },
        {
            id: 'emi-2', category: 'EMI Calculator', name: 'Personal Loan 5L @15% 3yr',
            input: { principal: 500000, rate: 15, tenure: 36 },
            expected: 17332,
            actual: calcEMI(500000, 15, 36),
            tolerance: 1,
        },
        {
            id: 'emi-3', category: 'EMI Calculator', name: 'Car Loan 8L @9% 5yr',
            input: { principal: 800000, rate: 9, tenure: 60 },
            expected: 16604,
            actual: calcEMI(800000, 9, 60),
            tolerance: 1,
        },
        // SIP Tests
        {
            id: 'sip-1', category: 'SIP Calculator', name: 'SIP ₹5000/mo @12% 10yr',
            input: { monthly: 5000, rate: 12, years: 10 },
            expected: 1162254,
            actual: calcSIPFV(5000, 12, 10),
            tolerance: 1,
        },
        {
            id: 'sip-2', category: 'SIP Calculator', name: 'SIP ₹10000/mo @15% 20yr',
            input: { monthly: 10000, rate: 15, years: 20 },
            expected: 15165580,
            actual: calcSIPFV(10000, 15, 20),
            tolerance: 2,
        },
        // Compound Interest Tests
        {
            id: 'ci-1', category: 'Compound Interest', name: '₹1L @8% 5yr annually',
            input: { principal: 100000, rate: 8, years: 5, freq: 1 },
            expected: 146933,
            actual: calcCompoundInterest(100000, 8, 5, 1),
            tolerance: 1,
        },
        {
            id: 'ci-2', category: 'Compound Interest', name: '₹1L @10% 3yr quarterly',
            input: { principal: 100000, rate: 10, years: 3, freq: 4 },
            expected: 134489,
            actual: calcCompoundInterest(100000, 10, 3, 4),
            tolerance: 1,
        },
        // GST Tests
        {
            id: 'gst-1', category: 'GST Calculator', name: 'GST on ₹1000 @18%',
            input: { base: 1000, rate: 18 },
            expected: 1180,
            actual: calcGST(1000, 18).total,
            tolerance: 0,
        },
        {
            id: 'gst-2', category: 'GST Calculator', name: 'GST on ₹50000 @28%',
            input: { base: 50000, rate: 28 },
            expected: 64000,
            actual: calcGST(50000, 28).total,
            tolerance: 0,
        },
        // PPF Tests
        {
            id: 'ppf-1', category: 'PPF Calculator', name: 'PPF ₹1.5L/yr @7.1% 15yr',
            input: { yearly: 150000, rate: 7.1, years: 15 },
            expected: 4031388,
            actual: calcPPFBalance(150000, 7.1, 15),
            tolerance: 2,
        },
        // Simple Interest Tests
        {
            id: 'si-1', category: 'Simple Interest', name: 'SI ₹1L @6% 3yr',
            input: { principal: 100000, rate: 6, years: 3 },
            expected: 118000,
            actual: calcSimpleInterest(100000, 6, 3),
            tolerance: 0,
        },
    ];

    return tests;
}

function isPassed(test: TestCase): boolean {
    if (test.tolerance === 0) return test.actual === test.expected;
    const diff = Math.abs(test.actual - test.expected) / test.expected * 100;
    return diff <= test.tolerance;
}

function getStatus(test: TestCase) {
    if (isPassed(test)) return 'pass';
    const diff = Math.abs(test.actual - test.expected) / test.expected * 100;
    return diff <= test.tolerance * 3 ? 'warn' : 'fail';
}

export default function ValidatorPage() {
    const navigate = useNavigate();
    const [tests] = useState<TestCase[]>(runTests);

    const passed = tests.filter(t => getStatus(t) === 'pass').length;
    const warned = tests.filter(t => getStatus(t) === 'warn').length;
    const failed = tests.filter(t => getStatus(t) === 'fail').length;

    const categories = [...new Set(tests.map(t => t.category))];

    return (
        <div className="min-h-dvh bg-slate-50 dark:bg-background">
            <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white dark:bg-card border border-slate-200 dark:border-border">
                        <ArrowLeft size={18} className="text-slate-600 dark:text-muted-foreground" />
                    </button>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Beaker size={16} className="text-indigo-500" />
                            <h1 className="text-base font-bold text-slate-900 dark:text-foreground">Financial Formula Validator</h1>
                        </div>
                        <p className="text-muted-foreground text-xs">Dev Tool · Internal Testing Only</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-4 pb-28 space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-center">
                        <CheckCircle size={20} className="text-emerald-500 mx-auto mb-1" />
                        <p className="text-emerald-600 font-bold text-xl">{passed}</p>
                        <p className="text-emerald-600 text-[10px] font-semibold">PASSED</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-center">
                        <AlertCircle size={20} className="text-amber-500 mx-auto mb-1" />
                        <p className="text-amber-600 font-bold text-xl">{warned}</p>
                        <p className="text-amber-600 text-[10px] font-semibold">WARNINGS</p>
                    </div>
                    <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-center">
                        <XCircle size={20} className="text-red-500 mx-auto mb-1" />
                        <p className="text-red-600 font-bold text-xl">{failed}</p>
                        <p className="text-red-600 text-[10px] font-semibold">FAILED</p>
                    </div>
                </div>

                <div className="h-2 rounded-full bg-slate-200 dark:bg-card border-border overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(passed / tests.length) * 100}%` }} />
                </div>
                <p className="text-center text-xs text-muted-foreground">{passed}/{tests.length} tests passing ({Math.round(passed / tests.length * 100)}%)</p>

                {/* Tests by Category */}
                {categories.map(cat => {
                    const catTests = tests.filter(t => t.category === cat);
                    return (
                        <div key={cat}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-2">{cat}</p>
                            <div className="space-y-2">
                                {catTests.map(test => {
                                    const status = getStatus(test);
                                    const diff = ((test.actual - test.expected) / test.expected * 100).toFixed(2);
                                    return (
                                        <div key={test.id} className={`rounded-2xl border p-4 ${
                                            status === 'pass' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20' :
                                            status === 'warn' ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20' :
                                            'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20'
                                        }`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{test.name}</p>
                                                {status === 'pass' ? <CheckCircle size={16} className="text-emerald-500" /> :
                                                 status === 'warn' ? <AlertCircle size={16} className="text-amber-500" /> :
                                                 <XCircle size={16} className="text-red-500" />}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div>
                                                    <p className="text-muted-foreground">Expected</p>
                                                    <p className="font-mono font-bold text-slate-900 dark:text-foreground">₹{test.expected.toLocaleString('en-IN')}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Actual</p>
                                                    <p className={`font-mono font-bold ${status === 'pass' ? 'text-emerald-600' : status === 'warn' ? 'text-amber-600' : 'text-red-600'}`}>
                                                        ₹{test.actual.toLocaleString('en-IN')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Δ Diff</p>
                                                    <p className={`font-mono font-bold ${status === 'pass' ? 'text-emerald-600' : status === 'warn' ? 'text-amber-600' : 'text-red-600'}`}>
                                                        {diff}%
                                                    </p>
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">Tolerance: ±{test.tolerance}%</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
