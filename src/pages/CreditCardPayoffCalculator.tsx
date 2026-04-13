import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Plus, Trash2, CreditCard, ChevronDown, ChevronUp,
  FileText, Download, AlertTriangle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { formatINR } from '../utils/calculations';
import { exportToPDF, exportToExcel, type ExportConfig, dateTag } from '../utils/exportReport';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { useHistoryTracker } from '../hooks/useHistoryTracker';
import { useCibil } from '../context/CibilContext';
import CibilAdvisoryCard from '../components/CibilAdvisoryCard';
import CibilBadge from '../components/CibilBadge';
import { getAllCreditCards } from '../utils/creditCardStorage';
import {
  calculateAvalanche, calculateSnowball, calculateHybrid, calculateEqual,
  calculateMinimumOnly, type PayoffCardInput, type PayoffResult, getMinimumDue
} from '../utils/creditCardCalculations';

const fmt = (v: number) => formatINR(Math.round(v));

interface ManualCard {
  id: string; name: string; balance: number; apr: number; minDue: number;
}

const STRATEGIES = ['avalanche', 'snowball', 'hybrid', 'equal'] as const;
type Strategy = typeof STRATEGIES[number];

const STRATEGY_LABELS: Record<Strategy, string> = {
  avalanche: 'Avalanche', snowball: 'Snowball', hybrid: 'Hybrid', equal: 'Equal Distribution',
};
const STRATEGY_KEYS: Record<Strategy, string> = {
  avalanche: 'ccPayoff.avalanche', snowball: 'ccPayoff.snowball',
  hybrid: 'ccPayoff.hybrid', equal: 'ccPayoff.equal',
};

const ROWS_PER_PAGE = 12;

export default function CreditCardPayoffCalculator() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile: cibilProfile } = useCibil();
  const cibilScore = cibilProfile?.isNTC ? 0 : (cibilProfile?.score ?? 0);

  // ── Input sub-tabs ──
  const [inputTab, setInputTab] = useState<'saved' | 'manual'>('manual');

  // ── Saved cards ──
  const savedCards = getAllCreditCards().filter(c => c.isActive);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(savedCards.map(c => c.id)));

  // ── Manual cards ──
  const [manualCards, setManualCards] = useState<ManualCard[]>([
    { id: 'm1', name: 'Card 1', balance: 50000, apr: 42, minDue: 2500 },
  ]);

  const addCard = () => {
    if (manualCards.length >= 20) return;
    const n = manualCards.length + 1;
    setManualCards(prev => [...prev, { id: `m${Date.now()}`, name: `Card ${n}`, balance: 0, apr: 42, minDue: 0 }]);
  };
  const removeCard = (id: string) => setManualCards(prev => prev.filter(c => c.id !== id));
  const updateCard = (id: string, field: keyof ManualCard, val: string | number) => {
    setManualCards(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  // ── Resolve active inputs ──
  const activeInputs: PayoffCardInput[] = useMemo(() => {
    if (inputTab === 'saved') {
      return savedCards.filter(c => selectedIds.has(c.id)).map(c => ({
        id: c.id, name: c.cardName || `${c.bankName} ${c.last4Digits}`,
        balance: c.currentBalance, apr: c.annualInterestRate,
        minDue: c.minimumDue || getMinimumDue(c.currentBalance, c.annualInterestRate),
      }));
    }
    return manualCards.filter(c => c.balance > 0).map(c => ({
      ...c, minDue: c.minDue || getMinimumDue(c.balance, c.apr),
    }));
  }, [inputTab, savedCards, selectedIds, manualCards]);

  const totalMinimum = useMemo(() => activeInputs.reduce((s, c) => s + c.minDue, 0), [activeInputs]);
  const maxBudget = Math.max(totalMinimum * 3, totalMinimum + 1000);
  const [budget, setBudget] = useState(0);
  const effectiveBudget = Math.max(budget, totalMinimum);

  // ── Strategy ──
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy>('avalanche');

  // ── Compute all results ──
  const results = useMemo<Record<Strategy, PayoffResult>>(() => {
    if (activeInputs.length === 0) {
      const empty: PayoffResult = { strategy: '', totalMonths: 0, totalInterest: 0, totalPaid: 0, payoffOrder: [], schedule: [] };
      return { avalanche: empty, snowball: empty, hybrid: empty, equal: empty };
    }
    return {
      avalanche: calculateAvalanche(activeInputs, effectiveBudget),
      snowball: calculateSnowball(activeInputs, effectiveBudget),
      hybrid: calculateHybrid(activeInputs, effectiveBudget),
      equal: calculateEqual(activeInputs, effectiveBudget),
    };
  }, [activeInputs, effectiveBudget]);

  const minimumOnly = useMemo(() => {
    if (activeInputs.length === 0) return { strategy: 'minimum', totalMonths: 0, totalInterest: 0, totalPaid: 0, payoffOrder: [], schedule: [] } as PayoffResult;
    return calculateMinimumOnly(activeInputs);
  }, [activeInputs]);

  const current = results[selectedStrategy];
  const interestSaved = minimumOnly.totalInterest - current.totalInterest;
  const timeSaved = minimumOnly.totalMonths - current.totalMonths;

  // ── History tracker ──
  useHistoryTracker('CC Payoff', { cards: activeInputs.length, budget: effectiveBudget, strategy: selectedStrategy },
    { totalInterest: current.totalInterest, totalMonths: current.totalMonths, interestSaved }, interestSaved);

  // ── Schedule pagination ──
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(current.schedule.length / ROWS_PER_PAGE);
  const pageRows = current.schedule.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
  // ── Payoff date helper ──
  const payoffDate = useCallback((months: number) => {
    if (months <= 0 || months === Infinity) return '-';
    const d = new Date(); d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }, []);

  // ── Export ──
  const buildExportConfig = useCallback((): ExportConfig => {
    const tag = dateTag();
    return {
      title: 'Credit Card Payoff Report',
      subtitle: `Strategy: ${STRATEGY_LABELS[selectedStrategy]}`,
      inputs: [
        { label: 'Cards', value: String(activeInputs.length) },
        { label: 'Monthly Budget', value: `INR ${effectiveBudget.toLocaleString('en-IN')}` },
        { label: 'Strategy', value: STRATEGY_LABELS[selectedStrategy] },
      ],
      results: [
        { label: 'Total Months', value: String(current.totalMonths) },
        { label: 'Total Interest', value: `INR ${current.totalInterest.toLocaleString('en-IN')}` },
        { label: 'Interest Saved vs Min-Only', value: `INR ${interestSaved.toLocaleString('en-IN')}` },
        { label: 'Time Saved', value: `${timeSaved} months` },
      ],
      projectionTitle: 'Month-by-Month Schedule',
      projectionColumns: ['Month', 'Total Paid', 'Interest', 'Balance', 'Card Cleared'],
      projectionRows: current.schedule.map(r => [
        `M${r.month}`, `INR ${r.totalPaid.toLocaleString('en-IN')}`,
        `INR ${r.totalInterest.toLocaleString('en-IN')}`, `INR ${r.totalBalance.toLocaleString('en-IN')}`,
        r.cardCleared ? activeInputs.find(c => c.id === r.cardCleared)?.name || '' : '',
      ]),
      additionalTables: [{
        title: 'Card Payoff Order',
        columns: ['Card', 'Balance', 'APR', 'Payoff Month', 'Interest Paid'],
        rows: current.payoffOrder.map(p => {
          const card = activeInputs.find(c => c.id === p.id);
          return [p.name, `INR ${(card?.balance || 0).toLocaleString('en-IN')}`, `${card?.apr || 0}%`, `M${p.month}`, `INR ${p.interest.toLocaleString('en-IN')}`];
        }),
      }],
      filename: `FinCalix_CC_Payoff_${tag}`,
    };
  }, [selectedStrategy, activeInputs, effectiveBudget, current, interestSaved, timeSaved]);

  const hasCards = activeInputs.length > 0 && current.totalMonths > 0;

  // ── RENDER ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900" style={{ maxWidth: 428, margin: '0 auto' }}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft size={20} /></button>
        <CreditCard size={20} className="text-blue-600" />
        <h1 className="text-base font-bold truncate">{t('ccPayoff.title', 'Credit Card Payoff Calculator')}</h1>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* ── Input Sub-Tabs ── */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {(['saved', 'manual'] as const).map(tab => (
            <button key={tab} onClick={() => setInputTab(tab)}
              className={`flex-1 py-2 text-xs font-semibold transition ${inputTab === tab ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
              {tab === 'saved' ? t('ccPayoff.loadCards', 'Load from My Cards') : t('ccPayoff.manualEntry', 'Manual Entry')}
            </button>
          ))}
        </div>

        {/* ── Saved Cards ── */}
        {inputTab === 'saved' && (
          <div className="space-y-2">
            {savedCards.length === 0 && (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500">{t('ccPayoff.noSavedCards', 'No saved cards found.')}</p>
                <button onClick={() => navigate('/expenses/credit-cards/add')} className="mt-3 text-sm font-bold text-blue-600 dark:text-blue-400">
                  + {t('ccPayoff.addCardFirst', 'Add Your First Card')}
                </button>
              </div>
            )}
            {savedCards.map(c => (
              <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <input type="checkbox" checked={selectedIds.has(c.id)}
                  onChange={() => setSelectedIds(prev => { const s = new Set(prev); s.has(c.id) ? s.delete(c.id) : s.add(c.id); return s; })}
                  className="accent-blue-600 w-4 h-4" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.cardName || c.bankName}</p>
                  <p className="text-xs text-gray-500">{fmt(c.currentBalance)} &middot; {c.annualInterestRate}% APR</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {/* ── Manual Entry ── */}
        {inputTab === 'manual' && (
          <div className="space-y-3">
            {manualCards.map(c => (
              <div key={c.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <input value={c.name} onChange={e => updateCard(c.id, 'name', e.target.value)}
                    className="text-sm font-semibold bg-transparent border-b border-gray-300 dark:border-gray-600 outline-none w-40" placeholder="Card name" />
                  {manualCards.length > 1 && (
                    <button onClick={() => removeCard(c.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 size={14} /></button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: t('ccPayoff.balance', 'Balance'), val: c.balance, field: 'balance' as const },
                    { label: t('ccPayoff.apr', 'APR %'), val: c.apr, field: 'apr' as const },
                    { label: t('ccPayoff.minDue', 'Min Due'), val: c.minDue, field: 'minDue' as const },
                  ].map(f => (
                    <div key={f.field}>
                      <label className="text-[10px] text-gray-500 uppercase">{f.label}</label>
                      <input type="number" value={f.val || ''} onChange={e => updateCard(c.id, f.field, Number(e.target.value))}
                        className="w-full text-sm p-1.5 rounded border border-gray-300 dark:border-gray-600 bg-transparent outline-none focus:border-blue-500" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {manualCards.length < 20 && (
              <button onClick={addCard} className="w-full py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-1">
                <Plus size={14} /> {t('ccPayoff.addCard', 'Add Card')}
              </button>
            )}
          </div>
        )}

        {/* ── Monthly Budget Slider ── */}
        {activeInputs.length > 0 && (
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t('ccPayoff.monthlyBudget', 'Monthly Budget')}</span>
              <span className="text-sm font-bold text-blue-600">{fmt(effectiveBudget)}</span>
            </div>
            <input type="range" min={totalMinimum} max={maxBudget} step={500} value={effectiveBudget}
              onChange={e => setBudget(Number(e.target.value))}
              className="w-full accent-blue-600" />
            <p className="text-[11px] text-gray-500 mt-1">
              {t('ccPayoff.extraBudget', 'Extra budget')}: <span className="font-semibold text-green-600">{fmt(effectiveBudget - totalMinimum)}</span> {t('ccPayoff.aboveMinimums', 'above minimums')}
            </p>
          </div>
        )}

        {/* ── Strategy Tabs ── */}
        {activeInputs.length > 0 && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STRATEGIES.map(s => (
              <button key={s} onClick={() => setSelectedStrategy(s)}
                className={`relative flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition whitespace-nowrap ${
                  selectedStrategy === s ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}>
                {t(STRATEGY_KEYS[s], STRATEGY_LABELS[s])}
                {s === 'avalanche' && <span className="ml-1 text-[9px] px-1 py-0.5 bg-green-500 text-white rounded-sm align-middle">{t('ccPayoff.recommended', 'RECOMMENDED')}</span>}
              </button>
            ))}
          </div>
        )}

        {/* ── Strategy Comparison ── */}
        {hasCards && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200">{t('ccPayoff.comparison', 'Strategy Comparison')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead><tr className="bg-gray-50 dark:bg-gray-800/40">
                  <th className="p-2 text-left font-semibold text-gray-500">{t('ccPayoff.metric', 'Metric')}</th>
                  {STRATEGIES.map(s => <th key={s} className={`p-2 text-right font-semibold ${s === selectedStrategy ? 'text-blue-600' : 'text-gray-500'}`}>{t(STRATEGY_KEYS[s], STRATEGY_LABELS[s])}</th>)}
                </tr></thead>
                <tbody>
                  {[
                    { label: t('ccPayoff.payoffDate', 'Payoff Date'), fn: (r: PayoffResult) => payoffDate(r.totalMonths) },
                    { label: t('ccPayoff.totalInterest', 'Total Interest'), fn: (r: PayoffResult) => fmt(r.totalInterest) },
                    { label: t('ccPayoff.intSaved', 'Interest Saved'), fn: (r: PayoffResult) => fmt(minimumOnly.totalInterest - r.totalInterest) },
                    { label: t('ccPayoff.timeSaved', 'Time Saved'), fn: (r: PayoffResult) => `${minimumOnly.totalMonths - r.totalMonths} mo` },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="p-2 font-medium text-gray-600 dark:text-gray-300">{row.label}</td>
                      {STRATEGIES.map(s => <td key={s} className={`p-2 text-right ${s === selectedStrategy ? 'font-bold text-blue-600' : 'text-gray-700 dark:text-gray-300'}`}>{row.fn(results[s])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Card-by-Card Payoff Order ── */}
        {hasCards && current.payoffOrder.length > 0 && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-800/60 px-3 py-2">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200">{t('ccPayoff.payoffOrder', 'Card-by-Card Payoff Order')}</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {current.payoffOrder.map((p, i) => {
                const card = activeInputs.find(c => c.id === p.id);
                return (
                  <div key={p.id} className="px-3 py-2 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-[11px] text-gray-500">{fmt(card?.balance || 0)} &middot; {card?.apr}% APR</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold">{payoffDate(p.month)}</p>
                      <p className="text-[10px] text-red-500">{t('ccPayoff.interest', 'Interest')}: {fmt(p.interest)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Minimum Payment Trap ── */}
        {hasCards && (
          <div className="rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-600" />
              <h3 className="text-sm font-bold text-red-700 dark:text-red-400">{t('ccPayoff.trap', 'Minimum Payment Trap')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-lg bg-white dark:bg-gray-900/60">
                <p className="text-[10px] text-gray-500 uppercase mb-1">{t('ccPayoff.minOnly', 'Minimum Only')}</p>
                <p className="text-lg font-black text-red-600">{fmt(minimumOnly.totalInterest)}</p>
                <p className="text-[11px] text-gray-500">{minimumOnly.totalMonths} {t('ccPayoff.months', 'months')}</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-white dark:bg-gray-900/60">
                <p className="text-[10px] text-gray-500 uppercase mb-1">{t(STRATEGY_KEYS[selectedStrategy], STRATEGY_LABELS[selectedStrategy])}</p>
                <p className="text-lg font-black text-green-600">{fmt(current.totalInterest)}</p>
                <p className="text-[11px] text-gray-500">{current.totalMonths} {t('ccPayoff.months', 'months')}</p>
              </div>
            </div>
            <div className="text-center pt-2 border-t border-red-200 dark:border-red-800">
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('ccPayoff.youSave', 'You save')}</p>
              <p className="text-xl font-black text-green-600">{fmt(interestSaved)}</p>
              <p className="text-xs text-gray-500">&amp; <span className="font-bold">{timeSaved} {t('ccPayoff.months', 'months')}</span> {t('ccPayoff.faster', 'faster debt-free')}</p>
            </div>
          </div>
        )}

        {/* ── Month-by-Month Schedule (collapsible) ── */}
        {hasCards && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button onClick={() => { setScheduleOpen(!scheduleOpen); setPage(0); }}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-200">{t('ccPayoff.schedule', 'Month-by-Month Schedule')}</h3>
              {scheduleOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {scheduleOpen && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead><tr className="bg-gray-50 dark:bg-gray-800/40">
                      <th className="p-1.5 text-left">{t('ccPayoff.month', 'Month')}</th>
                      <th className="p-1.5 text-right">{t('ccPayoff.paid', 'Paid')}</th>
                      <th className="p-1.5 text-right">{t('ccPayoff.interest', 'Interest')}</th>
                      <th className="p-1.5 text-right">{t('ccPayoff.balanceCol', 'Balance')}</th>
                      <th className="p-1.5 text-left">{t('ccPayoff.cleared', 'Cleared')}</th>
                    </tr></thead>
                    <tbody>
                      {pageRows.map(r => {
                        const isClearedRow = !!r.cardCleared;
                        return (
                          <tr key={r.month} className={`border-t border-gray-100 dark:border-gray-800 ${isClearedRow ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                            <td className="p-1.5 font-medium">M{r.month}</td>
                            <td className="p-1.5 text-right">{fmt(r.totalPaid)}</td>
                            <td className="p-1.5 text-right text-red-500">{fmt(r.totalInterest)}</td>
                            <td className="p-1.5 text-right">{fmt(r.totalBalance)}</td>
                            <td className="p-1.5 text-green-600 font-semibold truncate max-w-[80px]">
                              {r.cardCleared ? activeInputs.find(c => c.id === r.cardCleared)?.name || '' : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800/40 text-xs text-gray-500">
                    <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"><ChevronLeft size={14} /></button>
                    <span>{page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30"><ChevronRight size={14} /></button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Export Buttons ── */}
        {hasCards && (
          <div className="flex gap-3">
            <button onClick={() => exportToPDF(buildExportConfig())}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
              <FileText size={16} /> {t('ccPayoff.pdf', 'PDF Report')}
            </button>
            <button onClick={() => exportToExcel(buildExportConfig())}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-blue-600 text-blue-600 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition">
              <Download size={16} /> {t('ccPayoff.excel', 'Excel')}
            </button>
          </div>
        )}

        {/* ── CIBIL Score Analysis ── */}
        <CibilBadge loanType="credit_card" />
        <CibilAdvisoryCard
          score={cibilScore}
          loanType="credit_card"
          loanAmount={activeInputs.reduce((s, c) => s + c.balance, 0)}
          tenureMonths={current.totalMonths || 12}
        />

        {/* ── Disclaimer ── */}
        <DisclaimerComponent module="creditCard" />
      </div>
    </div>
  );
}
