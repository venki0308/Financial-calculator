import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CreditCard, Plus, AlertTriangle, ChevronRight, ArrowUpDown,
  Wallet, TrendingUp, Clock, Bell,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '../../theme/useAppColors';
import { formatINR } from '../../utils/calculations';
import { getAllCreditCards } from '../../utils/creditCardStorage';
import { getCibilProfile } from '../../utils/cibilProfile';
import {
  getUtilization, getUtilizationBarColor, getDaysUntilDue,
  getDueUrgency, generateInsights,
  type CCCard, type CCInsight,
} from '../../utils/creditCardCalculations';

// ── Sort options ─────────────────────────────────────────────
type SortKey = 'due' | 'balance' | 'utilization' | 'apr';
const SORT_OPTIONS: { key: SortKey; labelKey: string; fallback: string }[] = [
  { key: 'due', labelKey: 'cc.sortDue', fallback: 'Due Date' },
  { key: 'balance', labelKey: 'cc.sortBalance', fallback: 'Balance' },
  { key: 'utilization', labelKey: 'cc.sortUtil', fallback: 'Utilization' },
  { key: 'apr', labelKey: 'cc.sortAPR', fallback: 'APR' },
];

function sortCards(cards: CCCard[], key: SortKey): CCCard[] {
  const sorted = [...cards];
  switch (key) {
    case 'due':
      return sorted.sort((a, b) => getDaysUntilDue(a.dueDate) - getDaysUntilDue(b.dueDate));
    case 'balance':
      return sorted.sort((a, b) => b.currentBalance - a.currentBalance);
    case 'utilization':
      return sorted.sort(
        (a, b) => getUtilization(b.currentBalance, b.creditLimit) - getUtilization(a.currentBalance, a.creditLimit),
      );
    case 'apr':
      return sorted.sort((a, b) => b.annualInterestRate - a.annualInterestRate);
    default:
      return sorted;
  }
}

// ── Alert icon mapping ───────────────────────────────────────
function alertColor(type: CCInsight['type']): string {
  switch (type) {
    case 'danger': return '#ef4444';
    case 'savings': return '#3b82f6';
    case 'reward': return '#eab308';
    case 'health': return '#22c55e';
  }
}

// ── Component ────────────────────────────────────────────────
export default function CreditCards() {
  const c = useAppColors();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('due');
  const [tick, setTick] = useState(0);
  useEffect(() => { setTick(t => t + 1); }, []);

  const cards = useMemo(() => getAllCreditCards().filter((cd) => cd.isActive), [tick]);
  const sorted = useMemo(() => sortCards(cards, sortKey), [cards, sortKey]);
  const insights = useMemo(() => generateInsights(cards), [cards]);

  // ── Computed stats ───────────────────────────────────────
  const totalLimit = cards.reduce((s, cd) => s + cd.creditLimit, 0);
  const totalOutstanding = cards.reduce((s, cd) => s + cd.currentBalance, 0);
  const overallUtil = totalLimit > 0 ? Math.round((totalOutstanding / totalLimit) * 1000) / 10 : 0;
  const cardsDueThisWeek = cards.filter((cd) => getDaysUntilDue(cd.dueDate) <= 7).length;

  // Priority alerts: due soon + high util + reward expiry (max 3)
  const priorityAlerts = useMemo(() => {
    return insights.filter((i) => i.type === 'danger' || i.type === 'reward').slice(0, 3);
  }, [insights]);

  // ── Utilization color helper ─────────────────────────────
  const utilColor = (pct: number) => {
    if (pct < 30) return '#22c55e';
    if (pct < 60) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: c.bg }}>
      <div className="mx-auto max-w-[428px] px-4 pt-4">

        {/* ── Page Title ──────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={22} style={{ color: c.text }} />
          <h1 className="text-lg font-bold" style={{ color: c.text }}>
            {t('cc.dashboard', 'Credit Cards')}
          </h1>
          <span
            className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: c.border, color: c.textSecondary }}
          >
            {cards.length} {t('cc.cards', 'cards')}
          </span>
        </div>

        {/* ── Header Stats Row ────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {/* Total Limit */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-xl p-3" style={{ background: c.card, border: `1px solid ${c.border}` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet size={14} style={{ color: c.textMuted }} />
              <span className="text-[10px] font-medium" style={{ color: c.textMuted }}>
                {t('cc.totalLimit', 'Total Credit Limit')}
              </span>
            </div>
            <p className="text-sm font-bold" style={{ color: c.text }}>{formatINR(totalLimit)}</p>
          </motion.div>

          {/* Total Outstanding */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-xl p-3" style={{ background: c.card, border: `1px solid ${c.border}` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={14} style={{ color: c.textMuted }} />
              <span className="text-[10px] font-medium" style={{ color: c.textMuted }}>
                {t('cc.totalOutstanding', 'Total Outstanding')}
              </span>
            </div>
            <p className="text-sm font-bold" style={{ color: totalOutstanding > 0 ? '#ef4444' : c.text }}>
              {formatINR(totalOutstanding)}
            </p>
          </motion.div>

          {/* Overall Utilization */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="rounded-xl p-3" style={{ background: c.card, border: `1px solid ${c.border}` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={14} style={{ color: c.textMuted }} />
              <span className="text-[10px] font-medium" style={{ color: c.textMuted }}>
                {t('cc.overallUtil', 'Overall Utilization')}
              </span>
            </div>
            <p className="text-sm font-bold" style={{ color: utilColor(overallUtil) }}>
              {overallUtil}%
            </p>
          </motion.div>

          {/* Cards Due This Week */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="rounded-xl p-3" style={{ background: c.card, border: `1px solid ${c.border}` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={14} style={{ color: c.textMuted }} />
              <span className="text-[10px] font-medium" style={{ color: c.textMuted }}>
                {t('cc.dueThisWeek', 'Due This Week')}
              </span>
            </div>
            <p className="text-sm font-bold" style={{ color: cardsDueThisWeek > 0 ? '#eab308' : c.text }}>
              {cardsDueThisWeek}
            </p>
          </motion.div>
        </div>

        {/* ── CIBIL Integration Banner ────────────────────── */}
        {(() => {
          const cibil = getCibilProfile();
          if (!cibil?.score || cards.length === 0) return null;
          const target = overallUtil > 30;
          return (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
              className="rounded-xl p-3 mb-4 flex items-center justify-between"
              style={{ background: target ? '#ef444410' : '#22c55e10', border: `1px solid ${target ? '#ef444430' : '#22c55e30'}` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-black" style={{ color: target ? '#ef4444' : '#22c55e' }}>CIBIL: {cibil.score}</span>
                <span className="text-[10px]" style={{ color: c.textSecondary }}>
                  {target
                    ? t('cc.cibilWarning', 'Utilization {{util}}% — keep below 30% for better score', { util: overallUtil })
                    : t('cc.cibilGood', 'Utilization {{util}}% — good for CIBIL', { util: overallUtil })}
                </span>
              </div>
              <button onClick={() => navigate('/cibil-score')} className="text-[10px] font-bold text-brand-blue">
                {t('cc.viewCibil', 'View')} →
              </button>
            </motion.div>
          );
        })()}

        {/* ── Alert Banner ────────────────────────────────── */}
        {priorityAlerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="rounded-xl p-3 mb-4 space-y-2"
            style={{ background: c.card, border: `1px solid ${c.border}` }}
          >
            <div className="flex items-center gap-1.5">
              <Bell size={14} style={{ color: '#eab308' }} />
              <span className="text-xs font-semibold" style={{ color: c.text }}>
                {t('cc.alerts', 'Alerts')}
              </span>
            </div>
            {priorityAlerts.map((alert) => (
              <div key={alert.key} className="flex items-start gap-2">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" style={{ color: alertColor(alert.type) }} />
                <span className="text-[11px] leading-tight" style={{ color: c.textSecondary }}>
                  {alert.text}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Sort Bar ────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpDown size={13} style={{ color: c.textMuted }} />
          <span className="text-[10px] font-medium" style={{ color: c.textMuted }}>
            {t('cc.sortBy', 'Sort by')}:
          </span>
          <div className="flex gap-1 flex-1 overflow-x-auto">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortKey(opt.key)}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors"
                style={{
                  background: sortKey === opt.key ? '#3b82f6' : c.border,
                  color: sortKey === opt.key ? '#fff' : c.textSecondary,
                }}
              >
                {t(opt.labelKey, opt.fallback)}
              </button>
            ))}
          </div>
        </div>

        {/* ── Card List ───────────────────────────────────── */}
        {sorted.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-3"
          >
            <CreditCard size={40} style={{ color: c.textMuted }} />
            <p className="text-sm" style={{ color: c.textMuted }}>
              {t('cc.noCards', 'No credit cards added yet')}
            </p>
            <button
              onClick={() => navigate('/expenses/credit-cards/add')}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white"
              style={{ background: '#3b82f6' }}
            >
              {t('cc.addFirst', 'Add Your First Card')}
            </button>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {sorted.map((card, idx) => {
              const util = getUtilization(card.currentBalance, card.creditLimit);
              const barColor = getUtilizationBarColor(util);
              const daysLeft = getDaysUntilDue(card.dueDate);
              const urgency = getDueUrgency(daysLeft);

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * idx }}
                  onClick={() => navigate(`/expenses/credit-cards/${card.id}`)}
                  className="rounded-xl p-3 cursor-pointer active:scale-[0.98] transition-transform"
                  style={{ background: c.card, border: `1px solid ${c.border}` }}
                >
                  {/* Row 1: Name + network + bank */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-8 h-5 rounded flex items-center justify-center shrink-0"
                        style={{ background: card.cardColor }}
                      >
                        <span className="text-[8px] text-white font-bold">
                          {card.last4Digits || '••••'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: c.text }}>
                          {card.cardName}
                        </p>
                        <p className="text-[10px] truncate" style={{ color: c.textMuted }}>
                          {card.bankName} {card.cardNetwork}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: c.textMuted }} />
                  </div>

                  {/* Row 2: Balance / Limit + utilization bar */}
                  <div className="mb-2">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[11px] font-medium" style={{ color: c.textSecondary }}>
                        {formatINR(card.currentBalance)}
                        <span style={{ color: c.textMuted }}> / {formatINR(card.creditLimit)}</span>
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: barColor }}>
                        {util}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: c.border }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(util, 100)}%`, background: barColor }}
                      />
                    </div>
                  </div>

                  {/* Row 3: Due date + Min Due + APR */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]">{urgency.emoji}</span>
                      <span className="text-[10px] font-medium" style={{ color: urgency.color }}>
                        {daysLeft === 0
                          ? t('cc.dueToday', 'Due Today')
                          : daysLeft === 1
                            ? t('cc.dueTomorrow', 'Due Tomorrow')
                            : t('cc.dueInDays', '{{days}}d left', { days: daysLeft })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px]" style={{ color: c.textMuted }}>
                        {t('cc.minDue', 'Min')}: {formatINR(card.minimumDue)}
                      </span>
                      <span className="text-[10px]" style={{ color: c.textMuted }}>
                        {t('cc.apr', 'APR')}: {card.annualInterestRate}%
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add Card FAB ──────────────────────────────────── */}
      <motion.button
        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
        onClick={() => navigate('/expenses/credit-cards/add')}
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-30"
        style={{ background: '#3b82f6' }}
        whileTap={{ scale: 0.9 }}
      >
        <Plus size={24} color="#fff" />
      </motion.button>
    </div>
  );
}
