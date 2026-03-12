import React, { useState, useEffect, useRef } from 'react';
import { Share2, FileText, Download, Calculator, Info, Wallet, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  formatINR
} from '../utils/calculations';

// Simple function to extract number from formatted string
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
import autoTable from 'jspdf-autotable';
import * as xlsx from 'xlsx';
import DisclaimerComponent from '../components/DisclaimerComponent';
import FinancialQuote from '../components/FinancialQuote';
import { exportToPDF as utilsExportToPDF, exportToExcel as utilsExportToExcel } from '../utils/exportUtils';

ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title
);

export default function OverdraftCalculator() {
  const { t } = useTranslation();
  
  // State variables
  const [odLimit, setOdLimit] = useState('10,00,000');
  const [interestRate, setInterestRate] = useState('10.5');
  const [utilizedAmount, setUtilizedAmount] = useState('5,00,000');
  const [daysUtilized, setDaysUtilized] = useState('30');
  
  const [totalInterest, setTotalInterest] = useState(0);

  // References
  const resultRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    calculateOverdraft();
  }, [odLimit, interestRate, utilizedAmount, daysUtilized]);

  const calculateOverdraft = () => {
    const limit = parseFormattedNumber(odLimit);
    const rate = parseFloat(interestRate) || 0;
    const utilized = parseFormattedNumber(utilizedAmount);
    const days = parseInt(daysUtilized) || 0;

    if (utilized > limit) {
      // In reality, utilized shouldn't be more than limit without penalties, 
      // but for simple calculation we allow or cap it.
    }

    // Daily interest formula: (Principal * Rate * Days) / (365 * 100)
    const interest = (utilized * rate * days) / (365 * 100);
    setTotalInterest(interest);
  };

  const calculateTotalCalculations = () => {
    // Generate an array of day-by-day or summary if needed
    return [];
  };

  const exportToPDF = () => {
    const limit = parseFormattedNumber(odLimit);
    const utilized = parseFormattedNumber(utilizedAmount);
    const rate = parseFloat(interestRate);
    const days = parseInt(daysUtilized);

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Overdraft Loan Report', 14, 22);

    doc.setFontSize(12);
    doc.text(`Overdraft Limit: ${formatINR(limit)}`, 14, 32);
    doc.text(`Interest Rate: ${rate}% p.a.`, 14, 40);
    doc.text(`Utilized Amount: ${formatINR(utilized)}`, 14, 48);
    doc.text(`Days Utilized: ${days} days`, 14, 56);
    
    doc.setFontSize(14);
    doc.text(`Total Interest Payable: ${formatINR(totalInterest)}`, 14, 70);
    doc.text(`Total Amount Payable: ${formatINR(utilized + totalInterest)}`, 14, 78);

    doc.save('overdraft-report.pdf');
  };

  const exportToExcel = () => {
    const limit = parseFormattedNumber(odLimit);
    const utilized = parseFormattedNumber(utilizedAmount);
    const rate = parseFloat(interestRate);
    const days = parseInt(daysUtilized);

    const headers = ['Detail', 'Value'];
    const data = [
      ['Overdraft Limit', limit],
      ['Interest Rate (%)', rate],
      ['Utilized Amount', utilized],
      ['Days Utilized', days],
      ['Total Interest Payable', totalInterest],
      ['Total Amount Payable', utilized + totalInterest],
    ];

    utilsExportToExcel(headers, data, 'overdraft-report');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Overdraft Loan Calculation',
          text: `Overdraft Limit: ${odLimit}\nUtilized: ${utilizedAmount}\nInterest Payable: ${formatINR(totalInterest)}`,
          url: window.location.href,
        });
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
          parseFormattedNumber(utilizedAmount),
          Math.max(0, parseFormattedNumber(odLimit) - parseFormattedNumber(utilizedAmount))
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)', // Red for utilized
          'rgba(34, 197, 94, 0.8)', // Green for available
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(34, 197, 94, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
              <Wallet className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            Overdraft Loan Calculator
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Calculate interest on your overdraft limit based on utilization
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-500" />
              Overdraft Details
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Overdraft Limit (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">
                    ₹
                  </span>
                  <input
                    type="text"
                    value={odLimit}
                    onChange={(e) => setOdLimit(formatNumberExt(e.target.value.replace(/[^0-9]/g, '')))}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Interest Rate (% p.a.)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    step="0.1"
                    className="w-full pl-4 pr-8 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Utilized Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">
                    ₹
                  </span>
                  <input
                    type="text"
                    value={utilizedAmount}
                    onChange={(e) => setUtilizedAmount(formatNumberExt(e.target.value.replace(/[^0-9]/g, '')))}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium"
                  />
                </div>
                {parseFormattedNumber(utilizedAmount) > parseFormattedNumber(odLimit) && (
                  <p className="text-red-500 text-xs mt-1">Utilized amount exceeds OD limit.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Days Utilized
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={daysUtilized}
                    onChange={(e) => setDaysUtilized(e.target.value)}
                    className="w-full pl-4 pr-16 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-900 dark:text-white font-medium"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-medium">
                    Days
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Info card */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-2 mb-3">
              <Info className="w-4 h-4" />
              How Overdraft Interest Works
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
              Interest on an overdraft account is calculated daily on the outstanding debit balance and usually debited at the end of the month. You only pay interest on the amount you use, for the time you use it.
            </p>
          </div>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" ref={resultRef}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Total Utilized</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatINR(parseFormattedNumber(utilizedAmount))}
              </p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Total Interest</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatINR(totalInterest)}
              </p>
            </div>
            
            <div className="bg-blue-600 p-6 rounded-2xl shadow-sm text-white">
              <p className="text-blue-100 text-sm mb-2">Total Amount Payable</p>
              <p className="text-2xl font-bold">
                {formatINR(parseFormattedNumber(utilizedAmount) + totalInterest)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700" ref={chartRef}>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Limit Utilization</h3>
              <div className="relative h-64 flex items-center justify-center">
                <Doughnut 
                  data={donutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom' },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            let label = context.label || '';
                            if (label) {
                              label += ': ';
                            }
                            if (context.parsed !== null) {
                              label += formatINR(context.parsed);
                            }
                            return label;
                          }
                        }
                      }
                    },
                    cutout: '70%',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <FinancialQuote />
      <DisclaimerComponent />
    </div>
  );
}
