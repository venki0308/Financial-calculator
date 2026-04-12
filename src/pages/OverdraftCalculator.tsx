import { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Wallet, ChevronDown, ChevronUp, Building2, User, Landmark, Lightbulb, Scale, ArrowLeft, Save, Check, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { formatINR } from '../utils/calculations';
import { exportToPDF as exportReportPDF, exportToExcel as exportReportExcel, dateTag, type ExportConfig } from '../utils/exportReport';
import { AnalyticsService } from '../lib/analytics';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import DateInput from '../components/DateInput';
import { useAppColors } from '../theme/useAppColors';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { useLiveStatusStore } from '../store/useLiveStatusStore';
import SnapshotPreviewCard from '../components/SnapshotPreviewCard';
import SaveNameDialog from '../components/SaveNameDialog';
import { saveLoan as saveLoanToStorage, generateLoanId, type SavedLoan } from '../utils/loanStorage';
import { todayStr } from '../utils/dateUtils';
import { useHistoryTracker } from '../hooks/useHistoryTracker';
import { useCibil } from '../context/CibilContext';
import CibilAdvisoryCard from '../components/CibilAdvisoryCard';
import CibilBadge from '../components/CibilBadge';

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
  const c = useAppColors();
  const { addSaved, removeSaved } = useCalculatorStore();
  const { profile: cibilProfile } = useCibil();
  const cibilScore = cibilProfile?.isNTC ? 0 : (cibilProfile?.score ?? 0);
  const addProfile = useLiveStatusStore(s => s.addProfile);
  const removeProfile = useLiveStatusStore(s => s.removeProfile);
  const [saved, setSaved] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [loanSaved, setLoanSaved] = useState(false);
  const [savedLoanId, setSavedLoanId] = useState<string | null>(null);
  const [showNameDialog, setShowNameDialog] = useState(false);

  const handleSaveToMyLoans = (customName: string) => {
    const id = generateLoanId();
    const nick = customName;
    setSavedLoanId(id);

    // Save the rich snapshot to live profile store first so MyLoans uses
    // the dedicated Overdraft handler in computeMetrics() — that handler
    // shows utilized / interest / total payable correctly. Without this,
    // the loanStorage row was being mapped to a Business/Personal Loan
    // and run through the EMI engine, which produced wrong metrics for
    // a non-amortising credit line.
    addProfile({
      id,
      name: nick,
      calculatorType: 'Overdraft',
      profileData: {
        utilized: utilizedNum,
        loanAmount: utilizedNum,
        limit: limitNum,
        rate: rateNum,
        days: daysNum,
        totalInterest: Math.round(totalInterest),
        totalPayable: Math.round(totalPayableAmount),
        odType,
        startDate: startDate || todayStr(),
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Also keep the loanStorage copy so it appears in the loan portfolio
    // summary at the top of MyLoans (total outstanding, monthly burden).
    const loan: SavedLoan = {
      id,
      nickName: nick,
      loanType: odType === 'business' ? 'business_loan' : 'personal_loan',
      lenderName: '',
      loanAmount: utilizedNum,
      interestRate: rateNum,
      tenureMonths: Math.max(1, Math.round(daysNum / 30)),
      emiAmount: Math.round(totalInterest / Math.max(1, Math.round(daysNum / 30))),
      rateType: 'floating',
      disbursementDate: startDate || todayStr(),
      emiDueDay: 1,
      notes: `OD Limit: ${formatINR(limitNum)} | Utilized: ${formatINR(utilizedNum)} | ${daysNum} days`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };
    saveLoanToStorage(loan);
    setLoanSaved(true);
  };

  const [odType, setOdType] = useState('business');
  const [odLimit, setOdLimit] = useState('10,00,000');
  const [interestRate, setInterestRate] = useState('10.5');
  const [utilizedAmount, setUtilizedAmount] = useState('5,00,000');

  const [durationMode, setDurationMode] = useState<'days'|'dates'>('days');
  const [daysUtilized, setDaysUtilized] = useState('30');
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState('');

  const [processingFee, setProcessingFee] = useState('');
  const [annualCharge, setAnnualCharge] = useState('');

  // ── Flexi/Dropline OD fields ──────────────────────────────
  const [isFlexiOD, setIsFlexiOD] = useState(false);
  const [tenureMonths, setTenureMonths] = useState('84');
  const [amcPct, setAmcPct] = useState('');          // AMC as % of limit (e.g. 0.295)
  const [flexiFacilityCharge, setFlexiFacilityCharge] = useState('');
  const [insurancePremium, setInsurancePremium] = useState('');
  const [stampDuty, setStampDuty] = useState('');

  const [showSchedule, setShowSchedule] = useState(false);
  const [showPreclosure, setShowPreclosure] = useState(false);

  const [excessPenaltyRate, setExcessPenaltyRate] = useState('2'); // additional % charged on excess utilization
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
  const tenureNum = parseInt(tenureMonths) || 0;
  const amcPctNum = parseFloat(amcPct) || 0;
  const flexiChargeNum = parseFormattedNumber(flexiFacilityCharge) || 0;
  const insuranceNum = parseFormattedNumber(insurancePremium) || 0;
  const stampDutyNum = parseFormattedNumber(stampDuty) || 0;

  // ── Flexi/Dropline: current dropline limit reduces monthly ──
  const elapsedMonths = useMemo(() => {
    if (!isFlexiOD || tenureNum <= 0) return 0;
    const s = new Date(startDate);
    const now = new Date();
    const months = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
    return Math.max(0, Math.min(months, tenureNum));
  }, [isFlexiOD, tenureNum, startDate]);

  const droplineLimit = useMemo(() => {
    if (!isFlexiOD || tenureNum <= 0) return limitNum;
    // Linear dropline: limit reduces equally each month
    const monthlyDrop = limitNum / tenureNum;
    return Math.max(0, Math.round(limitNum - monthlyDrop * elapsedMonths));
  }, [isFlexiOD, limitNum, tenureNum, elapsedMonths]);

  const activeLimit = isFlexiOD ? droplineLimit : limitNum;
  const isOverLimit = utilizedNum > activeLimit;

  // ── Monthly interest-only EMI (Flexi OD: you only pay interest) ──
  const monthlyInterestEMI = (utilizedNum * rateNum) / (12 * 100);

  // Base daily formula
  const activePrincipal = isOverLimit ? activeLimit : utilizedNum;
  const dailyInterest = (activePrincipal * rateNum) / (365 * 100);
  const standardInterest = dailyInterest * daysNum;

  // Penalty for excess
  const excess = isOverLimit ? utilizedNum - activeLimit : 0;
  const excessPenaltyRateNum = parseFloat(excessPenaltyRate) || 2;
  const penaltyInterest = excess > 0 ? (excess * (rateNum + excessPenaltyRateNum) * daysNum) / (365 * 100) : 0;

  const totalInterest = standardInterest + penaltyInterest;
  const processingFeeAmount = (limitNum * feePct) / 100;
  // AMC: if % is set, compute from limit; otherwise use flat amount
  const amcAmount = amcPctNum > 0 ? Math.round(limitNum * amcPctNum / 100) : amcNum;
  // Upfront costs (Flexi OD specific)
  const upfrontCosts = processingFeeAmount + flexiChargeNum + insuranceNum + stampDutyNum;
  const totalFees = upfrontCosts + amcAmount;
  const totalPayableAmount = utilizedNum + totalInterest + totalFees;

  // Stats
  const availableLimit = Math.max(0, activeLimit - utilizedNum);
  const effectiveCost = utilizedNum > 0 && daysNum > 0
    ? ((totalInterest + totalFees) / utilizedNum) * (365 / daysNum) * 100
    : 0;

  // Flexi: remaining months and future interest
  const remainingMonths = isFlexiOD ? Math.max(0, tenureNum - elapsedMonths) : 0;
  const futureInterest = isFlexiOD ? monthlyInterestEMI * remainingMonths : 0;

  // Gauge
  const utilPct = activeLimit > 0 ? (utilizedNum / activeLimit) * 100 : 0;
  let gaugeColor = 'bg-brand-green';
  let gaugeText = t('od.gaugeGreen');
  if (utilPct > 50 && utilPct <= 75) { gaugeColor = 'bg-amber-500'; gaugeText = t('od.gaugeAmber'); }
  else if (utilPct > 75 && utilPct <= 90) { gaugeColor = 'bg-orange-500'; gaugeText = t('od.gaugeOrange'); }
  else if (utilPct > 90) { gaugeColor = 'bg-red-500'; gaugeText = t('od.gaugeRed'); }

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
        if (isOverLimit) intOfDay += (excess * (rateNum + excessPenaltyRateNum) / (365*100));

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

  // Track in Recently Used (must be at top level — NOT inside buildExportConfig)
  useHistoryTracker('Overdraft Calculator', { utilizedAmount, interestRate, daysUtilized }, { totalPayable: totalPayableAmount }, totalInterest);

  const buildExportConfig = (forExcel: boolean): ExportConfig => {
    const tag = dateTag();
    const f = (v: number) => forExcel ? Math.round(v) : formatINR(v);
    const odTypeLabel = odType === 'business' ? t('od.typeBusiness', 'Business OD') : odType === 'personal' ? t('od.typePersonal', 'Personal OD') : odType === 'salary' ? t('od.typeSalary', 'Salary OD') : t('od.typeFD', 'Against FD/Property');

    const scheduleRows: Array<Array<string | number>> = [];
    const maxDays = Math.min(daysNum, 365);
    for (let i = 1; i <= maxDays; i++) {
      let intOfDay = dailyInterest;
      if (isOverLimit) intOfDay += (excess * (rateNum + parseFloat(excessPenaltyRate) || 2) / (365 * 100));
      scheduleRows.push([
        `Day ${i}`,
        forExcel ? Math.round(utilizedNum) : formatINR(utilizedNum),
        forExcel ? Math.round(intOfDay) : formatINR(intOfDay),
        forExcel ? Math.round(intOfDay * i) : formatINR(intOfDay * i),
      ]);
    }

    return {
      title: 'Overdraft Assessment Report',
      subtitle: `${odTypeLabel} — ${daysNum} days utilization`,
      inputs: [
        { label: 'OD Type', value: odTypeLabel },
        { label: 'Sanctioned Limit', value: formatINR(limitNum) },
        { label: 'Utilized Amount', value: formatINR(utilizedNum) },
        { label: 'Interest Rate', value: `${rateNum}% p.a.` },
        { label: 'Duration', value: `${daysNum} days` },
        { label: 'Utilization', value: `${utilPct.toFixed(1)}%` },
      ],
      results: [
        { label: 'Principal (Utilized)', value: f(utilizedNum) as string },
        { label: 'Total Interest', value: f(totalInterest) as string },
        { label: 'Total Fees', value: f(totalFees) as string },
        { label: 'Total Payable', value: f(totalPayableAmount) as string },
        { label: 'Effective Cost (EAC)', value: `${effectiveCost.toFixed(2)}% p.a.` },
        { label: 'Daily Interest', value: f(dailyInterest) as string },
      ],
      chart: {
        type: 'pie',
        segments: [
          { label: 'Principal', value: utilizedNum, color: '#3B82F6' },
          { label: 'Interest', value: totalInterest, color: '#F59E0B' },
          { label: 'Fees', value: totalFees, color: '#EF4444' },
        ],
      },
      projectionTitle: 'Daily Interest Schedule',
      projectionColumns: ['Day', 'Balance', 'Daily Interest', 'Cumulative Interest'],
      projectionRows: scheduleRows,
      additionalTables: [
        {
          title: 'Pre-closure Analysis',
          columns: ['Detail', 'Value'],
          rows: [
            ['Months to Expiry', `${mos} months`],
            ['Pre-closure Penalty', `${penaltyPct}%`],
            ['Penalty Amount', forExcel ? Math.round(preclosureCharges) : formatINR(preclosureCharges)],
            ['Outstanding Principal', forExcel ? Math.round(utilizedNum) : formatINR(utilizedNum)],
            ['Accrued Interest', forExcel ? Math.round(totalInterest) : formatINR(totalInterest)],
            ['Total to Close', forExcel ? Math.round(totalToClose) : formatINR(totalToClose)],
          ],
        },
        {
          title: 'OD vs Personal Loan Comparison',
          columns: ['Feature', 'Overdraft (OD)', 'Personal Loan (PL)'],
          rows: [
            ['Interest Calc', 'Daily on utilized amount', 'Reducing/Flat on disbursed amount'],
            ['Flexibility', 'High — borrow/repay anytime', 'Low — fixed EMIs'],
            ['Pre-closure', 'Usually NIL or very low', 'High (2-5%)'],
            ['Best For', 'Short-term working capital', 'Lump-sum long-term expense'],
          ],
        },
      ],
      filename: `FinCalix_Overdraft_${tag}`,
    };
  };

  const handleDownloadPDF = async () => {
    await exportReportPDF(buildExportConfig(false));
    AnalyticsService.trackFileDownload('pdf', 'overdraft_calculator');
  };

  const handleDownloadExcel = async () => {
    await exportReportExcel(buildExportConfig(true));
    AnalyticsService.trackFileDownload('excel', 'overdraft_calculator');
  };

  const handleSave = () => {
    const newId = `OD-Save-${Date.now()}`;
    addSaved({
      id: newId,
      calculatorType: 'Overdraft Calculator',
      inputValues: { odType, limitNum, utilizedNum, rateNum, daysNum },
      resultValues: { totalInterest, totalPayableAmount, effectiveCost },
      timestamp: Date.now(),
    });
    setLastSavedId(newId);
    setSaved(true);
  };

  const handleRemove = () => {
    if (lastSavedId) {
      removeSaved(lastSavedId);
      setLastSavedId(null);
      setSaved(false);
    }
  };

  // Clean up BOTH the live profile and the loanStorage row when the user
  // un-saves an Overdraft from My Loans. Previously these two stores could
  // drift — deleting from one left an orphan in the other and the
  // portfolio aggregate showed phantom outstanding amounts.
  const handleRemoveFromMyLoans = () => {
    if (savedLoanId) {
      removeProfile(savedLoanId);
      // Lazy-load loanStorage to avoid a circular import on first paint.
      import('../utils/loanStorage').then(({ deleteLoan }) => {
        try { deleteLoan(savedLoanId); } catch { /* ignore */ }
      }).catch(() => { /* ignore */ });
      setSavedLoanId(null);
      setLoanSaved(false);
    }
  };

  const odTypes = [
    { id: 'business', icon: Building2, labelKey: 'od.typeBusiness' },
    { id: 'personal', icon: User, labelKey: 'od.typePersonal' },
    { id: 'salary', icon: Wallet, labelKey: 'od.typeSalary' },
    { id: 'fd', icon: Landmark, labelKey: 'od.typeFD' },
    { id: 'flexi', icon: Scale, labelKey: 'od.typeFlexi' },
  ];

  // Auto-enable Flexi mode when flexi type is selected
  useEffect(() => {
    setIsFlexiOD(odType === 'flexi');
  }, [odType]);

  return (
    <div className="min-h-screen pb-safe-nav" style={{ backgroundColor: c.bg, color: c.text }}>

      {/* Sticky Header */}
      <div className="sticky top-0 z-40 px-4 py-3 flex items-center gap-3 backdrop-blur-md shadow-sm border-b"
           style={{ backgroundColor: `${c.card}E6`, borderColor: c.border }}>
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full transition-colors"
                  style={{ color: c.textSecondary }}>
              <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
              <h1 className="text-lg font-bold" style={{ color: c.text }}>{t('od.title')}</h1>
              <p className="text-xs" style={{ color: c.textSecondary }}>{t('od.subtitle')}</p>
          </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 pb-24 animate-fade-in">

      {/* Export Buttons */}
      <div className="flex gap-2 w-full mb-6">
          <button onClick={handleDownloadPDF}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl shadow-sm text-sm font-bold transition-all border"
            style={{ backgroundColor: c.card, borderColor: c.border, color: c.text }}>
            <FileText size={16} /> PDF
          </button>
          <button onClick={handleDownloadExcel}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl shadow-sm text-sm font-bold transition-all border"
            style={{ backgroundColor: c.card, borderColor: c.border, color: c.text }}>
            <Download size={16} /> Excel
          </button>
      </div>

      {/* Save / Remove Button */}
      <div className="mb-6">
        {saved ? (
            <div className="flex gap-2">
                <div className="flex-1 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2" style={{ backgroundColor: '#10B98115', color: '#10B981', border: '1px solid #10B98130' }}>
                    <Check size={16} /> Saved
                </div>
                <button onClick={handleRemove} className="px-4 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2" style={{ backgroundColor: '#EF444415', color: '#EF4444', border: '1px solid #EF444430' }}>
                    <Trash2 size={16} />
                </button>
            </div>
        ) : (
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave}
                className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg">
                <Save size={16} /> Save Calculation
            </motion.button>
        )}
      </div>

      {/* SECTION 2: OD Type Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-2 pt-1">
        {odTypes.map(type => {
          const Icon = type.icon;
          const active = odType === type.id;
          return (
            <button key={type.id} onClick={() => setOdType(type.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border shadow-sm"
              style={active
                ? { backgroundColor: c.text, color: c.bg, borderColor: 'transparent' }
                : { backgroundColor: c.card, color: c.textSecondary, borderColor: c.border }
              }>
              <Icon size={16} style={{ color: active ? c.bg : c.textSecondary }} />
              {t(type.labelKey)}
            </button>
          );
        })}
      </div>

      {/* SECTION 3: Input Form */}
      <div className="rounded-2xl p-5 shadow-sm border mb-6 space-y-4"
           style={{ backgroundColor: c.card, borderColor: c.border }}>

        <div>
          <label className="block text-sm font-medium mb-1.5 flex justify-between"
                 style={{ color: c.textSecondary }}>
            {t('od.sanctionedLimit')}
            <span className="text-xs ml-2" style={{ color: c.textMuted }}>(₹)</span>
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold" style={{ color: c.textMuted }}>₹</span>
            <input type="text" value={odLimit} onChange={(e) => setOdLimit(formatNumberExt(e.target.value))}
              className="w-full pl-8 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue font-bold shadow-sm"
              style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5 flex justify-between"
                 style={{ color: c.textSecondary }}>
            {t('od.utilizedAmount')}
            {isOverLimit && <span className="text-red-500 font-bold text-xs ml-2">{t('od.exceedsLimit')}</span>}
          </label>
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-semibold ${isOverLimit ? 'text-red-500' : ''}`}
                  style={isOverLimit ? undefined : { color: c.textMuted }}>₹</span>
            <input type="text" value={utilizedAmount} onChange={(e) => setUtilizedAmount(formatNumberExt(e.target.value))}
              className={`w-full pl-8 pr-4 py-3 border rounded-xl focus:ring-2 font-bold shadow-sm ${
                  isOverLimit ? 'border-red-500 text-red-500 focus:ring-red-500/50' : ''
              }`}
              style={isOverLimit
                ? { backgroundColor: c.inputBg }
                : { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }
              } />
          </div>
          {isOverLimit && <p className="text-xs text-red-500 mt-1 font-medium">{t('od.exceedsWarning')}</p>}
        </div>

        <div>
           <label className="block text-sm font-medium mb-1.5 flex justify-between"
                  style={{ color: c.textSecondary }}>
            {t('od.annualInterestRate')}
            <span className="text-xs ml-2" style={{ color: c.textMuted }}>(%)</span>
          </label>
          <div className="relative">
            <input type="number" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)}
              className="w-full pl-4 pr-8 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue font-bold shadow-sm"
              style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold" style={{ color: c.textMuted }}>%</span>
          </div>
          <p className="text-xs mt-1.5" style={{ color: c.textMuted }}>
            {odType === 'business' && t('od.hintBusiness')}
            {odType === 'personal' && t('od.hintPersonal')}
            {odType === 'salary' && t('od.hintSalary')}
            {odType === 'fd' && t('od.hintFD')}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: c.textSecondary }}>{t('od.duration')}</label>
          <div className="grid grid-cols-2 gap-2 mb-3 p-1.5 rounded-xl border"
               style={{ backgroundColor: c.bg, borderColor: c.border }}>
            <button onClick={() => setDurationMode('days')}
              className="py-2 text-xs font-bold rounded-lg transition-all"
              style={durationMode === 'days'
                ? { backgroundColor: c.card, color: c.text, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }
                : { color: c.textSecondary }
              }>
              {t('od.daysInput')}
            </button>
            <button onClick={() => setDurationMode('dates')}
              className="py-2 text-xs font-bold rounded-lg transition-all"
              style={durationMode === 'dates'
                ? { backgroundColor: c.card, color: c.text, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }
                : { color: c.textSecondary }
              }>
              {t('od.dateRange')}
            </button>
          </div>
          {durationMode === 'days' ? (
             <div className="relative">
                <input type="number" value={daysUtilized} onChange={(e) => setDaysUtilized(e.target.value)}
                className="w-full pl-4 pr-16 py-3 border rounded-xl focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue font-bold shadow-sm"
                style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold" style={{ color: c.textMuted }}>{t('od.days')}</span>
            </div>
          ) : (
             <div className="grid grid-cols-2 gap-3">
                 <div>
                     <span className="text-[10px] uppercase font-bold tracking-wider block mb-1" style={{ color: c.textMuted }}>{t('od.startDate')}</span>
                     <DateInput value={startDate} onChange={setStartDate}
                        className="w-full px-3 py-3 rounded-xl border text-sm font-semibold shadow-sm" />
                 </div>
                 <div>
                     <span className="text-[10px] uppercase font-bold tracking-wider block mb-1" style={{ color: c.textMuted }}>{t('od.endDate')}</span>
                     <DateInput value={endDate} onChange={setEndDate}
                        className="w-full px-3 py-3 rounded-xl border text-sm font-semibold shadow-sm" />
                 </div>
             </div>
          )}
        </div>

        <div className="pt-2 border-t" style={{ borderColor: c.border }}>
            <label className="block text-sm font-bold mb-2" style={{ color: c.textSecondary }}>{t('od.optionalCharges')}</label>
            <div className="grid grid-cols-2 gap-3">
                 <div>
                     <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: c.textMuted }}>{t('od.processingFee')}</span>
                     <input type="number" step="0.1" value={processingFee} onChange={e=>setProcessingFee(e.target.value)} placeholder="0.0"
                        className="w-full px-3 py-2.5 rounded-xl border text-sm font-semibold shadow-sm"
                        style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
                 </div>
                 <div>
                     <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: c.textMuted }}>{t('od.annualCharge')}</span>
                     <input type="text" value={annualCharge} onChange={e=>setAnnualCharge(formatNumberExt(e.target.value))} placeholder="0"
                        className="w-full px-3 py-2.5 rounded-xl border text-sm font-semibold shadow-sm"
                        style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
                 </div>
                 <div className="col-span-2">
                     <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: c.textMuted }}>{t('od.excessPenalty')}</span>
                     <input type="number" step="0.5" value={excessPenaltyRate} onChange={e=>setExcessPenaltyRate(e.target.value)} placeholder="2"
                        className="w-full px-3 py-2.5 rounded-xl border text-sm font-semibold shadow-sm"
                        style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
                     <p className="text-[10px] mt-1" style={{ color: c.textMuted }}>
                       {t('od.excessPenaltyHint')}
                     </p>
                 </div>
             </div>
        </div>

        {/* ── Flexi / Dropline OD Inputs ── */}
        {isFlexiOD && (
          <div className="pt-3 border-t space-y-3" style={{ borderColor: c.border }}>
            <label className="block text-sm font-bold mb-1" style={{ color: c.textSecondary }}>
              {t('od.flexiDetails', 'Flexi / Dropline Details')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: c.textMuted }}>
                  {t('od.tenure', 'Tenure (Months)')}
                </span>
                <input type="number" value={tenureMonths} onChange={e => setTenureMonths(e.target.value)} placeholder="84"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm font-semibold shadow-sm"
                  style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: c.textMuted }}>
                  {t('od.amcPct', 'AMC Rate (%)')}
                </span>
                <input type="number" step="0.01" value={amcPct} onChange={e => setAmcPct(e.target.value)} placeholder="0.295"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm font-semibold shadow-sm"
                  style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: c.textMuted }}>
                  {t('od.flexiCharge', 'Flexi Facility Charge')}
                </span>
                <input type="text" value={flexiFacilityCharge} onChange={e => setFlexiFacilityCharge(formatNumberExt(e.target.value))} placeholder="0"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm font-semibold shadow-sm"
                  style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: c.textMuted }}>
                  {t('od.insurance', 'Insurance Premium')}
                </span>
                <input type="text" value={insurancePremium} onChange={e => setInsurancePremium(formatNumberExt(e.target.value))} placeholder="0"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm font-semibold shadow-sm"
                  style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
              </div>
              <div className="col-span-2">
                <span className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: c.textMuted }}>
                  {t('od.stampDuty', 'Stamp Duty')}
                </span>
                <input type="text" value={stampDuty} onChange={e => setStampDuty(formatNumberExt(e.target.value))} placeholder="0"
                  className="w-full px-3 py-2.5 rounded-xl border text-sm font-semibold shadow-sm"
                  style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
              </div>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: c.textMuted }}>
              {t('od.flexiHint', 'In Flexi/Dropline OD, your sanctioned limit reduces monthly (dropline). You pay interest-only EMIs on the utilized amount. Principal is repaid via part payments.')}
            </p>
          </div>
        )}
      </div>

      {/* SECTION 4: Quick Stats Row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl p-4 flex flex-col justify-center border shadow-sm"
               style={{ backgroundColor: c.bg, borderColor: c.border }}>
              <span className="text-[10px] uppercase font-bold mb-1" style={{ color: c.textSecondary }}>
                {isFlexiOD ? t('od.droplineLimit', 'Dropline Limit') : t('od.sanctioned')}
              </span>
              <span className="text-base font-bold truncate" style={{ color: c.text }}>{formatINR(activeLimit)}</span>
              {isFlexiOD && droplineLimit < limitNum && (
                <span className="text-[9px] mt-0.5" style={{ color: c.textMuted }}>
                  {t('od.originalLimit', 'Original')}: {formatINR(limitNum)}
                </span>
              )}
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 flex flex-col justify-center border border-red-200 dark:border-transparent shadow-sm">
              <span className="text-[10px] uppercase font-bold text-red-700 dark:text-red-400 mb-1">{t('od.utilized')}</span>
              <span className="text-base font-bold text-red-800 dark:text-red-400 truncate">{formatINR(utilizedNum)}</span>
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 flex flex-col justify-center border border-amber-200 dark:border-transparent shadow-sm">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-500 mb-1">{t('od.interestAccrued')}</span>
              <span className="text-base font-bold text-amber-800 dark:text-amber-400 truncate">{formatINR(totalInterest)}</span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-4 flex flex-col justify-center border border-emerald-200 dark:border-transparent shadow-sm">
              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-500 mb-1">{t('od.availableLimit')}</span>
              <span className="text-base font-bold text-emerald-800 dark:text-emerald-400 truncate">{formatINR(availableLimit)}</span>
          </div>
      </div>

      {/* SECTION 4.5: Flexi OD — Monthly EMI & Tenure Info */}
      {isFlexiOD && utilizedNum > 0 && (
        <div className="rounded-2xl border p-5 mb-6 shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
          <h3 className="text-xs uppercase font-bold tracking-wider mb-4" style={{ color: c.textSecondary }}>
            {t('od.flexiSummary', 'Flexi OD Summary')}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold block mb-1" style={{ color: c.textMuted }}>
                {t('od.monthlyEMI', 'Monthly EMI (Interest Only)')}
              </span>
              <span className="text-xl font-black" style={{ color: '#3b82f6' }}>{formatINR(Math.round(monthlyInterestEMI))}</span>
              <span className="text-[9px] block mt-0.5" style={{ color: c.textMuted }}>
                {t('od.interestOnlyNote', 'Interest only — no principal reduction')}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold block mb-1" style={{ color: c.textMuted }}>
                {t('od.remainingTenure', 'Remaining Tenure')}
              </span>
              <span className="text-xl font-black" style={{ color: c.text }}>{remainingMonths} <span className="text-xs font-semibold" style={{ color: c.textMuted }}>{t('od.months', 'months')}</span></span>
              <span className="text-[9px] block mt-0.5" style={{ color: c.textMuted }}>
                {t('od.ofTotal', 'of {{total}} months', { total: tenureNum })}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold block mb-1" style={{ color: c.textMuted }}>
                {t('od.futureInterest', 'Future Interest (est.)')}
              </span>
              <span className="text-base font-bold text-amber-600 dark:text-amber-400">{formatINR(Math.round(futureInterest))}</span>
            </div>
            {amcAmount > 0 && (
              <div>
                <span className="text-[10px] uppercase font-bold block mb-1" style={{ color: c.textMuted }}>
                  {t('od.nextAMC', 'Annual AMC')}
                </span>
                <span className="text-base font-bold" style={{ color: c.text }}>{formatINR(amcAmount)}</span>
                {amcPctNum > 0 && <span className="text-[9px] block mt-0.5" style={{ color: c.textMuted }}>({amcPctNum}% {t('od.ofLimit', 'of limit')})</span>}
              </div>
            )}
          </div>

          {/* Upfront cost breakdown */}
          {upfrontCosts > 0 && (
            <div className="mt-4 pt-3 border-t" style={{ borderColor: c.border }}>
              <span className="text-[10px] uppercase font-bold block mb-2" style={{ color: c.textMuted }}>
                {t('od.upfrontCosts', 'Upfront Costs Deducted')}
              </span>
              <div className="space-y-1.5 text-xs">
                {processingFeeAmount > 0 && (
                  <div className="flex justify-between" style={{ color: c.textSecondary }}>
                    <span>{t('od.processingFee')}</span>
                    <span className="font-semibold" style={{ color: c.text }}>{formatINR(processingFeeAmount)}</span>
                  </div>
                )}
                {flexiChargeNum > 0 && (
                  <div className="flex justify-between" style={{ color: c.textSecondary }}>
                    <span>{t('od.flexiCharge', 'Flexi Facility Charge')}</span>
                    <span className="font-semibold" style={{ color: c.text }}>{formatINR(flexiChargeNum)}</span>
                  </div>
                )}
                {insuranceNum > 0 && (
                  <div className="flex justify-between" style={{ color: c.textSecondary }}>
                    <span>{t('od.insurance', 'Insurance Premium')}</span>
                    <span className="font-semibold" style={{ color: c.text }}>{formatINR(insuranceNum)}</span>
                  </div>
                )}
                {stampDutyNum > 0 && (
                  <div className="flex justify-between" style={{ color: c.textSecondary }}>
                    <span>{t('od.stampDuty', 'Stamp Duty')}</span>
                    <span className="font-semibold" style={{ color: c.text }}>{formatINR(stampDutyNum)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t font-bold" style={{ borderColor: c.border, color: c.text }}>
                  <span>{t('od.totalUpfront', 'Total Upfront')}</span>
                  <span>{formatINR(upfrontCosts)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: Utilization Gauge */}
      <div className="p-5 rounded-2xl shadow-sm border mb-6"
           style={{ backgroundColor: c.card, borderColor: c.border }}>
          <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold" style={{ color: c.text }}>{t('od.limitUtilization')}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold text-white ${gaugeColor}`}>
                  {gaugeText}
              </span>
          </div>
          <div className="w-full rounded-full h-3 mb-2 overflow-hidden" style={{ backgroundColor: c.bg }}>
              <div className={`h-full ${gaugeColor} transition-all duration-700 ease-out`} style={{width: `${Math.min(utilPct, 100)}%`}}></div>
          </div>
          <div className="flex justify-between items-center text-xs font-semibold" style={{ color: c.textMuted }}>
              <span>0%</span>
              <span className="font-bold" style={{ color: c.text }}>{utilPct.toFixed(1)}% {t('od.utilized').toLowerCase()}</span>
              <span>100%</span>
          </div>
      </div>

      {/* SECTION 6: Assessment Summary */}
      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-6 rounded-2xl shadow-lg border border-indigo-400/30 text-white mb-6 relative overflow-hidden">
        <div className="relative z-10">
            <h3 className="text-xs uppercase font-bold text-indigo-100 tracking-widest mb-1">{t('od.assessmentSummary')}</h3>
            <p className="text-3xl font-black tracking-tight mb-5">{formatINR(totalPayableAmount)}</p>

            <div className="space-y-3 pt-4 border-t border-indigo-400/30">
                <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-indigo-100">{t('od.principal')}</span>
                <span>{formatINR(utilizedNum)}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-indigo-100">{t('od.totalInterest')}</span>
                <span className="text-amber-300 font-bold">+{formatINR(totalInterest)}</span>
                </div>
                {totalFees > 0 && (
                    <div className="flex justify-between items-center text-sm font-medium">
                    <span className="text-indigo-100">{t('od.totalFees')}</span>
                    <span className="text-amber-300 font-bold">+{formatINR(totalFees)}</span>
                    </div>
                )}
            </div>

            <div className="mt-5 pt-4 border-t border-indigo-400/30 grid grid-cols-2 gap-4">
                 <div>
                    <span className="block text-[10px] uppercase font-bold text-indigo-200 mb-1">{t('od.effectiveCost')}</span>
                    <span className="text-lg font-bold">{effectiveCost.toFixed(2)}% p.a.</span>
                 </div>
                 <div>
                    <span className="block text-[10px] uppercase font-bold text-indigo-200 mb-1">{t('od.dailyInterestCost')}</span>
                    <span className="text-lg font-bold">₹{(totalInterest/Math.max(1, daysNum)).toFixed(0)}/{t('od.day')}</span>
                 </div>
            </div>
        </div>
      </div>

      {/* SECTION 7: Daily Interest Schedule */}
      <div className="mb-4">
        <button onClick={() => setShowSchedule(!showSchedule)}
            className="w-full py-3.5 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
            style={{ backgroundColor: c.card, borderColor: c.border, color: c.text }}>
            {showSchedule ? t('od.hideSchedule') : t('od.viewSchedule')}
            {showSchedule ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showSchedule && (
            <div className="mt-2 border rounded-2xl p-4 overflow-hidden shadow-sm animate-fade-in"
                 style={{ backgroundColor: c.card, borderColor: c.border }}>
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b" style={{ color: c.textMuted, borderColor: c.border }}>
                            <th className="py-2 text-left font-bold">{t('od.scheduleDay')}</th>
                            <th className="py-2 text-right font-bold">{t('od.scheduleBalance')}</th>
                            <th className="py-2 text-right font-bold">{t('od.scheduleDayInterest')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {scheduleRows.map((r, idx) => {
                            if (r.isEllipsis) {
                                return (
                                  <tr key={`ellipsis-${idx}`} className="text-center font-bold border-b"
                                      style={{ color: c.textMuted, borderColor: `${c.border}80` }}>
                                      <td colSpan={3} className="py-2">. . .</td>
                                  </tr>
                                )
                            }
                            return (
                                <tr key={r.day} className="border-b last:border-0 transition-colors"
                                    style={{ borderColor: `${c.border}50` }}>
                                    <td className="py-2 font-medium" style={{ color: c.text }}>{t('od.scheduleDay')} {r.day}</td>
                                    <td className="py-2 text-right" style={{ color: c.textSecondary }}>{formatINR(r.balance)}</td>
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
            className="w-full py-3.5 rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
            style={{ backgroundColor: c.card, borderColor: c.border, color: c.text }}>
            {showPreclosure ? t('od.hidePreclosure') : t('od.calcPreclosure')}
            {showPreclosure ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showPreclosure && (
            <div className="mt-2 border rounded-2xl p-5 shadow-sm animate-fade-in space-y-4"
                 style={{ backgroundColor: c.card, borderColor: c.border }}>
                 <div>
                     <label className="block text-[10px] uppercase font-bold mb-1 mt-1" style={{ color: c.textMuted }}>{t('od.monthsRemaining')}</label>
                     <input type="number" value={monthsRemaining} onChange={e=>setMonthsRemaining(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border text-sm font-semibold shadow-sm"
                        style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
                 </div>
                 <div>
                     <label className="block text-[10px] uppercase font-bold mb-1" style={{ color: c.textMuted }}>{t('od.preclosurePenaltyPct')}</label>
                     <input type="number" step="0.5" value={preclosurePenalty} onChange={e=>setPreclosurePenalty(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border text-sm font-semibold shadow-sm"
                        style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }} />
                 </div>

                 <div className="p-4 rounded-xl mt-4" style={{ backgroundColor: c.bg }}>
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-semibold" style={{ color: c.textSecondary }}>{t('od.penaltyCharges')}</span>
                         <span className="text-sm font-bold text-red-500">{formatINR(preclosureCharges)}</span>
                     </div>
                     <div className="flex justify-between items-center border-t pt-2" style={{ borderColor: c.border }}>
                         <span className="text-sm font-black" style={{ color: c.text }}>{t('od.totalToClose')}</span>
                         <span className="text-lg font-black" style={{ color: c.text }}>{formatINR(totalToClose)}</span>
                     </div>
                 </div>
            </div>
        )}
      </div>

      {/* SECTION 9: OD vs Personal Loan Comparison */}
      <div className="rounded-3xl p-6 mb-6" style={{ backgroundColor: c.bg }}>
          <h3 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2" style={{ color: c.text }}>
             <Scale className="w-5 h-5 text-brand-blue dark:text-indigo-400" /> {t('od.odVsPL')}
          </h3>

          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-brand-blue dark:text-indigo-300 font-bold uppercase tracking-wider mb-1">{t('od.compOD')}</div>
                  <div className="text-brand-blue dark:text-indigo-300 font-bold uppercase tracking-wider mb-1">{t('od.compPL')}</div>

                  <div className="p-3 rounded-lg border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                      <strong className="block mb-1" style={{ color: c.text }}>{t('od.interestCalc')}</strong>
                      <span style={{ color: c.textSecondary }}>{t('od.odInterestCalcDesc')}</span>
                  </div>
                  <div className="p-3 rounded-lg border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                      <strong className="block mb-1" style={{ color: c.text }}>{t('od.interestCalc')}</strong>
                      <span style={{ color: c.textSecondary }}>{t('od.plInterestCalcDesc')}</span>
                  </div>

                  <div className="p-3 rounded-lg border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                      <strong className="block text-emerald-600 dark:text-emerald-400 mb-1">{t('od.preclosure')}</strong>
                      <span style={{ color: c.textSecondary }}>{t('od.odPreclosureDesc')}</span>
                  </div>
                  <div className="p-3 rounded-lg border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                      <strong className="block text-red-600 dark:text-red-400 mb-1">{t('od.preclosure')}</strong>
                      <span style={{ color: c.textSecondary }}>{t('od.plPreclosureDesc')}</span>
                  </div>

                  <div className="p-3 rounded-lg border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                      <strong className="block mb-1" style={{ color: c.text }}>{t('od.bestFor')}</strong>
                      <span style={{ color: c.textSecondary }}>{t('od.odBestForDesc')}</span>
                  </div>
                  <div className="p-3 rounded-lg border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                      <strong className="block mb-1" style={{ color: c.text }}>{t('od.bestFor')}</strong>
                      <span style={{ color: c.textSecondary }}>{t('od.plBestForDesc')}</span>
                  </div>
              </div>

              <div className="mt-4 pt-4 border-t flex items-start gap-3" style={{ borderColor: c.border }}>
                  <div className="bg-emerald-100 dark:bg-emerald-500/20 p-2 rounded-xl text-emerald-600 dark:text-emerald-400 mt-1 shadow-sm">
                      <Lightbulb size={20} />
                  </div>
                  <div>
                      <h4 className="font-bold text-sm" style={{ color: c.text }}>{t('od.smartVerdict')}</h4>
                      <p className="text-xs leading-relaxed mt-1" style={{ color: c.textSecondary }}>
                          {t('od.smartVerdictDesc', { days: daysNum })}
                      </p>
                  </div>
              </div>
          </div>
      </div>

      {/* SECTION 10: Smart Tips */}
      <h3 className="text-sm font-bold uppercase tracking-wider mb-4 px-1" style={{ color: c.text }}>{t('od.optimizationTips')}</h3>
      <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 p-4 rounded-2xl">
              <span className="text-xl mb-2 block">📅</span>
              <strong className="block text-xs text-blue-800 dark:text-blue-300 font-bold mb-1">{t('od.tipDailyTitle')}</strong>
              <p className="text-[10px] text-blue-600/80 dark:text-blue-200/70">{t('od.tipDailyDesc')}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 rounded-2xl">
              <span className="text-xl mb-2 block">🏦</span>
              <strong className="block text-xs text-emerald-800 dark:text-emerald-300 font-bold mb-1">{t('od.tipDepositTitle')}</strong>
              <p className="text-[10px] text-emerald-600/80 dark:text-emerald-200/70">{t('od.tipDepositDesc')}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-4 rounded-2xl">
              <span className="text-xl mb-2 block">⚠️</span>
              <strong className="block text-xs text-red-800 dark:text-red-300 font-bold mb-1">{t('od.tipBreachTitle')}</strong>
              <p className="text-[10px] text-red-600/80 dark:text-red-200/70">{t('od.tipBreachDesc')}</p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 p-4 rounded-2xl">
              <span className="text-xl mb-2 block">🤝</span>
              <strong className="block text-xs text-purple-800 dark:text-purple-300 font-bold mb-1">{t('od.tipRenegotiateTitle')}</strong>
              <p className="text-[10px] text-purple-600/80 dark:text-purple-200/70">{t('od.tipRenegotiateDesc')}</p>
          </div>
      </div>

      {/* OVERDRAFT SNAPSHOT — appears the moment the user has a utilized amount */}
      {utilizedNum > 0 && startDate && (
        <div className="mb-4">
          <SnapshotPreviewCard
            anchorDate={startDate}
            headline={formatINR(totalPayableAmount)}
            headlineLabel={t('od.snapshotHeadline', 'Total Payable')}
            subtitle={t('od.snapshotSubtitle', '{{days}} days at {{rate}}% per annum', { days: daysNum, rate: rateNum })}
            metrics={[
              { label: t('od.utilized', 'Utilized'), value: formatINR(utilizedNum), tone: 'investment' },
              { label: t('od.interest', 'Interest'), value: formatINR(totalInterest), tone: 'expense' },
              { label: t('od.fees', 'Fees'), value: formatINR(totalFees), tone: 'neutral' },
            ]}
            notes={[
              { label: t('od.limit', 'OD limit'), value: formatINR(limitNum) },
              { label: t('od.available', 'Available'), value: formatINR(availableLimit) },
              { label: t('od.effectiveCost', 'Effective annual cost'), value: `${effectiveCost.toFixed(2)}%` },
              { label: t('od.type', 'Type'), value: odType === 'business' ? t('od.typeBusiness', 'Business OD') : odType === 'personal' ? t('od.typePersonal', 'Personal OD') : odType === 'salary' ? t('od.typeSalary', 'Salary OD') : t('od.typeFD', 'Against FD/Property') },
            ]}
            label={t('od.snapshotTitle', 'Overdraft Snapshot')}
          />
        </div>
      )}

      {/* Save to My Loans */}
      {utilizedNum > 0 && (
        <div className="p-4 rounded-2xl border shadow-sm mb-6" style={{ backgroundColor: c.card, borderColor: c.border }}>
          {loanSaved ? (
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold text-emerald-500">{t('tw.savedToMyLoans')}</span>
              <button onClick={() => navigate('/my-loans')} className="ml-auto text-xs font-bold text-violet-500">{t('tw.viewInMyLoans')}</button>
              <button onClick={handleRemoveFromMyLoans} className="text-xs font-bold text-red-500">{t('common.remove', 'Remove')}</button>
            </div>
          ) : (
            <button onClick={() => setShowNameDialog(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-sm border border-emerald-500/20">
              <Save size={16} /> {t('tw.saveToMyLoans')}
            </button>
          )}

          <SaveNameDialog
            open={showNameDialog}
            onClose={() => setShowNameDialog(false)}
            onConfirm={(name) => handleSaveToMyLoans(name)}
            defaultName={`${odType === 'business' ? 'Business' : odType === 'personal' ? 'Personal' : odType === 'salary' ? 'Salary' : 'Secured'} OD — ${formatINR(utilizedNum)}`}
          />
        </div>
      )}

      {/* ── CIBIL Score Analysis ── */}
      <div className="mb-4">
        <CibilBadge loanType="overdraft" />
      </div>
      <CibilAdvisoryCard
        score={cibilScore}
        loanType="overdraft"
        loanAmount={utilizedNum}
        tenureMonths={Math.max(1, Math.round(daysNum / 30))}
      />

      <DisclaimerComponent module="overdraft" />

      </div>
    </div>
  );
}
