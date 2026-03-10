import { useState, useMemo, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import { ArrowLeft, Car, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { AnalyticsService } from '../lib/analytics';

export default function CarLoanCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Car_Loan'); }, []);
    useTrackCalculator();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const addSaved = useCalculatorStore((s) => s.addSaved);

    const [carPrice, setCarPrice] = useState('');
    const [discount, setDiscount] = useState('');
    const [downPayment, setDownPayment] = useState('');
    const [interestRate, setInterestRate] = useState('9');
    const [tenure, setTenure] = useState('5');
    const [showToast, setShowToast] = useState(false);

    const result = useMemo(() => {
        const price = Number(carPrice);
        const disc = Number(discount) || 0;
        const dp = Number(downPayment) || 0;
        const rate = Number(interestRate);
        const years = Number(tenure);
        if (!price || !rate || !years) return null;

        const effectivePrice = price - disc;
        const loanAmount = effectivePrice - dp;
        if (loanAmount <= 0) return null;

        const r = rate / 100 / 12;
        const n = years * 12;
        const emi = loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
        const totalPayment = emi * n;
        const totalInterest = totalPayment - loanAmount;

        return { effectivePrice, loanAmount, emi: Math.round(emi), totalInterest: Math.round(totalInterest), totalPayment: Math.round(totalPayment) };
    }, [carPrice, discount, downPayment, interestRate, tenure]);

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            <div className="px-4 pt-14 pb-8">
                <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border"><ArrowLeft size={18} className="text-slate-400" /></button>
                    <div className="flex items-center gap-2">
                        <Car size={20} className="text-brand-blue" />
                        <div><h1 className="text-lg font-bold text-white">{t('calculators.carLoan.name')}</h1><p className="text-slate-500 text-xs">{t('calculators.carLoan.desc')}</p></div>
                    </div>
                </div>

                <div className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3 mb-4">
                    <InputField label={t('calculators.carLoan.carPrice')} value={carPrice} onChange={setCarPrice} prefix="₹" />
                    <InputField label={t('calculators.carLoan.discount')} value={discount} onChange={setDiscount} prefix="₹" />
                    <InputField label={t('calculators.carLoan.downPayment')} value={downPayment} onChange={setDownPayment} prefix="₹" />
                    <InputField label={t('calculators.carLoan.interestRate')} value={interestRate} onChange={setInterestRate} suffix="%" />
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">{t('calculators.carLoan.tenure')}</label>
                        <div className="grid grid-cols-5 gap-2">
                            {[1, 2, 3, 5, 7].map(y => (
                                <button key={y} onClick={() => setTenure(String(y))}
                                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${Number(tenure) === y ? 'bg-brand-green text-black' : 'bg-dark-bg border border-dark-border text-slate-400'}`}>{y} {t('common.years')}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {result && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-brand-blue/10 to-brand-purple/10 border border-brand-blue/30 rounded-2xl p-5 space-y-4">
                        {/* Big EMI Display */}
                        <div className="text-center pb-3 border-b border-slate-700">
                            <p className="text-slate-500 text-xs mb-1">{t('calculators.carLoan.monthlyEmi')}</p>
                            <p className="text-3xl font-bold text-brand-green">₹{result.emi.toLocaleString('en-IN')}</p>
                        </div>

                        <div className="space-y-2">
                            <Row label={t('calculators.carLoan.loanAmount')} value={result.loanAmount} />
                            <Row label={t('calculators.carLoan.totalInterest')} value={result.totalInterest} color="text-red-400" />
                            <Row label={t('calculators.carLoan.totalPayment')} value={result.totalPayment} highlight />
                        </div>

                        {/* Visual split */}
                        <div className="w-full h-4 bg-slate-700 rounded-full overflow-hidden flex">
                            <div className="h-full bg-brand-blue" style={{ width: `${(result.loanAmount / result.totalPayment) * 100}%` }} />
                            <div className="h-full bg-red-500" style={{ width: `${(result.totalInterest / result.totalPayment) * 100}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px]">
                            <span className="text-brand-blue">Principal ({((result.loanAmount / result.totalPayment) * 100).toFixed(0)}%)</span>
                            <span className="text-red-400">Interest ({((result.totalInterest / result.totalPayment) * 100).toFixed(0)}%)</span>
                        </div>

                        <motion.button whileTap={{ scale: 0.97 }} onClick={() => { 
                            addSaved({ id: Date.now().toString(), calculatorType: 'Car Loan Calculator', inputValues: { carPrice, discount, downPayment, interestRate, tenure }, resultValues: result, timestamp: Date.now() }); 
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 2500);
                        }}
                            className="w-full py-4 bg-brand-purple text-white font-bold rounded-xl text-sm shadow-lg shadow-brand-purple/30 flex items-center justify-center gap-2">{t('common.saveCalculation')}</motion.button>
                    </motion.div>
                )}
            </div>
            
            <AnimatePresence>
                {showToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-24 left-4 right-4 bg-brand-green/20 border border-brand-green/50 text-brand-green px-4 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg backdrop-blur-md z-50 text-sm font-semibold"
                    >
                        <CheckCircle2 size={18} /> Calculation saved successfully! ✓
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function InputField({ label, value, onChange, prefix, suffix }: { label: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string }) {
    return (
        <div>
            <label className="text-xs text-slate-400 mb-1 block">{label}</label>
            <div className="relative">
                {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{prefix}</span>}
                <input type="number" value={value} onChange={e => onChange(e.target.value)}
                    className={`w-full bg-dark-bg border border-dark-border rounded-xl py-3 text-white text-sm focus:outline-none focus:border-brand-green ${prefix ? 'pl-8 pr-4' : suffix ? 'pl-4 pr-8' : 'px-4'}`} />
                {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{suffix}</span>}
            </div>
        </div>
    );
}

function Row({ label, value, highlight, color }: { label: string; value: number; highlight?: boolean; color?: string }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-slate-400 text-xs">{label}</span>
            <span className={`font-bold ${highlight ? 'text-brand-green text-lg' : color || 'text-white text-sm'}`}>₹{value.toLocaleString('en-IN')}</span>
        </div>
    );
}