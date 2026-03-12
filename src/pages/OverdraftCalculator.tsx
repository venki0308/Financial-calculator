
import React, { useState, useEffect, useRef } from 'react';
import { Share2, FileText, Download, Calculator, Info, Wallet, PieChart, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatINR } from '../utils/calculations';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title 
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { jsPDF } from 'jspdf';
import DisclaimerComponent from '../components/DisclaimerComponent';
import FinancialQuote from '../components/FinancialQuote';
import { exportToExcel as utilsExportToExcel } from '../utils/exportUtils';
import { AnalyticsService } from '../lib/analytics';

ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title
);

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
  const { t } = useTranslation();
  
  const [odLimit, setOdLimit] = useState('10,00,000');
  const [interestRate, setInterestRate] = useState('10.5');
  const [utilizedAmount, setUtilizedAmount] = useState('5,00,000');
  const [daysUtilized, setDaysUtilized] = useState('30');
  
  const [totalInterest, setTotalInterest] = useState(0);

  useEffect(() => {
    AnalyticsService.trackScreen('Overdraft_Calculator');
  }, []);

  useEffect(() => {
    calculateOverdraft();
  }, [odLimit, interestRate, utilizedAmount, daysUtilized]);

  const calculateOverdraft = () => {
    const limit = parseFormattedNumber(odLimit);
    const rate = parseFloat(interestRate) || 0;
    const utilized = parseFormattedNumber(utilizedAmount);
    const days = parseInt(daysUtilized) || 0;

    // Daily interest formula: (Principal * Rate * Days) / (365 * 100)
    const activePrincipal = Math.min(utilized, limit); // Calculate only up to limit if excess exists
    const interest = (activePrincipal * rate * days) / (365 * 100);
    
    // Additional penalty interest for over-utilization could be added here
    const excess = Math.max(0, utilized - limit);
    const penaltyInterest = excess > 0 ? (excess * (rate + 2) * days) / (365 * 100) : 0; // Assuming 2% penalty
    
    setTotalInterest(interest + penaltyInterest);
  };

  const limitNum = parseFormattedNumber(odLimit);
  const utilizedNum = parseFormattedNumber(utilizedAmount);
  const remainingNum = Math.max(0, limitNum - utilizedNum);
  const utilizationPercent = limitNum > 0 ? (utilizedNum / limitNum) * 100 : 0;
  const isOverLimit = utilizedNum > limitNum;

  const exportToPDF = () => {
    const rate = parseFloat(interestRate);
    const days = parseInt(daysUtilized);

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Overdraft Loan Report', 14, 22);

    doc.setFontSize(12);
    doc.text(`Overdraft Limit: ${formatINR(limitNum)}`, 14, 32);
    doc.text(`Interest Rate: ${rate}% p.a.`, 14, 40);
    doc.text(`Utilized Amount: ${formatINR(utilizedNum)}`, 14, 48);
    doc.text(`Days Utilized: ${days} days`, 14, 56);
    
    doc.setFontSize(14);
    doc.text(`Total Interest Payable: ${formatINR(totalInterest)}`, 14, 70);
    doc.text(`Total Amount Payable: ${formatINR(utilizedNum + totalInterest)}`, 14, 78);

    doc.save(`FinCalix_Overdraft_${new Date().toISOString().slice(0, 10)}.pdf`);
    AnalyticsService.trackFileDownload('pdf', 'overdraft_calculator');
  };

  const exportToExcel = () => {
    const rate = parseFloat(interestRate);
    const days = parseInt(daysUtilized);

    const headers = ['Detail', 'Value'];
    const data = [
      ['Overdraft Limit', limitNum],
      ['Interest Rate (%)', rate],
      ['Utilized Amount', utilizedNum],
      ['Days Utilized', days],
      ['Utilization (%)', utilizationPercent.toFixed(2) + '%'],
      ['Total Interest Payable', totalInterest],
      ['Total Amount Payable', utilizedNum + totalInterest],
    ];

    utilsExportToExcel(headers, data, `FinCalix_Overdraft_${new Date().toISOString().slice(0, 10)}`);
    AnalyticsService.trackFileDownload('excel', 'overdraft_calculator');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Overdraft Loan Calculation',
          text: `Overdraft Limit: ${odLimit}\nUtilized: ${utilizedAmount}\nInterest Payable: ${formatINR(totalInterest)}\nCalculate yours on FinCalix!`,
          url: window.location.href,
        });
        AnalyticsService.trackCalculatorUsed('overdraft', { action: 'share' });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const donutData = {
    labels: ['Utilized Amount', 'Available Limit'],
    datasets: [
      {
        data: [
          Math.min(utilizedNum, limitNum),
          remainingNum
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.85)', // Red for utilized
          'rgba(34, 197, 94, 0.85)', // Green for available
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(34, 197, 94, 1)',
        ],
        borderWidth: 2,
        hoverOffset: 4
      },
      // Inner ring for over-limit visualization
      isOverLimit ? {
        data: [utilizedNum - limitNum, limitNum],
        backgroundColor: [
          'rgba(153, 27, 27, 0.9)', // Dark red for excess
          'transparent', 
        ],
        borderColor: [
          'rgba(153, 27, 27, 1)',
          'transparent',
        ],
        borderWidth: 2,
        hoverOffset: 4
      } : { data: [], backgroundColor: [] } as any
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-20 pb-24 lg:pt-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-foreground flex items-center gap-3">
            <div className="bg-red-50 dark:bg-red-500/10 p-2.5 rounded-xl border border-red-100 dark:border-red-500/20">
              <Wallet className="w-8 h-8 text-red-600 dark:text-red-500" />
            </div>
            {t('calculators.overdraft.name', 'Overdraft Calculator')}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm lg:text-base">
            Accurately track your overdraft utilization, daily interest accrual, and remaining available limit.
          </p>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <button onClick={exportToPDF} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-accent text-slate-700 dark:text-foreground rounded-xl transition-all shadow-sm font-medium text-sm">
            <FileText size={16} /> <span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={exportToExcel} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-card border border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-accent text-slate-700 dark:text-foreground rounded-xl transition-all shadow-sm font-medium text-sm">
            <Download size={16} /> <span className="hidden sm:inline">Excel</span>
          </button>
          <button onClick={handleShare} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-green hover:bg-emerald-600 text-white rounded-xl transition-all shadow-sm shadow-brand-green/20 font-medium text-sm">
            <Share2 size={16} /> <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-border">
            <h2 className="text-lg font-bold text-slate-900 dark:text-foreground mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-brand-blue" />
              OD Parameters
            </h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Total OD Limit
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                  <input
                    type="text"
                    value={odLimit}
                    onChange={(e) => setOdLimit(formatNumberExt(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-background border border-slate-200 dark:border-border rounded-xl focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all text-slate-900 dark:text-foreground font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                  <span>Interest Rate</span>
                  <span className="text-muted-foreground font-normal">% p.a.</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    step="0.1"
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-background border border-slate-200 dark:border-border rounded-xl focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all text-slate-900 dark:text-foreground font-semibold text-left"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between">
                  <span>Utilized Amount</span>
                  <span className="text-brand-red font-medium">Out of Limit</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                  <input
                    type="text"
                    value={utilizedAmount}
                    onChange={(e) => setUtilizedAmount(formatNumberExt(e.target.value))}
                    className={`w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-background border ${isOverLimit ? 'border-red-500 focus:ring-red-500/50 focus:border-red-500' : 'border-slate-200 dark:border-border focus:ring-brand-red/50 focus:border-brand-red'} rounded-xl focus:ring-2 transition-all text-slate-900 dark:text-foreground font-semibold`}
                  />
                </div>
                {isOverLimit && (
                  <div className="flex items-start gap-1.5 mt-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-red-500 text-xs font-medium">Utilized amount exceeds OD limit. Penalty interest may apply.</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Days Utilized
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={daysUtilized}
                    onChange={(e) => setDaysUtilized(e.target.value)}
                    className="w-full pl-4 pr-16 py-3 bg-slate-50 dark:bg-background border border-slate-200 dark:border-border rounded-xl focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-all text-slate-900 dark:text-foreground font-semibold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Days</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-brand-blue/5 dark:bg-brand-blue/10 p-5 rounded-2xl border border-brand-blue/10 dark:border-brand-blue/20">
            <h3 className="text-sm font-semibold text-brand-blue flex items-center gap-2 mb-2">
              <Info className="w-4 h-4" /> Formulas & Logic
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
              Overdraft interest is calculated precisely on a daily compounding basis using the formula:
            </p>
            <div className="px-3 py-2 bg-white/50 dark:bg-background/50 rounded-lg border border-brand-blue/10 font-mono text-[10px] text-slate-700 dark:text-slate-300 text-center mb-2">
              Interest = (Principal × Rate × Days) / (365 × 100)
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You only pay interest for the exact amount utilized over the exact number of days.
            </p>
          </div>
        </div>

        {/* Right Column: Visualization & Results */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
            <div className="bg-white dark:bg-card p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 lg:mb-2">Total Limit</p>
              <p className="text-lg lg:text-xl font-bold text-slate-900 dark:text-foreground truncate">{formatINR(limitNum)}</p>
            </div>
            <div className="bg-white dark:bg-card p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 lg:mb-2">Utilized</p>
              <p className="text-lg lg:text-xl font-bold text-brand-red truncate">{formatINR(utilizedNum)}</p>
            </div>
            <div className="bg-white dark:bg-card p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 lg:mb-2">Interest Accrued</p>
              <p className="text-lg lg:text-xl font-bold text-amber-500 truncate">{formatINR(totalInterest)}</p>
            </div>
            <div className="bg-white dark:bg-card p-4 lg:p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1 lg:mb-2">Remaining Limit</p>
              <p className={`text-lg lg:text-xl font-bold truncate ${isOverLimit ? 'text-red-500' : 'text-brand-green'}`}>
                {isOverLimit ? formatINR(0) : formatINR(remainingNum)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="bg-white dark:bg-card p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-border flex flex-col">
              <h3 className="text-lg font-bold text-slate-900 dark:text-foreground mb-6 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-brand-green" /> Limit Utilization
              </h3>
              <div className="relative flex-1 min-h-[220px] flex items-center justify-center">
                <Doughnut 
                  data={donutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { 
                        position: 'bottom',
                        labels: { color: document.documentElement.classList.contains('dark') ? '#e2e8f0' : '#475569', padding: 20, usePointStyle: true }
                      },
                      tooltip: {
                        backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        titleColor: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#0f172a',
                        bodyColor: document.documentElement.classList.contains('dark') ? '#cbd5e1' : '#334155',
                        borderColor: document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                          label: function(context) {
                            return ` ${context.label}: ${formatINR(context.parsed)}`;
                          }
                        }
                      }
                    },
                    cutout: '65%',
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-20px]">
                  <span className="text-3xl font-bold text-slate-900 dark:text-foreground">{utilizationPercent.toFixed(1)}%</span>
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider mt-1">Utilized</span>
                </div>
              </div>
            </div>

            {/* Summary Box */}
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-6 rounded-3xl shadow-lg border border-indigo-400/30 text-white flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 -tralate-y-1/4 translate-x-1/4 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-40 h-40 bg-indigo-900/40 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4 text-indigo-100 uppercase tracking-wider text-xs font-bold">
                  <Calculator className="w-4 h-4" /> Assessment Summary
                </div>
                
                <h3 className="text-3xl lg:text-4xl font-black mb-2 tracking-tight">
                  {formatINR(utilizedNum + totalInterest)}
                </h3>
                <p className="text-sm text-indigo-100 font-medium mb-8">
                  Total Payable Amount (Principal + Interest)
                </p>

                <div className="space-y-4 pt-6 border-t border-indigo-400/30">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-indigo-100">Principal Utilized</span>
                    <span>{formatINR(utilizedNum)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-indigo-100">Total Interest</span>
                    <span className="text-amber-300 font-bold">+{formatINR(totalInterest)}</span>
                  </div>
                  {isOverLimit && (
                    <div className="flex justify-between items-center text-sm font-bold pt-2 mt-2 border-t border-indigo-400/30">
                      <span className="text-red-300">Over-limit Amount</span>
                      <span className="text-red-300">{formatINR(utilizedNum - limitNum)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <FinancialQuote />
        <DisclaimerComponent module="overdraft" />
      </div>
    </div>
  );
}
