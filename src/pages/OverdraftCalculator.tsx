import React, { useState, useEffect, useMemo } from 'react';
import { Share2, FileText, Download, Wallet, Info, ChevronDown, ChevronUp, AlertCircle, Building2, User, CreditCard, Landmark, Pickaxe, Lightbulb, Scale, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { formatINR } from '../utils/calculations';
import { exportOverdraftPDF, exportOverdraftExcel } from '../utils/exportUtils';
import { AnalyticsService } from '../lib/analytics';
import { useNavigate } from 'react-router-dom';
import NumberInput from '../components/NumberInput';
import { useTrackCalculator } from '../hooks/useTrackCalculator';

// Helper to extract number
const parseFormattedNumber = (value: string): number => {
  if (!value) return 0;
  return Number(value.replace(/[^0-9.-]+/g, ''));
};

const formatNumberExt = (value: string): string => {
  if (!value) return '';
  const num = parseFormattedNumber(value);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-IN').format(num);
};

export default function OverdraftCalculator() {
  useTrackCalculator();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [odType, setOdType] = useState('business');
  const [odLimit, setOdLimit] = useState('10,00,000');
  const [interestRate, setInterestRate] = useState('10.5');
  const [utilizedAmount, setUtilizedAmount] = useState('5,00,000');
  
  const [durationMode, setDurationMode] = useState<'days'|'dates'>('days');
  const [daysUtilized, setDaysUtilized] = useState('30');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  
  const [processingFee, setProcessingFee] = useState('');
  const [annualCharge, setAnnualCharge] = useState('');

  const [showSchedule, setShowSchedule] = useState(false);
  const [showPreclosure, setShowPreclosure] = useState(false);
  
  const [monthsRemaining, setMonthsRemaining] = useState('6');
  const [preclosurePenalty, setPreclosurePenalty] = useState('0');

  useEffect(() => {
    AnalyticsService.trackScreen('Overdraft_Calculator');
  }, []);

  // Sync dates
  useEffect(() => {
    if (durationMode === 'dates' && startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (e >= s) {
        const diffTime = Math.abs(e.getTime() - s.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysUtilized(diffDays.toString());
      }
    }
  }, [startDate, endDate, durationMode]);

  const limitNum = parseFormattedNumber(odLimit);
  const utilizedNum = parseFormattedNumber(utilizedAmount);
  const rateNum = parseFloat(interestRate) || 0;
  const daysNum = parseInt(daysUtilized) || 0;
  const feePct = parseFloat(processingFee) || 0;
  const amcNum = parseFormattedNumber(annualCharge) || 0;
  
  const isOverLimit = utilizedNum > limitNum;
  
  // Base daily formula
  const activePrincipal = isOverLimit ? limitNum : utilizedNum;
  const dailyInterest = (activePrincipal * rateNum) / (365 * 100);
  const standardInterest = dailyInterest * daysNum;
  
  // Penalty for excess
  const excess = isOverLimit ? utilizedNum - limitNum : 0;
  const penaltyInterest = excess > 0 ? (excess * (rateNum + 2) * daysNum) / (365 * 100) : 0;
  
  const totalInterest = standardInterest + penaltyInterest;
  const processingFeeAmount = (limitNum * feePct) / 100;
  const totalFees = processingFeeAmount + amcNum;
  const totalPayableAmount = utilizedNum + totalInterest + totalFees;
  
  // Stats
  const availableLimit = Math.max(0, limitNum - utilizedNum);
  const effectiveCost = utilizedNum > 0 && daysNum > 0 
    ? ((totalInterest + totalFees) / utilizedNum) * (365 / daysNum) * 100 
    : 0;
  
  // Gauge
  const utilPct = limitNum > 0 ? (utilizedNum / limitNum) * 100 : 0;
  let gaugeColor = 'bg-brand-green';
  let gaugeText = 'Green (Healthy)';
  if (utilPct > 50 && utilPct <= 75) { gaugeColor = 'bg-amber-500'; gaugeText = 'Amber (Moderate)'; }
  else if (utilPct > 75 && utilPct <= 90) { gaugeColor = 'bg-orange-500'; gaugeText = 'Orange (High)'; }
  else if (utilPct > 90) { gaugeColor = 'bg-red-500'; gaugeText = 'Red (Critical)'; }

  // Schedule
  const scheduleRows = useMemo(() => {
    if (daysNum === 0 || utilizedNum === 0) return [];
    
    const rows = [];
    const maxRows = daysNum > 14 ? 14 : daysNum;
    
    for (let i = 1; i <= maxRows; i++) {
        let dayIndex = i;
        if (daysNum > 14 && i > 7) {
            dayIndex = daysNum - (14 - i);
        }
        
        let intOfDay = dailyInterest;
        if (isOverLimit) intOfDay += (excess * (rateNum + 2) / (365*100));

        rows.push({
            day: dayIndex,
            balance: utilizedNum,
            interestOfDay: intOfDay,
            isEllipsis: daysNum > 14 && i === 8
        });
    }
    return rows;
  }, [daysNum, utilizedNum, dailyInterest, excess, rateNum, isOverLimit]);

  // Pre-closure
  const mos = parseInt(monthsRemaining) || 0;
  const penaltyPct = parseFloat(preclosurePenalty) || 0;
  const preclosureCharges = (utilizedNum * penaltyPct) / 100;
  const totalToClose = utilizedNum + totalInterest + preclosureCharges;

  const getExportData = () => ({
    limitNum,
    utilizedNum,
    rateNum,
    daysNum,
    utilPct,
    totalInterest,
    totalFees,
    totalPayableAmount,
    dailyInterest,
    isOverLimit,
    excess,
    monthsRemaining: mos,
    penaltyPct,
    preclosureCharges,
    totalToClose,
    effectiveCost,
    odType
  });

  const exportToPDF = () => {
    exportOverdraftPDF(getExportData());
    AnalyticsService.trackFileDownload('pdf', 'overdraft_calculator');
  };

  const exportToExcel = () => {
    exportOverdraftExcel(getExportData());
    AnalyticsService.trackFileDownload('excel', 'overdraft_calculator');
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-16 pb-24 animate-fade-in">
        
      {/* Back Button Header */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-slate-600 dark:text-slate-400 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mb-4 -ml-2"
      >
        <ArrowLeft size={20} />
      </button>

      {/* SECTION 1: Header */}
      <div className="flex flex-col items-start gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-foreground">Overdraft Calculator</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Optimize your working capital & limit utilization
          </p>
        </div>
        <div className="flex gap-2 w-full">
          <button onClick={exportToPDF} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-card border border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-accent text-slate-700 dark:text-foreground rounded-xl shadow-sm text-sm font-bold transition-all">
            <FileText size={16} /> PDF
          </button>
          <button onClick={exportToExcel} className="flex-1 flex items-center justify-center gap-2 py-3 bg-white dark:bg-card border border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-accent text-slate-700 dark:text-foreground rounded-xl shadow-sm text-sm font-bold transition-all">
            <Download size={16} /> Excel
          </button>
        </div>
      </div>

      {/* SECTION 2: OD Type Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2 pt-1">
        {[
          { id: 'business', icon: Building2, label: 'Business OD' },
          { id: 'personal', icon: User, label: 'Personal OD' },
          { id: 'salary', icon: Wallet, label: 'Salary OD' },
          { id: 'fd', icon: Landmark, label: 'Against FD/Property' }
        ].map(type => {
          const Icon = type.icon;
          const active = odType === type.id;
          return (
            <button key={type.id} onClick={() => setOdType(type.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border shadow-sm ${
                active 
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent' 
                : 'bg-white dark:bg-card text-slate-700 dark:text-slate-300 border-slate-300 dark:border-border hover:bg-slate-100 hover:border-slate-400'
              }`}>
              <Icon size={16} className={active ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'} />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* SECTION 3: Input Form */}
      <div className="bg-white dark:bg-card rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-border mb-6 space-y-4">
        
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
            Sanctioned OD Limit
            <span className="text-muted-foreground text-xs ml-2">(₹)</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₹</span>
            <input type="text" value={odLimit} onChange={(e) => setOdLimit(formatNumberExt(e.target.value))}
              className="w-full pl-8 pr-4 py-3 bg-white dark:bg-background border border-slate-300 dark:border-border rounded-xl focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue text-slate-900 dark:text-foreground font-bold shadow-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
            Utilized Amount
            {isOverLimit && <span className="text-red-500 font-bold text-xs ml-2">Exceeds Limit!</span>}
          </label>
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-semibold ${isOverLimit ? 'text-red-500' : 'text-muted-foreground'}`}>₹</span>
            <input type="text" value={utilizedAmount} onChange={(e) => setUtilizedAmount(formatNumberExt(e.target.value))}
              className={`w-full pl-8 pr-4 py-3 bg-white dark:bg-background border rounded-xl focus:ring-2 font-bold shadow-sm ${
                  isOverLimit ? 'border-red-500 text-red-500 focus:ring-red-500/50' : 'border-slate-300 dark:border-border text-slate-900 dark:text-foreground focus:ring-brand-blue/50'
              }`} />
          </div>
          {isOverLimit && <p className="text-xs text-red-500 mt-1 font-medium">Warning: Penalty applies on excess utilization.</p>}
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
            Annual Interest Rate
            <span className="text-muted-foreground text-xs ml-2">(%)</span>
          </label>
          <div className="relative">
            <input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)}
              className="w-full pl-4 pr-8 py-3 bg-white dark:bg-background border border-slate-300 dark:border-border rounded-xl focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue text-slate-900 dark:text-foreground font-bold shadow-sm" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {odType === 'business' && 'Typically 9-12% for businesses'}
            {odType === 'personal' && 'Typically 12-15% for personal OD'}
            {odType === 'salary' && 'Typically 12-14% for salary OD'}
            {odType === 'fd' && 'Typically FD rate + 1-2%'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Duration</label>
          <div className="grid grid-cols-2 gap-2 mb-3 bg-slate-200 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-300 dark:border-transparent">
            <button onClick={() => setDurationMode('days')} 
              className={`py-2 text-xs font-bold rounded-lg transition-all ${durationMode === 'days' ? 'bg-white dark:bg-slate-700 shadow-sm flex-1 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'}`}>
              Days input
            </button>
            <button onClick={() => setDurationMode('dates')} 
              className={`py-2 text-xs font-bold rounded-lg transition-all ${durationMode === 'dates' ? 'bg-white dark:bg-slate-700 shadow-sm flex-1 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800'}`}>
              Date Range
            </button>
          </div>
          {durationMode === 'days' ? (
             <div className="relative">
                <input type="number" value={daysUtilized} onChange={(e) => setDaysUtilized(e.target.value)}
                className="w-full pl-4 pr-16 py-3 bg-white dark:bg-background border border-slate-300 dark:border-border rounded-xl focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue text-slate-900 dark:text-foreground font-bold shadow-sm" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">Days</span>
            </div>
          ) : (
             <div className="grid grid-cols-2 gap-3">
                 <div>
                     <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">Start Date</span>
                     <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                        className="w-full px-3 py-3 rounded-xl bg-white dark:bg-background border border-slate-300 dark:border-border text-sm font-semibold shadow-sm" />
                 </div>
                 <div>
                     <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">End Date</span>
                     <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}
                        className="w-full px-3 py-3 rounded-xl bg-white dark:bg-background border border-slate-300 dark:border-border text-sm font-semibold shadow-sm" />
                 </div>
             </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Optional Charges</label>
            <div className="grid grid-cols-2 gap-3">
                 <div>
                     <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Processing Fee %</span>
                     <input type="number" step="0.1" value={processingFee} onChange={e=>setProcessingFee(e.target.value)} placeholder="0.0"
                        className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-background border border-slate-300 dark:border-border text-sm font-semibold shadow-sm" />
                 </div>
                 <div>
                     <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Annual Charge ₹</span>
                     <input type="text" value={annualCharge} onChange={e=>setAnnualCharge(formatNumberExt(e.target.value))} placeholder="0"
                        className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-background border border-slate-300 dark:border-border text-sm font-semibold shadow-sm" />
                 </div>
             </div>
        </div>
      </div>

      {/* SECTION 4: Quick Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-100 dark:bg-slate-800/60 rounded-xl p-4 flex flex-col justify-center border border-slate-300 dark:border-transparent shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-muted-foreground mb-1">Sanctioned</span>
              <span className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">{formatINR(limitNum)}</span>
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 flex flex-col justify-center border border-red-200 dark:border-transparent shadow-sm">
              <span className="text-[10px] uppercase font-bold text-red-700 dark:text-red-400 mb-1">Utilized</span>
              <span className="text-base font-bold text-red-800 dark:text-red-400 truncate">{formatINR(utilizedNum)}</span>
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 flex flex-col justify-center border border-amber-200 dark:border-transparent shadow-sm">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-500 mb-1">Interest Accrued</span>
              <span className="text-base font-bold text-amber-800 dark:text-amber-400 truncate">{formatINR(totalInterest)}</span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 flex flex-col justify-center border border-emerald-200 dark:border-transparent shadow-sm">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-500 mb-1">Available Limit</span>
              <span className="text-base font-bold text-emerald-800 dark:text-emerald-400 truncate">{formatINR(availableLimit)}</span>
          </div>
      </div>

      {/* SECTION 5: Utilization Gauge */}
      <div className="bg-white dark:bg-card p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-border mb-6">
          <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold">Limit Utilization</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold text-white ${gaugeColor}`}>
                  {gaugeText}
              </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-2 overflow-hidden">
              <div className={`h-full ${gaugeColor} transition-all duration-700 ease-out`} style={{width: `${Math.min(utilPct, 100)}%`}}></div>
          </div>
          <div className="flex justify-between items-center text-xs font-semibold text-muted-foreground">
              <span>0%</span>
              <span className="text-slate-900 dark:text-white font-bold">{utilPct.toFixed(1)}% utilized</span>
              <span>100%</span>
          </div>
      </div>

      {/* SECTION 6: Assessment Summary */}
      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-6 rounded-2xl shadow-lg border border-indigo-400/30 text-white mb-6 relative overflow-hidden">
        <div className="relative z-10">
            <h3 className="text-xs uppercase font-bold text-indigo-100 tracking-widest mb-1">Assessment Summary</h3>
            <p className="text-3xl font-black tracking-tight mb-5">{formatINR(totalPayableAmount)}</p>

            <div className="space-y-3 pt-4 border-t border-indigo-400/30">
                <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-indigo-100">Principal</span>
                <span>{formatINR(utilizedNum)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-indigo-100">Total Interest</span>
                <span className="text-amber-300 font-bold">+{formatINR(totalInterest)}</span>
                </div>
                {totalFees > 0 && (
                    <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-indigo-100">Total Fees</span>
                    <span className="text-amber-300 font-bold">+{formatINR(totalFees)}</span>
                    </div>
                )}
            </div>

            <div className="mt-5 pt-4 border-t border-indigo-400/30 grid grid-cols-2 gap-4">
                 <div>
                    <span className="block text-[10px] uppercase font-bold text-indigo-200 mb-1">Effective Cost (EAC)</span>
                    <span className="text-lg font-bold">{effectiveCost.toFixed(2)}% p.a.</span>
                 </div>
                 <div>
                    <span className="block text-[10px] uppercase font-bold text-indigo-200 mb-1">Daily Interest Cost</span>
                    <span className="text-lg font-bold">₹{(totalInterest/Math.max(1, daysNum)).toFixed(0)}/day</span>
                 </div>
            </div>
        </div>
      </div>

      {/* SECTION 7: Daily Interest Schedule */}
      <div className="mb-4">
        <button onClick={() => setShowSchedule(!showSchedule)}
            className="w-full py-3.5 rounded-2xl border border-slate-200 dark:border-border text-slate-800 dark:text-slate-200 font-bold text-sm bg-white dark:bg-card flex items-center justify-center gap-2 shadow-sm">
            {showSchedule ? 'Hide' : 'View'} Daily Interest Schedule
            {showSchedule ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showSchedule && (
            <div className="mt-2 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-4 overflow-hidden shadow-sm animate-fade-in">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-muted-foreground border-b border-slate-200 dark:border-border">
                            <th className="py-2 text-left font-bold">Day</th>
                            <th className="py-2 text-right font-bold">Balance</th>
                            <th className="py-2 text-right font-bold">Day Interest</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scheduleRows.map((r, idx) => {
                            if (r.isEllipsis) {
                                return (
                                  <tr key={`ellipsis-${idx}`} className="text-center text-muted-foreground font-bold border-b border-slate-100 dark:border-border/50">
                                      <td colSpan={3} className="py-2">. . .</td>
                                  </tr>
                                )
                            }
                            return (
                                <tr key={r.day} className="border-b border-slate-100 dark:border-border/30 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="py-2 font-medium">Day {r.day}</td>
                                    <td className="py-2 text-right text-slate-600 dark:text-slate-400">{formatINR(r.balance)}</td>
                                    <td className="py-2 text-right font-semibold text-amber-600 dark:text-amber-400">{formatINR(r.interestOfDay)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )}
      </div>

      {/* SECTION 8: Pre-closure Calculator */}
      <div className="mb-6">
        <button onClick={() => setShowPreclosure(!showPreclosure)}
            className="w-full py-3.5 rounded-2xl border border-slate-200 dark:border-border text-slate-800 dark:text-slate-200 font-bold text-sm bg-white dark:bg-card flex items-center justify-center gap-2 shadow-sm">
            {showPreclosure ? 'Hide' : 'Calculate'} Pre-closure / Expiry
            {showPreclosure ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showPreclosure && (
            <div className="mt-2 bg-white dark:bg-card border border-slate-200 dark:border-border rounded-2xl p-5 shadow-sm animate-fade-in space-y-4">
                 <div>
                     <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1 mt-1">Months Remaining to Expiry</label>
                     <input type="number" value={monthsRemaining} onChange={e=>setMonthsRemaining(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-background border border-slate-300 dark:border-border text-sm font-semibold shadow-sm" />
                 </div>
                 <div>
                     <label className="block text-[10px] uppercase font-bold text-muted-foreground mb-1">Pre-closure penalty %</label>
                     <input type="number" step="0.5" value={preclosurePenalty} onChange={e=>setPreclosurePenalty(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-background border border-slate-300 dark:border-border text-sm font-semibold shadow-sm" />
                 </div>
                 
                 <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-xl mt-4">
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Penalty Charges</span>
                         <span className="text-sm font-bold text-red-500">{formatINR(preclosureCharges)}</span>
                     </div>
                     <div className="flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-2">
                         <span className="text-sm font-black text-slate-900 dark:text-white">Total to Close</span>
                         <span className="text-lg font-black text-slate-900 dark:text-white">{formatINR(totalToClose)}</span>
                     </div>
                 </div>
            </div>
        )}
      </div>

      {/* SECTION 9: OD vs Personal Loan Comparison */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-3xl p-6 mb-6">
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-4 flex items-center gap-2">
             <Scale className="w-5 h-5 text-brand-blue dark:text-indigo-400" /> OD vs Personal Loan
          </h3>
          
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-brand-blue dark:text-indigo-300 font-bold uppercase tracking-wider mb-1">Overdraft (OD)</div>
                  <div className="text-brand-blue dark:text-indigo-300 font-bold uppercase tracking-wider mb-1">Personal Loan (PL)</div>
                  
                  <div className="bg-white dark:bg-slate-700/80 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                      <strong className="block text-slate-900 dark:text-white mb-1">Interest Calc</strong>
                      <span className="text-slate-600 dark:text-slate-300">Daily on utilized amount only.</span>
                  </div>
                  <div className="bg-white dark:bg-slate-700/80 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                      <strong className="block text-slate-900 dark:text-white mb-1">Interest Calc</strong>
                      <span className="text-slate-600 dark:text-slate-300">Reducing/Flat on entire disbursed amount.</span>
                  </div>

                  <div className="bg-white dark:bg-slate-700/80 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                      <strong className="block text-emerald-600 dark:text-emerald-400 mb-1">Pre-closure</strong>
                      <span className="text-slate-600 dark:text-slate-300">Usually Nil or very low. Flexibility to repay anytime.</span>
                  </div>
                  <div className="bg-white dark:bg-slate-700/80 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                      <strong className="block text-red-600 dark:text-red-400 mb-1">Pre-closure</strong>
                      <span className="text-slate-600 dark:text-slate-300">High penalty, typically up to 4-5% of balance.</span>
                  </div>
                  
                  <div className="bg-white dark:bg-slate-700/80 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                      <strong className="block text-slate-900 dark:text-white mb-1">Best For</strong>
                      <span className="text-slate-600 dark:text-slate-300">Short-term cash flow needs, working capital.</span>
                  </div>
                  <div className="bg-white dark:bg-slate-700/80 p-3 rounded-lg border border-slate-200 dark:border-slate-600 shadow-sm">
                      <strong className="block text-slate-900 dark:text-white mb-1">Best For</strong>
                      <span className="text-slate-600 dark:text-slate-300">Large, planned, one-time expenses (car, wedding).</span>
                  </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-start gap-3">
                  <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-xl text-emerald-600 dark:text-emerald-400 mt-1 shadow-sm">
                      <Lightbulb size={20} />
                  </div>
                  <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">Smart Verdict</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
                          Based on your {daysNum} days usage, OD is significantly cheaper than a typical personal loan because you only pay for the exact days you borrow. OD is ideal for bridging short-term liquidity gaps.
                      </p>
                  </div>
              </div>
          </div>
      </div>

      {/* SECTION 10: Smart Tips */}
      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 px-1">Optimization Tips</h3>
      <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 p-4 rounded-2xl">
              <span className="text-xl mb-2 block">📅</span>
              <strong className="block text-xs text-blue-800 dark:text-blue-300 font-bold mb-1">Interest is Daily</strong>
              <p className="text-[10px] text-blue-600/80 dark:text-blue-200/70">Deposit cash back to OD account as soon as possible, even for weekends, to save on daily accrued interest.</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 rounded-2xl">
              <span className="text-xl mb-2 block">🏦</span>
              <strong className="block text-xs text-emerald-800 dark:text-emerald-300 font-bold mb-1">Deposit Idle Cash</strong>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-200/70">Route all your incoming payments entirely into the OD account to keep the utilized balance as low as possible.</p>
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 rounded-2xl">
              <span className="text-xl mb-2 block">⚠️</span>
              <strong className="block text-xs text-red-800 dark:text-red-300 font-bold mb-1">Avoid Limit Breach</strong>
              <p className="text-[10px] text-red-600/80 dark:text-red-200/70">Exceeding the sanctioned limit triggers heavy penal interest (usually +2% to +4%). Keep a buffer for safety.</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 p-4 rounded-2xl">
              <span className="text-xl mb-2 block">🤝</span>
              <strong className="block text-xs text-purple-800 dark:text-purple-300 font-bold mb-1">Renegotiate Rates</strong>
              <p className="text-[10px] text-purple-600/80 dark:text-purple-200/70">If your limit utilization is consistently high and credit score is good, request your bank for a lower interest rate.</p>
          </div>
      </div>

      <DisclaimerComponent module="overdraft" />

    </div>
  );
}
