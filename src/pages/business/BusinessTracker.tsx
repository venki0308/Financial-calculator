// ═══════════════════════════════════════════════════════════════
// FINCALIX — BUSINESS TRACKER (list page)
// One card per business with TODAY's income / expense / net.
// Add-business bottom sheet; tap a card → /business-tracker/:bizId
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, ChevronRight, X, Store } from 'lucide-react';
import { useExpenseTheme } from '../../theme/expenseTheme';
import { fmtINR } from '../../utils/expenseCalculations';
import { todayStr } from '../../utils/dateUtils';
import {
  type Business, type BusinessType, type BizEntry,
  BUSINESS_TYPES, BUSINESS_TYPE_META,
  getAllBusinesses, addBusiness, softDeleteBusiness,
  getAllBizEntries, calcBizTotals,
} from '../../utils/businessStorage';
import { AnalyticsService } from '../../lib/analytics';

export default function BusinessTracker() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const et = useExpenseTheme();

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);

  // Add-business form state
  const [name, setName] = useState('');
  const [type, setType] = useState<BusinessType>('restaurant');
  const [customEmoji, setCustomEmoji] = useState('');

  useEffect(() => {
    AnalyticsService.trackScreen('Business_Tracker');
  }, []);

  const businesses = useMemo(() => {
    void refreshKey;
    return getAllBusinesses().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [refreshKey]);

  const today = todayStr();

  const todayTotals = useMemo(() => {
    void refreshKey;
    // Parse the entries blob ONCE and bucket today's entries by businessId
    // (previously one full localStorage parse + scan per business).
    const buckets: Record<string, BizEntry[]> = {};
    for (const e of getAllBizEntries()) {
      if (e.date === today) (buckets[e.businessId] ??= []).push(e);
    }
    const map: Record<string, { income: number; expenses: number; net: number }> = {};
    businesses.forEach(b => {
      map[b.id] = calcBizTotals(buckets[b.id] ?? []);
    });
    return map;
  }, [businesses, today, refreshKey]);

  // Defensive: persisted businesses may carry an unknown/legacy type
  const typeLabel = (tp: BusinessType) => t(`biz.type.${tp}`, BUSINESS_TYPE_META[tp]?.label ?? tp);

  const resetForm = () => {
    setName('');
    setType('restaurant');
    setCustomEmoji('');
  };

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addBusiness({
      name: trimmed,
      type,
      emoji: customEmoji.trim() || BUSINESS_TYPE_META[type].emoji,
    });
    setShowAddSheet(false);
    resetForm();
    refresh();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    softDeleteBusiness(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
  };

  return (
    <div className="min-h-dvh" style={{ backgroundColor: et.bgPrimary }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 pt-14 pb-3"
        style={{ backgroundColor: et.bgPrimary, borderBottom: `1px solid ${et.borderSubtle}` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl"
            style={{ backgroundColor: et.bgCard, border: `1px solid ${et.borderSubtle}` }}
          >
            <ArrowLeft size={18} style={{ color: et.textSecondary }} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold" style={{ color: et.textPrimary }}>
              {t('biz.title', 'Business Tracker')}
            </h1>
            <p className="text-[10px]" style={{ color: et.textSecondary }}>
              {t('biz.subtitle', 'Daily income & expenses per business')}
            </p>
          </div>
          {businesses.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowAddSheet(true)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-white"
              style={{ backgroundColor: et.accentPrimary }}
            >
              <Plus size={14} /> {t('biz.add', 'Add')}
            </motion.button>
          )}
        </div>
      </div>

      <div className="px-4 pb-28 pt-4 space-y-3">
        {/* Empty state */}
        {businesses.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 rounded-2xl"
            style={{ backgroundColor: et.bgCard, boxShadow: et.shadowSoft }}
          >
            <Store size={44} className="mx-auto mb-4" style={{ color: et.accentPrimary }} />
            <h3 className="text-base font-bold mb-2" style={{ color: et.textPrimary }}>
              {t('biz.emptyTitle', 'No businesses yet')}
            </h3>
            <p className="text-xs max-w-[260px] mx-auto mb-6" style={{ color: et.textSecondary }}>
              {t('biz.emptyDesc', 'Track your restaurant, shop or side business — log income and expenses every day and review weekly, monthly and yearly.')}
            </p>
            <button
              onClick={() => setShowAddSheet(true)}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: et.accentPrimary, boxShadow: et.shadowSoft }}
            >
              {t('biz.addBusiness', 'Add Business')}
            </button>
          </motion.div>
        )}

        {/* Business cards */}
        <AnimatePresence mode="popLayout">
          {businesses.map((biz, i) => {
            const totals = todayTotals[biz.id] ?? { income: 0, expenses: 0, net: 0 };
            const netColor = totals.net >= 0 ? et.accentIncome : et.accentExpense;
            return (
              <motion.div
                key={biz.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/business-tracker/${biz.id}`)}
                role="button"
                tabIndex={0}
                className="p-4 rounded-2xl cursor-pointer"
                style={{ backgroundColor: et.bgCard, boxShadow: et.shadowSoft }}
              >
                {/* Header row */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 44, height: 44, borderRadius: 14, fontSize: 22,
                      backgroundColor: et.accentPrimary + '15',
                    }}
                  >
                    {biz.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate" style={{ color: et.textPrimary }}>
                      {biz.name}
                    </h3>
                    <span
                      className="inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: et.accentPrimary + '15', color: et.accentPrimary }}
                    >
                      {typeLabel(biz.type)}
                    </span>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(biz); }}
                    className="p-1.5 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: et.accentExpense + '12', color: et.accentExpense }}
                    aria-label={t('common.delete', 'Delete')}
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>

                {/* Today mini-summary */}
                <p className="text-[9px] uppercase font-bold mb-1.5" style={{ color: et.textMuted }}>
                  {t('biz.today', 'Today')}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: t('biz.income', 'Income'), value: fmtINR(totals.income), color: et.accentIncome },
                    { label: t('biz.expenses', 'Expenses'), value: fmtINR(totals.expenses), color: et.accentExpense },
                    { label: t('biz.net', 'Net'), value: `${totals.net >= 0 ? '+' : '-'}${fmtINR(Math.abs(totals.net))}`, color: netColor },
                  ].map((m, j) => (
                    <div key={j} className="p-2 rounded-lg text-center" style={{ backgroundColor: et.bgPrimary }}>
                      <p className="text-[8px] uppercase font-bold" style={{ color: et.textMuted }}>{m.label}</p>
                      <p className="text-[11px] font-black" style={{ color: m.color, fontVariantNumeric: 'tabular-nums' }}>
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end mt-2.5">
                  <span className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: et.accentPrimary }}>
                    {t('biz.viewDetails', 'View Details')} <ChevronRight size={12} />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── ADD BUSINESS BOTTOM SHEET ── */}
      {createPortal(
        <AnimatePresence>
          {showAddSheet && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-end justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
              onClick={() => setShowAddSheet(false)}
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
                {/* Sheet header */}
                <div className="flex-shrink-0 px-6 pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: et.borderSubtle }} />
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-extrabold text-lg" style={{ color: et.textPrimary }}>
                      {t('biz.addBusiness', 'Add Business')}
                    </h3>
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => setShowAddSheet(false)}
                      className="p-1.5 rounded-full"
                      style={{ backgroundColor: et.borderSubtle, color: et.textSecondary }}
                    >
                      <X size={18} />
                    </motion.button>
                  </div>
                </div>

                {/* Sheet body */}
                <div className="flex-1 overflow-y-auto px-6 pb-3 space-y-5">
                  {/* Name */}
                  <div>
                    <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: et.textMuted }}>
                      {t('biz.businessName', 'Business Name')} *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      maxLength={40}
                      placeholder={t('biz.businessNamePlaceholder', 'e.g. Sri Krishna Restaurant')}
                      className="w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                      style={{ backgroundColor: et.bgCard, border: `1.5px solid ${et.borderSubtle}`, color: et.textPrimary }}
                    />
                  </div>

                  {/* Type (presets emoji) */}
                  <div>
                    <label className="text-[11px] font-semibold mb-2 block" style={{ color: et.textMuted }}>
                      {t('biz.businessType', 'Business Type')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {BUSINESS_TYPES.map(tp => {
                        const active = type === tp;
                        const meta = BUSINESS_TYPE_META[tp];
                        return (
                          <motion.button
                            key={tp}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setType(tp)}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                            style={active
                              ? { backgroundColor: et.accentPrimary, color: '#fff' }
                              : { backgroundColor: et.bgCard, border: `1.5px solid ${et.borderSubtle}`, color: et.textMuted }
                            }
                          >
                            <span style={{ fontSize: 16 }}>{meta.emoji}</span>
                            {typeLabel(tp)}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom emoji (optional) */}
                  <div>
                    <label className="text-[11px] font-semibold mb-1.5 block" style={{ color: et.textMuted }}>
                      {t('biz.customEmoji', 'Custom Emoji (optional)')}
                    </label>
                    <input
                      type="text"
                      value={customEmoji}
                      onChange={e => setCustomEmoji(e.target.value.slice(0, 4))}
                      placeholder={BUSINESS_TYPE_META[type].emoji}
                      className="w-24 px-4 py-2.5 rounded-xl text-lg text-center focus:outline-none"
                      style={{ backgroundColor: et.bgCard, border: `1.5px solid ${et.borderSubtle}`, color: et.textPrimary }}
                    />
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
                    whileTap={name.trim() ? { scale: 0.97 } : {}}
                    onClick={handleAdd}
                    disabled={!name.trim()}
                    className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    style={{ backgroundColor: et.accentPrimary }}
                  >
                    {t('biz.saveBusiness', 'Save Business')}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      {createPortal(
        <AnimatePresence>
          {deleteTarget && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10001] flex items-center justify-center p-4"
              style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
              onClick={() => setDeleteTarget(null)}
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                className="w-full max-w-xs rounded-2xl p-6"
                style={{ backgroundColor: et.bgCard, boxShadow: et.shadowCard }}
                onClick={e => e.stopPropagation()}
              >
                <p className="font-bold text-base mb-2" style={{ color: et.textPrimary }}>
                  {t('biz.deleteBusinessTitle', 'Delete Business?')}
                </p>
                <p className="text-sm mb-5" style={{ color: et.textSecondary }}>
                  {t('biz.deleteBusinessMsg', '"{{name}}" and all its entries will be deleted. This cannot be undone.', { name: deleteTarget.name })}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                    style={{ backgroundColor: et.borderSubtle, color: et.textSecondary }}
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={handleDelete}
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
