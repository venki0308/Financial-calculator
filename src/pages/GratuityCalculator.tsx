import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, ShieldAlert, FileText, ChevronLeft, ChevronRight, Activity, BrainCircuit, Target, BarChart2, Info, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF } from '../utils/exportUtils';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { calculateAssetTax } from '../utils/taxEngine';
import { DecisionEngine } from '../services/DecisionEngine';
import RiskCategoryTags from '../components/RiskCategoryTags';
import TaxInputGroup from '../components/TaxInputGroup';
import DisclaimerComponent from '../components/DisclaimerComponent';

const fmtINR = (v: number) => formatINR(Math.round(v));

const ITEMS_PER_PAGE = 10;

export default function GratuityCalculator() {
    const navigate = useNavigate();
    const { addSaved } = useCalculatorStore();

    useEffect(() => { AnalyticsService.trackScreen('Gratuity'); }, []);

    const [salary, setSalary] = useState(50000);
    const [years, setYears] = useState(10);
    const [employerType, setEmployerType] = useState<'Private' | 'Govt'>('Private');
    const [annualIncome, setAnnualIncome] = useState(1500000);
    const [taxRegime, setTaxRegime] = useState<'new' | 'old'>('new');
    const [salaryHike, setSalaryHike] = useState(5);
    const [projectionYears, setProjectionYears] = useState(5);

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [saved, setSaved] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    const result = useMemo(() => {
        // Formula: (Last Drawn Salary × 15 × Years of Service) / 26
        const isEligible = years >= 4.5; // Eligible at 4 years 240 days (approx 4.5)
        const roundedYears = (years >= 4.5 && years < 5) ? 5 : Math.round(years);
        const gratuity = isEligible ? (salary * 15 * roundedYears) / 26 : 0;
        const exemptionLimit = employerType === 'Govt' ? Infinity : 2000000; // Govt fully exempt
        const taxableGratuity = Math.max(0, gratuity - exemptionLimit);
        
        // Use standard tax calculation
        const taxDetails = calculateAssetTax({
            annualIncome: annualIncome,
            assetInterest: taxableGratuity,
            regime: taxRegime,
            deduction80c: 0
        });
        const estimatedTax = taxDetails.taxPayableOnAsset;
        const netGratuity = gratuity - estimatedTax;

        // Service Milestones / Year-wise impact
        const yearWiseData = Array.from({ length: Math.ceil(years) }, (_, i) => {
            const yr = i + 1;
            const eligible = yr >= 5; // Year table shows strict 5 for simplicity or we can show 4.5
            const amt = eligible ? (salary * 15 * yr) / 26 : 0;
            return { year: yr, gratuity: amt, eligible };
        });

        // Future Projection
        const projectedSalary = salary * Math.pow(1 + salaryHike / 100, projectionYears);
        const projectedTotalYears = years + projectionYears;
        const projectedGratuity = (projectedSalary * 15 * projectedTotalYears) / 26;

        // Use standard DecisionEngine
        const recommendation = DecisionEngine.getRecommendation({
            calculatorId: 'Gratuity',
            realReturn: 0, // purely a corpus building, no direct inflation adjusted return calculation
            is80CEligible: false,
            postTaxCAGR: 0, 
            liquidityScore: 10,
            riskLevel: 'Low (Govt backed)'
        });
        
        const riskConfig = DecisionEngine.getRiskConfig('Gratuity');

        return { 
            gratuity, exemptionLimit, taxableGratuity, estimatedTax, netGratuity, 
            isEligible, yearWiseData, projectedSalary, projectedTotalYears, projectedGratuity,
            taxDetails, recommendation, riskConfig
        };
    }, [salary, years, annualIncome, taxRegime, salaryHike, projectionYears]);

    const handleSave = () => {
        addSaved({
            id: crypto.randomUUID(),
            calculatorType: 'Gratuity Calculator',
            inputValues: { salary, years },
            resultValues: result,
            timestamp: Date.now()
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handlePDFExport = () => {
        const headers = ['Parameter', 'Value'];
        const data: (string | number)[][] = [
            ['Employer Type', employerType],
            ['Last Drawn Salary (Basic+DA)', fmtINR(salary)],
            ['Years of Service', `${years} years`],
            ['Eligibility', result.isEligible ? 'Eligible (>= 4.5 Years)' : 'Not Eligible (< 4.5 Years)'],
            ['Calculated Gratuity', fmtINR(result.gratuity)],
            ['Tax Exemption Limit', employerType === 'Govt' ? 'Fully Exempt' : fmtINR(result.exemptionLimit)],
            ['Taxable Gratuity', fmtINR(result.taxableGratuity)],
            ['Estimated Tax', fmtINR(result.estimatedTax)],
            ['Net In-Hand Gratuity', fmtINR(result.netGratuity)],
            ['', ''],
            ['Future Projection (addl. years)', `${projectionYears} years`],
            ['Assumed Salary Hike', `${salaryHike}% p.a.`],
            ['Projected Final Salary', fmtINR(result.projectedSalary)],
            ['Projected Total Service', `${result.projectedTotalYears} years`],
            ['Projected Future Gratuity', fmtINR(result.projectedGratuity)]
        ];

        result.yearWiseData.forEach(y => {
            data.push([`Year ${y.year}`, y.eligible ? 'Yes' : 'No', fmtINR(y.gratuity)]);
        });

        exportToPDF('Gratuity Analysis Report', headers, data, 'Gratuity_Analysis');
    };

    const totalPages = Math.ceil(result.yearWiseData.length / ITEMS_PER_PAGE);
    const paginatedYears = result.yearWiseData.slice(
        currentPage * ITEMS_PER_PAGE,
        (currentPage + 1) * ITEMS_PER_PAGE
    );

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-base font-semibold focus:outline-none focus:border-brand-blue";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                            <ArrowLeft size={18} className="text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Gratuity Calculator</h1>
                            <p className="text-muted-foreground text-xs">Service gratuity estimate</p>
                            <div className="mt-1">
                                <RiskCategoryTags risk={result.riskConfig.risk} categories={result.riskConfig.categories} />
                            </div>
                        </div>
                    </div>
                    <button onClick={handleSave} className="p-2 rounded-xl bg-card border border-border text-brand-blue">
                        {saved ? <Check size={18} /> : <Save size={18} />}
                    </button>
                </div>
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                {/* Inputs */}
                <div className="space-y-3">
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-2 block">Employer Type</label>
                        <div className="flex bg-muted/30 p-1 rounded-xl border border-border">
                            {(['Private', 'Govt'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setEmployerType(type)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                        employerType === type 
                                            ? 'bg-background text-brand-blue shadow-sm border border-border' 
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {type} Sector
                                </button>
                            ))}
                        </div>
                        {employerType === 'Govt' && (
                            <p className="text-brand-green text-[10px] mt-1.5 font-semibold">✓ Govt employee gratuity is fully exempt from Income Tax</p>
                        )}
                    </div>
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Last Drawn Salary (Basic + DA)</label>
                        <p className="text-muted-foreground text-[10px] mb-1">Monthly Basic + DA</p>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={salary} onChange={e => setSalary(Number(e.target.value) || 0)} className={inputCls + " pl-8"} />
                        </div>
                    </div>
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Years of Service</label>
                        <p className="text-muted-foreground text-[10px] mb-1">Act considers 4 yrs 240 days (4.5 yrs) as 5 years.</p>
                        <div className="relative">
                            <input type="number" step="0.1" value={years} onChange={e => {
                                setYears(Math.max(1, Number(e.target.value) || 1));
                                setCurrentPage(0);
                            }} className={inputCls + " pr-16"} />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">years</span>
                        </div>
                    </div>
                </div>

                {/* Primary Result Widget */}
                <div className={`rounded-2xl border p-5 transition-colors ${!result.isEligible ? 'bg-red-500/10 border-red-500/30' : 'bg-gradient-to-br from-brand-blue/20 to-blue-500/10 border-brand-blue/30'}`}>
                    {!result.isEligible ? (
                        <div className="flex items-start gap-3 mb-2">
                            <ShieldAlert size={20} className="text-red-500 mt-1 shrink-0" />
                            <div>
                                <p className="text-red-500 font-bold">Not Eligible for Gratuity</p>
                                <p className="text-red-400/80 text-xs">Minimum 5 years of continuous service is required as per the Payment of Gratuity Act.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-muted-foreground text-xs font-medium mb-1">Estimated Gratuity</p>
                            <p className="text-foreground font-bold text-3xl">{fmtINR(result.gratuity)}</p>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-muted-foreground text-[11px]">Service Period</p>
                                    <p className="text-foreground font-bold text-base">{years} years</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-[11px]">Tax Exemption</p>
                                    <p className="text-brand-green font-bold text-base">Up to ₹20 Lakh</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Advanced Details Collapsible */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-4 bg-muted/30">
                        <div className="flex items-center gap-2">
                            <BrainCircuit size={18} className="text-brand-blue" />
                            <span className="text-foreground font-semibold text-sm">Decision Analytics & Details</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>
                    
                    <AnimatePresence initial={false}>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                <div className="px-4 pb-4 space-y-6 pt-2">
                                    
                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end gap-2 border-b border-border pb-4">
                                        <button onClick={handlePDFExport} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-blue/10 text-brand-blue text-xs font-medium hover:bg-brand-blue/20 transition-colors">
                                            <FileText size={14} /> Export PDF
                                        </button>
                                    </div>

                                    {/* Smart Insights */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Lightbulb size={14} className="text-brand-blue" /> Final Recommendation
                                        </h3>
                                        <div className={`p-4 rounded-xl border ${
                                            result.recommendation.status === 'success' ? 'bg-brand-green/10 border-brand-green/20' :
                                            result.recommendation.status === 'warning' ? 'bg-orange-500/10 border-orange-500/20' :
                                            'bg-brand-blue/10 border-brand-blue/20'
                                        }`}>
                                            <h4 className={`text-sm font-bold mb-1 ${
                                                result.recommendation.status === 'success' ? 'text-brand-green' :
                                                result.recommendation.status === 'warning' ? 'text-orange-600 dark:text-orange-400' :
                                                'text-brand-blue'
                                            }`}>
                                                {result.recommendation.title}
                                            </h4>
                                            <p className="text-xs text-foreground/80 leading-relaxed">
                                                {result.recommendation.description}
                                            </p>
                                        </div>
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mt-4">
                                            <Activity size={14} /> Smart Insights
                                        </h3>
                                        <div className="grid gap-2">
                                            {!result.isEligible && (
                                                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3">
                                                    <Info size={16} className="text-orange-500 shrink-0" />
                                                    <p className="text-xs font-medium text-orange-600 dark:text-orange-400">Complete {Math.max(0, 4.5 - years).toFixed(1)} more year(s) to become eligible for Gratuity payouts.</p>
                                                </div>
                                            )}
                                            {result.isEligible && result.taxableGratuity === 0 && (
                                                <div className="p-3 rounded-xl bg-brand-green/10 border border-brand-green/20 flex gap-3">
                                                    <Check size={16} className="text-brand-green shrink-0 mt-0.5" />
                                                    <p className="text-xs font-medium text-brand-green">
                                                        Your entire gratuity amount is currently tax-free {employerType === 'Govt' ? '(Govt employees are fully exempt)' : '(Under ₹20 Lakhs limit)'}.
                                                    </p>
                                                </div>
                                            )}
                                            {result.isEligible && result.taxableGratuity > 0 && (
                                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3">
                                                    <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
                                                    <p className="text-xs font-medium text-red-500">Your gratuity exceeds the ₹20L exemption limit by {fmtINR(result.taxableGratuity)}. This surplus will be taxed as per your income slab.</p>
                                                </div>
                                            )}
                                            <div className="p-3 rounded-xl bg-brand-blue/10 border border-brand-blue/20 flex gap-3">
                                                <Target size={16} className="text-brand-blue shrink-0 mt-0.5" />
                                                <p className="text-xs font-medium text-brand-blue">Salary used is only Basic + Dearness Allowance (DA). Other allowances are excluded from the calculation.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Formula detailed breakdown */}
                                    {result.isEligible && (
                                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                            <p className="text-muted-foreground text-xs font-semibold mb-3">Formula Breakdown</p>
                                            <p className="text-foreground text-xs font-mono mb-2">
                                                = (Salary × 15 × Years) / 26
                                            </p>
                                            <p className="text-muted-foreground text-[11px]">
                                                = ({fmtINR(salary)} × 15 days × {years} years) / 26 working days
                                            </p>
                                            <div className="mt-3 pt-3 border-t border-border/50">
                                                <p className="text-foreground font-semibold text-sm">= {fmtINR(result.gratuity)}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tax Engine */}
                                    {result.isEligible && (
                                        <div className="space-y-3 pt-2">
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                                <BarChart2 size={14} /> Tax Calculation
                                            </h3>
                                            <div className="space-y-4">
                                                <TaxInputGroup
                                                    income={annualIncome}
                                                    setIncome={setAnnualIncome}
                                                    regime={taxRegime}
                                                    setRegime={setTaxRegime}
                                                />

                                                <div className="space-y-2 bg-background p-3 rounded-xl border border-border">
                                                    {[
                                                        { label: 'Calculated Gratuity', val: result.gratuity },
                                                        { label: 'Exemption Limit', val: result.exemptionLimit, green: true },
                                                        { label: 'Taxable Portion', val: result.taxableGratuity, red: result.taxableGratuity > 0 },
                                                        { label: `Estimated Tax Liability`, val: result.estimatedTax, red: result.estimatedTax > 0 },
                                                        { label: 'Final Net Gratuity', val: result.netGratuity, bold: true, green: true },
                                                    ].map(({ label, val, green, red, bold }, idx) => (
                                                        <div key={idx} className="flex justify-between items-center py-1">
                                                            <span className={`text-[11px] ${bold ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{label}</span>
                                                            <span className={`text-[11px] font-mono ${green ? 'text-brand-green font-bold' : red ? 'text-red-500 font-bold' : 'text-foreground font-medium'}`}>{fmtINR(val)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Future Projection Simulator */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Activity size={14} /> Future Gratuity Simulator
                                        </h3>
                                        <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-muted-foreground text-[10px] font-medium block mb-1">Expected Salary Hike</label>
                                                    <div className="relative">
                                                        <input type="number" value={salaryHike} onChange={e => setSalaryHike(Number(e.target.value) || 0)} className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-foreground text-xs font-semibold focus:outline-none focus:border-brand-blue pr-6" />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-muted-foreground text-[10px] font-medium block mb-1">Future Projection In</label>
                                                    <div className="relative">
                                                        <input type="number" value={projectionYears} onChange={e => setProjectionYears(Number(e.target.value) || 0)} className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-foreground text-xs font-semibold focus:outline-none focus:border-brand-blue pr-8" />
                                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">years</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-background rounded-lg p-3 border border-border">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-muted-foreground text-[11px]">Future Salary</span>
                                                    <span className="text-foreground text-xs font-bold">{fmtINR(result.projectedSalary)}</span>
                                                </div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-muted-foreground text-[11px]">Total Service Then</span>
                                                    <span className="text-foreground text-xs font-bold">{result.projectedTotalYears} years</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-2 border-t border-border">
                                                    <span className="text-foreground text-xs font-semibold">Future Gratuity</span>
                                                    <span className="text-brand-blue text-sm font-black">{fmtINR(result.projectedGratuity)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Year-Wise Service Track */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Year-by-Year Service Impact</h3>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-3 bg-muted px-3 py-2">
                                                <p className="text-muted-foreground text-[10px] font-bold">YEAR</p>
                                                <p className="text-muted-foreground text-[10px] font-bold">ELIGIBLE?</p>
                                                <p className="text-muted-foreground text-[10px] font-bold text-right">GRATUITY</p>
                                            </div>
                                            {paginatedYears.map((row, i) => (
                                                <div key={row.year} className={`grid grid-cols-3 px-3 py-2 text-[11px] ${i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                                                    <p className="text-foreground font-medium">Year {row.year}</p>
                                                    <p className={row.eligible ? "text-brand-green font-medium" : "text-red-400"}>{row.eligible ? "Yes" : "No"}</p>
                                                    <p className="text-foreground font-mono font-medium text-right">{fmtINR(row.gratuity)}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Pagination */}
                                        {totalPages > 1 && (
                                            <div className="flex items-center justify-between pt-2">
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                                    disabled={currentPage === 0}
                                                    className="p-1 rounded-lg hover:bg-muted disabled:opacity-50"
                                                >
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    Page {currentPage + 1} of {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                                    disabled={currentPage === totalPages - 1}
                                                    className="p-1 rounded-lg hover:bg-muted disabled:opacity-50"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <DisclaimerComponent module="gratuity" />
        </div>
    );
}
