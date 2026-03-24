import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Save, Check, FileText, ShieldAlert, Activity, BrainCircuit, Target, BarChart2, Info, TrendingUp, RotateCw, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import { formatINR } from '../utils/calculations';
import { exportToPDF } from '../utils/exportUtils';
import { useCalculatorStore } from '../store/useCalculatorStore';
import TaxInputGroup from '../components/TaxInputGroup';
import RiskCategoryTags from '../components/RiskCategoryTags';
import { TaxRegime, calculateAssetTax } from '../utils/taxEngine';
import { DecisionEngine } from '../services/DecisionEngine';
import DisclaimerComponent from '../components/DisclaimerComponent';

const fmtINR = (v: number) => formatINR(Math.round(v));

// Current Post Office TD Rates (FY 2025-26)
const TD_RATES: Record<string, number> = {
    '1': 6.9,
    '2': 7.0,
    '3': 7.1,
    '5': 7.5, // 5-year TD is eligible for 80C
};

export default function POTDCalculator() {
    const navigate = useNavigate();
    const { addSaved } = useCalculatorStore();

    useEffect(() => { AnalyticsService.trackScreen('POTD_Calculator'); }, []);

    const [investment, setInvestment] = useState(100000);
    const [years, setYears] = useState<'1' | '2' | '3' | '5'>('5');
    
    // Tax & Decision Engine states
    const [userIncome, setUserIncome] = useState(1200000);
    const [taxRegime, setTaxRegime] = useState<TaxRegime>('new');
    const [inflation, setInflation] = useState(6.0);
    const [fdRate, setFdRate] = useState(7.0);

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [saved, setSaved] = useState(false);

    const rate = TD_RATES[years];

    const result = useMemo(() => {
        const yr = Number(years);
        // Quarterly compounding, payable annually logic retained from original
        const r = rate / 400;
        const maturity = investment * Math.pow(1 + r, 4 * yr);
        const totalInterest = maturity - investment;
        const effectiveYield = (Math.pow(1 + r, 4) - 1) * 100;
        const cagr = (Math.pow(maturity / investment, 1 / yr) - 1) * 100;

        // Year-by-year table
        const table: { year: number; openBal: number; interest: number; closeBal: number }[] = [];
        let bal = investment;
        for (let y = 1; y <= yr; y++) {
            const close = bal * Math.pow(1 + r, 4);
            const interest = close - bal;
            table.push({ year: y, openBal: bal, interest, closeBal: close });
            bal = close;
        }

        // Comparison: All tenures for same amount
        const comparison = Object.entries(TD_RATES).map(([y, rt]) => ({
            tenure: y,
            rate: rt,
            maturity: investment * Math.pow(1 + rt / 400, 4 * Number(y)),
            interest: investment * Math.pow(1 + rt / 400, 4 * Number(y)) - investment,
        }));

        const is5Year = years === '5';
        const eligible80C = is5Year ? Math.min(investment, 150000) : 0;

        // Tax Engine
        const taxImpact = calculateAssetTax({
            annualIncome: userIncome,
            regime: taxRegime,
            assetInterest: totalInterest / yr, // Approximating annual interest added to income
            deduction80c: eligible80C
        });

        const taxOnInterest = Math.max(0, taxImpact.taxPayableOnAsset) * yr;
        const taxBenefit80C = taxImpact.taxSaved80C;

        const postTaxMaturity = maturity - taxOnInterest + taxBenefit80C;
        const postTaxCAGR = ((Math.pow(postTaxMaturity / investment, 1 / yr) - 1) * 100);

        // Inflation-adjusted real maturity
        const realPrincipalValue = investment / Math.pow(1 + inflation / 100, yr);
        const realMaturity = postTaxMaturity / Math.pow(1 + inflation / 100, yr);
        const realReturn = postTaxCAGR - inflation;

        // Bank FD comparison (same tenure, quarterly compounding)
        const fdMaturity = investment * Math.pow(1 + fdRate / 400, 4 * yr);
        const fdInterest = fdMaturity - investment;
        
        const fdTaxImpact = calculateAssetTax({
            annualIncome: userIncome,
            regime: taxRegime,
            assetInterest: fdInterest / yr,
            deduction80c: eligible80C // Bank 5Y FD is also 80C eligible
        });

        const fdTaxOnInterest = Math.max(0, fdTaxImpact.taxPayableOnAsset) * yr;
        const fdPostTaxMaturity = fdMaturity - fdTaxOnInterest + fdTaxImpact.taxSaved80C;

        return {
            maturity, totalInterest, effectiveYield, table, comparison,
            is5Year, eligible80C, taxOnInterest, taxBenefit80C, postTaxMaturity, postTaxCAGR,
            realMaturity, realPrincipalValue, realReturn,
            fdMaturity, fdInterest, fdTaxOnInterest, fdPostTaxMaturity,
            cagr
        };
    }, [investment, years, rate, userIncome, taxRegime, inflation, fdRate]);

    const riskConfig = DecisionEngine.getRiskConfig('POTD');
    const recommendation = useMemo(() => DecisionEngine.getRecommendation({
        calculatorId: 'POTD',
        realReturn: result.realReturn,
        is80CEligible: result.is5Year,
        postTaxCAGR: result.postTaxCAGR,
        liquidityScore: 3, // Lock-in applies, premature withdrawal possible with penalty
        riskLevel: riskConfig.risk
    }), [result.realReturn, result.postTaxCAGR, result.is5Year, riskConfig.risk]);

    const handleSave = () => {
        addSaved({
            id: crypto.randomUUID(),
            calculatorType: 'Post Office TD',
            inputValues: { investment, years, rate, userIncome, taxRegime },
            resultValues: { primary: result.maturity, totalInterest: result.totalInterest },
            timestamp: Date.now()
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handlePDFExport = () => {
        const headers = ['Parameter', 'Value'];
        const data: (string | number)[][] = [
            ['--- Inputs ---', ''],
            ['Investment Amount', fmtINR(investment)],
            ['Tenure', `${years} Year(s)`],
            ['Interest Rate', `${rate}% p.a. (Quarterly Compounding)`],
            ['Annual Income', fmtINR(userIncome)],
            ['Tax Regime', taxRegime === 'old' ? 'Old Regime' : 'New Regime'],
            ['Inflation Rate', `${inflation}% p.a.`],
            ['--- Results ---', ''],
            ['Maturity Amount', fmtINR(result.maturity)],
            ['Total Interest Earned', fmtINR(result.totalInterest)],
            ['Effective Yield', `${result.effectiveYield.toFixed(2)}%`],
            ['CAGR', `${result.cagr.toFixed(2)}%`],
            ['--- Tax Breakdown ---', ''],
            ['Estimated Tax on Interest (Total)', fmtINR(result.taxOnInterest)],
            ['80C Tax Saving (Upfront)', fmtINR(result.taxBenefit80C)],
            ['Post-Tax Maturity Value', fmtINR(result.postTaxMaturity)],
            ['Post-Tax CAGR', `${result.postTaxCAGR.toFixed(2)}%`],
            ['--- Alternative Scenarios ---', ''],
            ['Equivalent Bank FD (Post-Tax Mat)', fmtINR(result.fdPostTaxMaturity)],
            ['--- Real Return (Inflation Adj) ---', ''],
            ['Purchasing Power of Return', fmtINR(result.realMaturity)],
            ['Real Return CAGR', `${result.realReturn.toFixed(2)}%`],
            ['--- Final Recommendation ---', ''],
            [recommendation.title, recommendation.description]
        ];

        result.table.forEach(y => {
            data.push([`Year ${y.year}`, `${fmtINR(y.openBal)} → ${fmtINR(y.closeBal)} (+${fmtINR(y.interest)})`]);
        });

        exportToPDF(`Post Office Time Deposit (${years}Y) Report`, headers, data, 'POTD_Analysis');
    };

    const inputCls = "w-full bg-card border border-border rounded-xl px-4 py-3 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-blue";

    return (
        <div className="min-h-dvh bg-background" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                            <ArrowLeft size={18} className="text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Post Office TD</h1>
                            <p className="text-muted-foreground text-xs">Time Deposit (Fixed Deposit)</p>
                        </div>
                    </div>
                    <button onClick={handleSave} className="p-2 rounded-xl bg-card border border-border text-brand-blue">
                        {saved ? <Check size={18} /> : <Save size={18} />}
                    </button>
                </div>
                <RiskCategoryTags risk={riskConfig.risk} categories={riskConfig.categories} />
            </div>

            <div className="px-4 pt-5 pb-28 space-y-4">
                <div className="space-y-3">
                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-2 block">Tenure</label>
                        <div className="grid grid-cols-4 gap-2">
                            {(['1', '2', '3', '5'] as const).map(y => (
                                <button
                                    key={y}
                                    onClick={() => setYears(y)}
                                    className={`py-2 rounded-xl font-semibold text-sm transition-colors border flex flex-col items-center gap-0.5 ${years === y ? 'bg-brand-blue text-white border-brand-blue' : 'bg-card text-foreground border-border hover:border-brand-blue/50'}`}
                                >
                                    <span>{y} Year</span>
                                    <span className={`text-[10px] font-medium ${years === y ? 'text-blue-100' : 'text-muted-foreground'}`}>{TD_RATES[y]}%</span>
                                </button>
                            ))}
                        </div>
                        {years === '5' && (
                            <p className="text-brand-green text-[10px] mt-1.5 font-semibold">✓ 5-Year TD is eligible for Section 80C deduction</p>
                        )}
                    </div>

                    <div>
                        <label className="text-muted-foreground text-xs font-medium mb-1 block">Total Investment</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                            <input type="number" value={investment} onChange={e => setInvestment(Number(e.target.value) || 0)} className={inputCls + " pl-8"} />
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-brand-blue/20 to-blue-500/10 border border-brand-blue/30 p-5">
                    <p className="text-muted-foreground text-xs font-medium mb-1">Maturity Amount</p>
                    <p className="text-foreground font-bold text-3xl">{fmtINR(result.maturity)}</p>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                        <div>
                            <p className="text-muted-foreground text-[10px]">Invested</p>
                            <p className="text-foreground font-bold text-sm">{fmtINR(investment)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[10px]">Total Interest</p>
                            <p className="text-brand-green font-bold text-sm">+{fmtINR(result.totalInterest)}</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-[10px]">Effective Yield</p>
                            <p className="text-brand-blue font-bold text-sm">{result.effectiveYield.toFixed(2)}%</p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                    <button onClick={() => setShowAdvanced(p => !p)} className="w-full flex items-center justify-between p-4 bg-muted/30">
                        <div className="flex items-center gap-2">
                            <BrainCircuit size={18} className="text-brand-blue" />
                            <span className="text-foreground font-semibold text-sm">Decision Analytics</span>
                        </div>
                        {showAdvanced ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                    </button>
                    
                    <AnimatePresence initial={false}>
                        {showAdvanced && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                                <div className="px-4 pb-4 space-y-6 pt-2">

                                    <div className="flex items-center justify-end gap-2 border-b border-border pb-4">
                                        <button onClick={handlePDFExport} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-blue/10 text-brand-blue text-xs font-medium hover:bg-brand-blue/20 transition-colors">
                                            <FileText size={14} /> Export PDF
                                        </button>
                                    </div>

                                    {/* 1. Final Recommendation */}
                                    <div className={`p-4 rounded-xl border ${recommendation.status === 'success' ? 'bg-brand-green/10 border-brand-green/30' : recommendation.status === 'warning' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-brand-blue/10 border-brand-blue/30'}`}>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <ShieldCheck size={16} className={recommendation.status === 'success' ? 'text-brand-green' : recommendation.status === 'warning' ? 'text-orange-500' : 'text-brand-blue'} />
                                            <h3 className={`text-sm font-bold ${recommendation.status === 'success' ? 'text-brand-green' : recommendation.status === 'warning' ? 'text-orange-600 dark:text-orange-400' : 'text-brand-blue'}`}>
                                                FINAL RECOMMENDATION
                                            </h3>
                                        </div>
                                        <p className="text-foreground font-semibold text-sm mb-1">{recommendation.title}</p>
                                        <p className="text-muted-foreground text-xs leading-relaxed">{recommendation.description}</p>
                                    </div>

                                    {/* 2. Smart Insights */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Activity size={14} /> Smart Insights
                                        </h3>
                                        <div className="grid gap-2">
                                            {result.is5Year ? (
                                                <div className="p-3 rounded-xl bg-brand-green/10 border border-brand-green/20 flex gap-3">
                                                    <Info size={16} className="text-brand-green shrink-0 mt-0.5" />
                                                    <p className="text-[11px] font-medium text-brand-green">Selected 5-Year tenure locks you in but grants 80C deductions.</p>
                                                </div>
                                            ) : (
                                                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 flex gap-3">
                                                    <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
                                                    <p className="text-[11px] font-medium text-foreground">Current {years}Y tenure has no 80C tax benefit. Upgrade to 5Y if you need to save tax.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 3. Tax Analysis */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <BarChart2 size={14} /> Taxation & Net Returns
                                        </h3>
                                        
                                        <TaxInputGroup 
                                            income={userIncome} setIncome={setUserIncome} 
                                            regime={taxRegime} setRegime={setTaxRegime} 
                                        />

                                        <div className="space-y-2 bg-background p-3 rounded-xl border border-border mt-3">
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-muted-foreground text-[11px]">Gross Maturity</span>
                                                <span className="text-foreground font-medium text-[11px]">{fmtINR(result.maturity)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1">
                                                <span className="text-muted-foreground text-[11px]">Est. Tax on Interest (Total)</span>
                                                <span className="text-red-500 font-bold text-[11px] font-mono">-{fmtINR(result.taxOnInterest)}</span>
                                            </div>
                                            {result.taxBenefit80C > 0 && (
                                                <div className="flex justify-between items-center py-1">
                                                    <span className="text-muted-foreground text-[11px]">Upfront 80C Tax Saving</span>
                                                    <span className="text-brand-green font-bold text-[11px] font-mono">+{fmtINR(result.taxBenefit80C)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center py-1 pt-2 border-t border-border">
                                                <span className="text-foreground font-semibold text-[11px]">Net Post-Tax Maturity</span>
                                                <span className="text-brand-green font-bold text-[12px]">{fmtINR(result.postTaxMaturity)}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-1 bg-muted/50 px-2 rounded-lg mt-1">
                                                <span className="text-foreground font-semibold text-[11px]">Post-Tax CAGR</span>
                                                <span className="text-brand-blue font-bold text-[12px]">{result.postTaxCAGR.toFixed(2)}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4. Alternative: Bank FD */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <RotateCw size={14} /> Bank FD Comparison
                                        </h3>
                                        <div className="bg-muted border border-border rounded-xl p-3">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-muted-foreground text-[10px] font-medium">Bank FD Rate ({years}Y)</span>
                                                <div className="relative">
                                                    <input type="number" value={fdRate} step={0.1} onChange={e => setFdRate(Number(e.target.value) || 0)} className="w-16 bg-background border border-border rounded-md px-2 py-1 text-foreground text-xs font-semibold focus:outline-none focus:border-brand-blue pr-5" />
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px]">%</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <p className="text-muted-foreground text-[10px] mb-1">POTD Post-Tax</p>
                                                    <p className="text-foreground font-bold text-sm">{fmtINR(result.postTaxMaturity)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground text-[10px] mb-1">Bank FD Post-Tax</p>
                                                    <p className={`font-bold text-sm ${result.fdPostTaxMaturity > result.postTaxMaturity ? 'text-brand-green' : 'text-foreground'}`}>{fmtINR(result.fdPostTaxMaturity)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 5. Tenures Comparison */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Target size={14} /> Tenures at a Glance
                                        </h3>
                                        <div className="rounded-xl overflow-hidden border border-border">
                                            <div className="grid grid-cols-4 bg-muted px-2 py-2">
                                                {['Tenure', 'Rate', 'Interest', 'Maturity'].map(h => (
                                                    <p key={h} className="text-muted-foreground text-[9px] font-bold uppercase text-center">{h}</p>
                                                ))}
                                            </div>
                                            {result.comparison.map((row, i) => {
                                                const isSelected = row.tenure === years;
                                                return (
                                                    <div key={row.tenure} onClick={() => setYears(row.tenure as '1'|'2'|'3'|'5')} className={`grid grid-cols-4 px-2 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-brand-blue/10 border-brand-blue/20' : i % 2 === 0 ? 'bg-background hover:bg-muted' : 'bg-card hover:bg-muted'}`}>
                                                        <p className={`text-[10px] font-medium text-center ${isSelected ? 'text-brand-blue' : 'text-foreground'}`}>{row.tenure}Y</p>
                                                        <p className="text-foreground text-[10px] text-center">{row.rate}%</p>
                                                        <p className="text-brand-green text-[10px] text-center">{fmtINR(row.interest)}</p>
                                                        <p className={`text-[10px] font-semibold text-center ${isSelected ? 'text-brand-blue' : 'text-foreground'}`}>{fmtINR(row.maturity)}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 6. Inflation impact */}
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <TrendingUp size={14} /> Inflation Impact
                                        </h3>
                                        <div className="bg-muted border border-border rounded-xl p-3 flex justify-between items-center">
                                            <div>
                                                <label className="text-muted-foreground text-[10px] font-medium block mb-1">Inflation Rate (%)</label>
                                                <input type="number" value={inflation} onChange={e => setInflation(Number(e.target.value) || 0)} className="w-20 bg-background border border-border rounded-md px-2 py-1 text-foreground text-xs font-semibold focus:outline-none focus:border-brand-blue" />
                                            </div>
                                            <div className="text-right">
                                                <p className="text-muted-foreground text-[10px] mb-1">Purchasing Power</p>
                                                <p className="text-foreground font-bold text-sm">{fmtINR(result.realMaturity)}</p>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <DisclaimerComponent module="potd" />
        </div>
    );
}
