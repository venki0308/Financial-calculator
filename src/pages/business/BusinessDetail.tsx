// ═══════════════════════════════════════════════════════════════
// FINCALIX — BUSINESS DETAIL (core screen)
// Period tabs Daily | Weekly | Monthly | Yearly with prev/next,
// Income / Expenses / Net Profit summary (+ margin), category
// breakdown, period entry list, Add Entry sheet, PDF/Excel export.
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2, X,
  FileText, Sheet as SheetIcon,
} from 'lucide-react';
import { useExpenseTheme } from '../../theme/expenseTheme';
import { fmtINR, formatFullDate, getWeekRange, getMonthRange, getYearRange, MONTH_NAMES } from '../../utils/expenseCalculations';
import { todayStr, shiftLocalDate, parseLocalDate } from '../../utils/dateUtils';
import { exportToExcel, dateTag, type ExportConfig } from '../../utils/exportReport';
import { generateBusinessPDF } from '../../utils/expenseReportPDF';
import {
  type BizEntry, type BizEntryType,
  BIZ_EXPENSE_CATEGORIES, BIZ_INCOME_CATEGORIES,
  getBusinessById, getEntriesForBusiness, addBizEntry, softDeleteBizEntry,
  calcBizTotals, getBizCategoryById, BUSINESS_TYPE_META,
} from '../../utils/businessStorage';
import { AnalyticsService } from '../../lib/analytics';

/* ── constants ── */

const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'] as const;
type Period = (typeof PERIODS)[number];

const MAX_ENTRY = 1000000000; // ₹100 Cr per entry (same cap as expense tracker)

interface PeriodRange {
  start: string;
  end: string;
  label: string;
}

/* ── main component ── */

export default function BusinessDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const et = useExpenseTheme();
  const { bizId } = useParams<{ bizId: string }>();

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const [period, setPeriod] = useState<Period>('daily');
  const [offsets, setOffsets] = useState<Record<Period, number>>({ daily: 0, weekly: 0, monthly: 0, yearly: 0 });
  const [showSheet, setShowSheet] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    AnalyticsService.trackScreen('Business_Detail');
  }, []);

  const business = useMemo(() => {
    void refreshKey;
    return bizId ? getBusinessById(bizId) : undefined;
  }, [bizId, refreshKey]);

  const offset = offsets[period];
  const setOffset = (delta: number) =>
    setOffsets(prev => ({ ...prev, [period]: Math.min(0, prev[period] + delta) }));

  /* ── period range (Mon–Sun weeks / calendar month / calendar year) ── */
  const range: PeriodRange = useMemo(() => {
    if (period === 'daily') {
      const date = shiftLocalDate(todayStr(), offset);
      return { start: date, end: date, label: formatFullDate(date) };
    }
    if (period === 'weekly') {
      const w = getWeekRange(offset);
      return { start: w.start, end: w.end, label: w.label };
    }
    if (period === 'monthly') {
      const m = getMonthRange(offset);
      return { start: m.start, end: m.end, label: m.label };
    }
    const y = getYearRange(offset);
    return { start: y.start, end: y.end, label: String(y.year) };
  }, [period, offset]);

  const canGoForward = offset < 0;

  /* ── data ── */
  const entries = useMemo(() => {
    void refreshKey;
    if (!bizId) return [];
    return getEntriesForBusiness(bizId, range.start, range.end)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [bizId, range.start, range.end, refreshKey]);

  const totals = useMemo(() => calcBizTotals(entries), [entries]);
  const margin = totals.income > 0 ? (totals.net / totals.income) * 100 : null;

  /* ── expense category breakdown ── */
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    entries.forEach(e => {
      if (e.type !== 'expense') return;
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    });
    return Array.from(map.entries())
      .map(([id, amount]) => ({
        id, amount,
        pct: totals.expenses > 0 ? (amount / totals.expenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries, totals.expenses]);

  /* ── grouping for the list ── */
  const groupedByDate = useMemo(() => {
    const map = new Map<string, BizEntry[]>();
    entries.forEach(e => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return Array.from(map.entries()); // already date-desc thanks to sort above
  }, [entries]);

  const monthSummaries = useMemo(() => {
    if (period !== 'yearly') return [];
    const map = new Map<string, { income: number; expenses: number }>();
    entries.forEach(e => {
      const key = e.date.slice(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, { income: 0, expenses: 0 });
      const m = map.get(key)!;
      if (e.type === 'income') m.income += e.amount;
      else m.expenses += e.amount;
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, v]) => ({
        key,
        label: `${MONTH_NAMES[parseInt(key.slice(5, 7), 10) - 1]} ${key.slice(0, 4)}`,
        ...v,
        net: v.income - v.expenses,
      }));
  }, [entries, period]);

  /* ── actions ── */
  const handleDelete = (id: string) => {
    softDeleteBizEntry(id);
    setDeleteConfirm(null);
    refresh();
  };

  /* ── export ── */
  const buildExportConfig = (): ExportConfig | null => {
    if (!business) return null;
    const periodName = t(`biz.period.${period}`, period.charAt(0).toUpperCase() + period.slice(1));
    const catLabel = (id: string) => {
      const c = getBizCategoryById(id);
      return c ? t(`biz.cat.${c.id}`, c.label) : id;
    };
    const rows = [...entries]
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
      .map(e => [
        e.date,
        e.type === 'income' ? 'Income' : 'Expense',
        catLabel(e.category),
        e.note || '',
        `${e.type === 'income' ? '+' : '-'}${Math.round(e.amount).toLocaleString('en-IN')}`,
      ]);

    const additionalTables: NonNullable<ExportConfig['additionalTables']> = [];
    if (period === 'monthly') {
      // Day-wise summary
      const dayMap = new Map<string, { income: number; expenses: number }>();
      entries.forEach(e => {
        if (!dayMap.has(e.date)) dayMap.set(e.date, { income: 0, expenses: 0 });
        const d = dayMap.get(e.date)!;
        if (e.type === 'income') d.income += e.amount;
        else d.expenses += e.amount;
      });
      additionalTables.push({
        title: 'Day-wise Summary',
        columns: ['Date', 'Income', 'Expenses', 'Net'],
        rows: Array.from(dayMap.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([date, v]) => [
            date,
            Math.round(v.income).toLocaleString('en-IN'),
            Math.round(v.expenses).toLocaleString('en-IN'),
            Math.round(v.income - v.expenses).toLocaleString('en-IN'),
          ]),
      });
    } else if (period === 'yearly') {
      additionalTables.push({
        title: 'Month-wise Summary',
        columns: ['Month', 'Income', 'Expenses', 'Net'],
        rows: monthSummaries.map(m => [
          m.label,
          Math.round(m.income).toLocaleString('en-IN'),
          Math.round(m.expenses).toLocaleString('en-IN'),
          Math.round(m.net).toLocaleString('en-IN'),
        ]),
      });
    }

    const safeName = business.name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Business';
    return {
      title: `${business.name} — ${periodName} Business Report`,
      subtitle: range.label,
      inputs: [
        { label: 'Business', value: business.name },
        { label: 'Type', value: BUSINESS_TYPE_META[business.type]?.label ?? business.type },
        { label: 'Period', value: `${periodName} (${range.label})` },
      ],
      results: [
        { label: 'Total Income', value: fmtINR(totals.income) },
        { label: 'Total Expenses', value: fmtINR(totals.expenses) },
        { label: 'Net Profit', value: `${totals.net >= 0 ? '' : '-'}${fmtINR(Math.abs(totals.net))}` },
        { label: 'Profit Margin', value: margin === null ? 'N/A' : `${margin.toFixed(1)}%` },
      ],
      projectionTitle: 'Transactions',
      projectionColumns: ['Date', 'Type', 'Category', 'Note', 'Amount (₹)'],
      projectionRows: rows,
      additionalTables: additionalTables.length ? additionalTables : undefined,
      filename: `FinCalix_Business_${safeName}_${period}_${dateTag()}`,
    };
  };

  // PDF now uses the styled business report (stat cards, earnings-vs-spending
  // bars, category donut) instead of the generic calculator export. Labels are
  // forced English — jsPDF Helvetica cannot render Indian scripts.
  const handleExportPDF = () => {
    if (!business) return;
    const englishPeriod = period.charAt(0).toUpperCase() + period.slice(1);
    void generateBusinessPDF({
      businessName: business.name,
      businessTypeLabel: BUSINESS_TYPE_META[business.type]?.label ?? business.type,
      periodName: englishPeriod,
      rangeLabel: range.label,
      isYearly: period === 'yearly',
      entries: entries.map(e => ({
        date: e.date,
        type: e.type,
        categoryLabel: getBizCategoryById(e.category)?.label ?? e.category,
        note: e.note,
        amount: e.amount,
      })),
    });
  };
  const handleExportExcel = () => {
    const cfg = buildExportConfig();
    if (cfg) void exportToExcel(cfg);
  };

  /* ── not found ── */
  if (!business) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6" style={{ backgroundColor: et.bgPrimary }}>
        <p className="text-4xl mb-3">🏪</p>
        <p className="text-sm font-bold mb-4" style={{ color: et.textPrimary }}>
          {t('biz.notFound', 'Business not found')}
        </p>
        <button
          onClick={() => navigate('/business-tracker')}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ backgroundColor: et.accentPrimary }}
        >
          {t('biz.backToList', 'Back to Business Tracker')}
        </button>
      </div>
    );
  }

  const entryRow = (entry: BizEntry, idx: number) => {
    const cat = getBizCategoryById(entry.category);
    const color = entry.type === 'income' ? et.accentIncome : et.accentExpense;
    return (
      <motion.div
        key={entry.id}
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ delay: Math.min(idx * 0.02, 0.3) }}
        className="flex items-center gap-3"
        style={{ padding: 12, borderRadius: 16, backgroundColor: et.bgCard, boxShadow: et.shadowSoft }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: color + '15', fontSize: 18 }}
        >
          {cat?.emoji ?? '📌'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: et.textPrimary }}>
            {cat ? t(`biz.cat.${cat.id}`, cat.label) : entry.category}
          </p>
          {entry.note && (
            <p className="text-xs truncate mt-0.5" style={{ color: et.textMuted }}>{entry.note}</p>
          )}
        </div>
        <p className="font-bold flex-shrink-0 text-sm" style={{ color, fontVariantNumeric: 'tabular-nums' }}>
          {entry.type === 'income' ? '+' : '-'}{fmtINR(entry.amount)}
        </p>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={() => setDeleteConfirm(entry.id)}
          className="p-1.5 rounded-lg flex-shrink-0"
          style={{ backgroundColor: et.accentExpense + '12', color: et.accentExpense }}
          aria-label={t('common.delete', 'Delete')}
        >
          <Trash2 size={14} />
        </motion.button>
      </motion.div>
    );
  };

  return (
    <div className="min-h-dvh" style={{ backgroundColor: et.bgPrimary }}>
      {/* ── header ── */}
      <div
        className="sticky top-0 z-10 px-4 pt-14 pb-3"
        style={{ backgroundColor: et.bgPrimary, borderBottom: `1px solid ${et.borderSubtle}` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/business-tracker')}
            className="p-2 rounded-xl"
            style={{ backgroundColor: et.bgCard, border: `1px solid ${et.borderSubtle}` }}
          >
            <ArrowLeft size={18} style={{ color: et.textSecondary }} />
          </button>
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 38, height: 38, borderRadius: 12, fontSize: 19, backgroundColor: et.accentPrimary + '15' }}
          >
            {business.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold truncate" style={{ color: et.textPrimary }}>{business.name}</h1>
            <p className="text-[10px]" style={{ color: et.textSecondary }}>
              {t(`biz.type.${business.type}`, BUSINESS_TYPE_META[business.type]?.label ?? business.type)}
            </p>
          </div>
          {/* Export buttons */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleExportPDF}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-[10px] font-bold"
            style={{ backgroundColor: et.accentExpense + '15', color: et.accentExpense }}
            aria-label={t('biz.exportPdf', 'Export PDF')}
          >
            <FileText size={14} /> PDF
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-[10px] font-bold"
            style={{ backgroundColor: et.accentIncome + '15', color: et.accentIncome }}
            aria-label={t('biz.exportExcel', 'Export Excel')}
          >
            <SheetIcon size={14} /> XLS
          </motion.button>
        </div>
      </div>

      <div className="px-4 pb-28 pt-4 space-y-4">
        {/* ── period tabs ── */}
        <div className="flex gap-2">
          {PERIODS.map(p => {
            const active = period === p;
            const labels: Record<Period, string> = {
              daily: t('biz.period.daily', 'Daily'),
              weekly: t('biz.period.weekly', 'Weekly'),
              monthly: t('biz.period.monthly', 'Monthly'),
              yearly: t('biz.period.yearly', 'Yearly'),
            };
            return (
              <motion.button
                key={p}
                whileTap={{ scale: 0.95 }}
                onClick={() => setPeriod(p)}
                className="flex-1 py-2 text-xs font-bold transition-all"
                style={{
                  borderRadius: 999,
                  ...(active
                    ? { backgroundColor: et.accentPrimary, color: '#fff' }
                    : { backgroundColor: 'transparent', border: `1.5px solid ${et.borderSubtle}`, color: et.textMuted }),
                }}
              >
                {labels[p]}
              </motion.button>
            );
          })}
        </div>

        {/* ── range navigator ── */}
        <div
          className="flex items-center justify-between rounded-2xl px-3 py-2.5"
          style={{ backgroundColor: et.bgCard, boxShadow: et.shadowSoft }}
        >
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setOffset(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: et.bgPrimary }}
          >
            <ChevronLeft size={16} style={{ color: et.textSecondary }} />
          </motion.button>
          <div className="text-center">
            <span className="text-xs font-bold" style={{ color: et.textPrimary }}>{range.label}</span>
            {offset === 0 && (
              <span
                className="ml-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: et.accentIncome + '20', color: et.accentIncome }}
              >
                {t('biz.current', 'Current')}
              </span>
            )}
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setOffset(1)}
            disabled={!canGoForward}
            className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30"
            style={{ backgroundColor: et.bgPrimary }}
          >
            <ChevronRight size={16} style={{ color: et.textSecondary }} />
          </motion.button>
        </div>

        {/* ── summary cards ── */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: et.bgCard, boxShadow: et.shadowCard }}>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t('biz.income', 'Income'), value: fmtINR(totals.income), color: et.accentIncome },
              { label: t('biz.expenses', 'Expenses'), value: fmtINR(totals.expenses), color: et.accentExpense },
              {
                label: t('biz.netProfit', 'Net Profit'),
                value: `${totals.net >= 0 ? '+' : '-'}${fmtINR(Math.abs(totals.net))}`,
                color: totals.net >= 0 ? et.accentIncome : et.accentExpense,
              },
            ].map((m, j) => (
              <div key={j} className="text-center">
                <span className="text-[11px] font-medium block mb-1" style={{ color: et.textMuted }}>{m.label}</span>
                <p className="text-base font-extrabold" style={{ color: m.color, fontVariantNumeric: 'tabular-nums' }}>
                  {m.value}
                </p>
              </div>
            ))}
          </div>
          {margin !== null && (
            <div className="mt-3 pt-3 text-center" style={{ borderTop: `1px solid ${et.borderSubtle}` }}>
              <span className="text-[11px] font-medium" style={{ color: et.textMuted }}>
                {t('biz.profitMargin', 'Profit Margin')}:{' '}
              </span>
              <span
                className="text-xs font-extrabold"
                style={{ color: margin >= 0 ? et.accentIncome : et.accentExpense }}
              >
                {margin.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* ── category breakdown (top expenses) ── */}
        {categoryBreakdown.length > 0 && (
          <div className="rounded-2xl p-4" style={{ backgroundColor: et.bgCard, boxShadow: et.shadowSoft }}>
            <p className="text-[11px] font-bold uppercase mb-3" style={{ color: et.textMuted }}>
              {t('biz.topExpenses', 'Expense Breakdown')}
            </p>
            <div className="space-y-2.5">
              {categoryBreakdown.slice(0, 6).map(c => {
                const cat = getBizCategoryById(c.id);
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold" style={{ color: et.textPrimary }}>
                        {cat?.emoji ?? '📌'} {cat ? t(`biz.cat.${cat.id}`, cat.label) : c.id}
                      </span>
                      <span className="text-xs font-bold" style={{ color: et.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtINR(c.amount)} · {c.pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 5, backgroundColor: et.borderSubtle }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(c.pct, 100)}%`, backgroundColor: et.accentExpense }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── entries ── */}
        {entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-14 rounded-2xl"
            style={{ backgroundColor: et.bgCard, boxShadow: et.shadowSoft }}
          >
            <span className="text-4xl block mb-3">📒</span>
            <p className="text-sm font-semibold mb-1" style={{ color: et.textPrimary }}>
              {t('biz.noEntries', 'No entries in this period')}
            </p>
            <p className="text-xs" style={{ color: et.textMuted }}>
              {t('biz.noEntriesSub', 'Tap + to log income or expenses')}
            </p>
          </motion.div>
        ) : period === 'yearly' ? (
          /* Month-wise summary table for the year */
          <div className="rounded-2xl p-4" style={{ backgroundColor: et.bgCard, boxShadow: et.shadowSoft }}>
            <p className="text-[11px] font-bold uppercase mb-3" style={{ color: et.textMuted }}>
              {t('biz.monthSummary', 'Month-wise Summary')}
            </p>
            <div className="grid grid-cols-4 gap-2 pb-2 mb-1" style={{ borderBottom: `1px solid ${et.borderSubtle}` }}>
              {[t('biz.month', 'Month'), t('biz.income', 'Income'), t('biz.expenses', 'Expenses'), t('biz.net', 'Net')].map((h, i) => (
                <p key={i} className={`text-[9px] uppercase font-bold ${i === 0 ? '' : 'text-right'}`} style={{ color: et.textMuted }}>
                  {h}
                </p>
              ))}
            </div>
            {monthSummaries.map(m => (
              <div key={m.key} className="grid grid-cols-4 gap-2 py-2" style={{ borderBottom: `1px solid ${et.borderSubtle}` }}>
                <p className="text-[11px] font-bold" style={{ color: et.textPrimary }}>{m.label}</p>
                <p className="text-[11px] font-semibold text-right" style={{ color: et.accentIncome, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtINR(m.income)}
                </p>
                <p className="text-[11px] font-semibold text-right" style={{ color: et.accentExpense, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtINR(m.expenses)}
                </p>
                <p className="text-[11px] font-bold text-right" style={{ color: m.net >= 0 ? et.accentIncome : et.accentExpense, fontVariantNumeric: 'tabular-nums' }}>
                  {m.net >= 0 ? '+' : '-'}{fmtINR(Math.abs(m.net))}
                </p>
              </div>
            ))}
          </div>
        ) : period === 'daily' ? (
          /* Flat list for a single day */
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {entries.map((e, i) => entryRow(e, i))}
            </AnimatePresence>
          </div>
        ) : (
          /* Weekly / Monthly — grouped by date */
          <div className="space-y-4">
            {groupedByDate.map(([date, dayEntries]) => {
              const dayTotals = calcBizTotals(dayEntries);
              return (
                <div key={date}>
                  <div className="flex items-center justify-between px-1 mb-1.5">
                    <p className="text-[11px] font-bold" style={{ color: et.textSecondary }}>
                      {formatFullDate(date)}
                    </p>
                    <p
                      className="text-[11px] font-bold"
                      style={{ color: dayTotals.net >= 0 ? et.accentIncome : et.accentExpense, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {dayTotals.net >= 0 ? '+' : '-'}{fmtINR(Math.abs(dayTotals.net))}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {dayEntries.map((e, i) => entryRow(e, i))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── FAB ── */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setShowSheet(true)}
        className="fixed bottom-28 right-5 z-[10000] flex items-center justify-center"
        style={{
          width: 56, height: 56, borderRadius: '50%',
          backgroundColor: et.accentPrimary,
          boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
        }}
        aria-label={t('biz.addEntry', 'Add Entry')}
      >
        <Plus size={26} color="#fff" />
      </motion.button>

      {/* ── ADD ENTRY SHEET ── */}
      {createPortal(
        <AnimatePresence>
          {showSheet && bizId && (
            <AddBizEntrySheet
              businessId={bizId}
              defaultDate={period === 'daily' && range.start <= todayStr() ? range.start : todayStr()}
              onSave={() => { setShowSheet(false); refresh(); }}
              onClose={() => setShowSheet(false)}
            />
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ── DELETE ENTRY CONFIRMATION ── */}
      {createPortal(
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                className="w-full max-w-xs rounded-2xl p-6"
                style={{ backgroundColor: et.bgCard, boxShadow: et.shadowCard }}
                onClick={e => e.stopPropagation()}
              >
                <p className="font-bold text-base mb-2" style={{ color: et.textPrimary }}>
                  {t('biz.deleteEntryTitle', 'Delete Entry?')}
                </p>
                <p className="text-sm mb-5" style={{ color: et.textSecondary }}>
                  {t('biz.deleteEntryMsg', 'This action cannot be undone.')}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                    style={{ backgroundColor: et.borderSubtle, color: et.textSecondary }}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: et.accentExpense }}
                  >
                    {t('common.delete', 'Delete')}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ADD BUSINESS ENTRY BOTTOM SHEET
   ══════════════════════════════════════════════════════════════ */

interface SheetProps {
  businessId: string;
  defaultDate: string;
  onSave: () => void;
  onClose: () => void;
}

function AddBizEntrySheet({ businessId, defaultDate, onSave, onClose }: SheetProps) {
  const { t } = useTranslation();
  const et = useExpenseTheme();

  const [entryType, setEntryType] = useState<BizEntryType>('income');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('sales');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(defaultDate);

  const cats = entryType === 'income' ? BIZ_INCOME_CATEGORIES : BIZ_EXPENSE_CATEGORIES;
  const typeColor = entryType === 'income' ? et.accentIncome : et.accentExpense;

  const [dateError, setDateError] = useState(false);

  // Round to 2 decimals; reject ≤ 0 or > ₹100 Cr (same guard as expense tracker)
  const parsedAmount = Math.round((parseFloat(amount) || 0) * 100) / 100;
  // A cleared date input yields '' — without this check Save stayed enabled
  // while handleSave's regex guard silently no-oped (dead Save button).
  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const isValid = parsedAmount > 0 && parsedAmount <= MAX_ENTRY && dateValid;

  const handleTypeChange = (tp: BizEntryType) => {
    setEntryType(tp);
    setCategoryId(tp === 'income' ? 'sales' : 'ingredients');
  };

  const handleSave = () => {
    if (!isValid) return;
    // Defensive: reject dates that would break aggregation windows —
    // surface an inline error instead of silently no-oping.
    if (!dateValid || isNaN(parseLocalDate(date).getTime())) {
      setDateError(true);
      return;
    }
    addBizEntry({
      businessId,
      date,
      type: entryType,
      amount: parsedAmount,
      category: categoryId,
      note: note.trim() || undefined,
    });
    onSave();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="w-full max-w-md flex flex-col"
        style={{
          maxHeight: '90dvh',
          backgroundColor: et.bgPrimary,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-3 pb-2">
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: et.borderSubtle }} />
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-extrabold text-lg" style={{ color: et.textPrimary }}>
              {t('biz.addEntry', 'Add Entry')}
            </h3>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={onClose}
              className="p-1.5 rounded-full"
              style={{ backgroundColor: et.borderSubtle, color: et.textSecondary }}
            >
              <X size={18} />
            </motion.button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-3 space-y-5">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'income' as const, emoji: '💰', label: t('biz.entryIncome', 'Income') },
              { id: 'expense' as const, emoji: '💸', label: t('biz.entryExpense', 'Expense') },
            ]).map(tp => {
              const active = entryType === tp.id;
              const color = tp.id === 'income' ? et.accentIncome : et.accentExpense;
              return (
                <motion.button
                  key={tp.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTypeChange(tp.id)}
                  className="py-2.5 rounded-xl text-center text-xs font-bold transition-all"
                  style={active
                    ? { backgroundColor: color, color: '#fff' }
                    : { backgroundColor: et.bgCard, border: `1.5px solid ${et.borderSubtle}`, color: et.textMuted }
                  }
                >
                  <span className="text-base block mb-0.5">{tp.emoji}</span>
                  {tp.label}
                </motion.button>
              );
            })}
          </div>

          {/* Amount */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: et.bgCard, boxShadow: et.shadowSoft }}>
            <label className="text-[11px] font-semibold block mb-2 text-center" style={{ color: et.textMuted }}>
              {t('biz.amountLabel', 'Amount')}
            </label>
            <div className="flex items-center justify-center gap-1">
              <span className="font-extrabold" style={{ color: et.textSecondary, fontSize: 28 }}>₹</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={MAX_ENTRY}
                step="0.01"
                value={amount}
                onChange={e => {
                  const v = e.target.value;
                  if (v.startsWith('-')) return;
                  setAmount(v);
                }}
                placeholder="0"
                autoFocus
                className="bg-transparent text-center font-extrabold focus:outline-none"
                style={{ color: et.textPrimary, fontSize: 32, width: '60%', caretColor: typeColor }}
              />
            </div>
          </div>

          {/* Category grid */}
          <div>
            <label className="text-[11px] font-semibold mb-2 block" style={{ color: et.textMuted }}>
              {t('biz.category', 'Category')}
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {cats.map(cat => {
                const active = categoryId === cat.id;
                return (
                  <motion.button
                    key={cat.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => setCategoryId(cat.id)}
                    className="flex items-center gap-1.5 px-2.5 py-2 transition-all"
                    style={{
                      borderRadius: 999,
                      ...(active
                        ? { backgroundColor: typeColor, color: '#fff' }
                        : { backgroundColor: typeColor + '10', color: et.textSecondary, border: `1px solid ${typeColor}30` }),
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                    <span className="text-[11px] font-semibold truncate">
                      {t(`biz.cat.${cat.id}`, cat.label)}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: et.textMuted }}>
              {t('biz.noteLabel', 'Note (optional)')}
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={80}
              placeholder={t('biz.notePlaceholder', 'e.g. Vegetable purchase')}
              className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
              style={{ backgroundColor: et.bgCard, border: `1.5px solid ${et.borderSubtle}`, color: et.textPrimary }}
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: et.textMuted }}>
              {t('biz.date', 'Date')}
            </label>
            <input
              type="date"
              value={date}
              min="2020-01-01"
              max={todayStr()}
              onChange={e => {
                const v = e.target.value;
                if (v && (v < '2020-01-01' || v > todayStr())) return;
                setDate(v);
                setDateError(false);
              }}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold focus:outline-none"
              style={{ backgroundColor: et.bgCard, border: `1.5px solid ${dateError ? et.accentExpense : et.borderSubtle}`, color: et.textPrimary }}
            />
            {dateError && (
              <p className="text-[11px] mt-1.5 font-semibold" style={{ color: et.accentExpense }}>
                {t('biz.invalidDate', 'Please pick a valid date')}
              </p>
            )}
          </div>
        </div>

        {/* Save */}
        <div
          className="flex-shrink-0 px-6 pt-3"
          style={{
            paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 12px))',
            borderTop: `1px solid ${et.borderSubtle}`,
            backgroundColor: et.bgPrimary,
          }}
        >
          <motion.button
            whileTap={isValid ? { scale: 0.97 } : {}}
            onClick={handleSave}
            disabled={!isValid}
            className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: typeColor }}
          >
            {t('biz.saveEntry', 'Save Entry')}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
