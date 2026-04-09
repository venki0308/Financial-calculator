import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Pencil, Trash2, RefreshCw, X, Wallet,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '../theme/useAppColors';

import type { BankAccount, AccountType } from '../types/expense';
import { ACCOUNT_TYPE_LABELS } from '../types/expense';

import {
  getAllAccounts, saveAccount, deleteAccount, generateAccountId,
} from '../utils/expenseStorage';
import { fmtINR } from '../utils/expenseCalculations';
import { todayStr } from '../utils/dateUtils';

// ── account type chips ────────────────────────────────────────
const ACCOUNT_TYPES: AccountType[] = [
  'savings', 'current', 'salary', 'fixed_deposit', 'wallet', 'cash', 'credit_card',
];

// ── preset colors ─────────────────────────────────────────────
const PRESET_COLORS = [
  '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899',
];

// ── helpers ───────────────────────────────────────────────────
const blankForm = (): Omit<BankAccount, 'id' | 'createdAt'> => ({
  name: '',
  accountType: 'savings',
  bankName: '',
  lastFourDigits: '',
  manualBalance: 0,
  balanceDate: todayStr(),
  creditLimit: undefined,
  color: PRESET_COLORS[0],
  icon: ACCOUNT_TYPE_LABELS.savings.icon,
  isActive: true,
});

// ── overlay backdrop ──────────────────────────────────────────
const Backdrop = ({ onClick }: { onClick: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClick}
    className="fixed inset-0 z-40 bg-black/40"
  />
);

// ── bottom sheet wrapper ──────────────────────────────────────
function BottomSheet({
  open, onClose, children,
}: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const c = useAppColors();
  return (
    <AnimatePresence>
      {open && (
        <>
          <Backdrop onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[428px] z-50 rounded-t-3xl max-h-[90dvh] overflow-y-auto"
            style={{ backgroundColor: c.card }}
          >
            {/* handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ backgroundColor: c.border }} />
            </div>
            <div className="px-5 pb-8 pt-2">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function BankAccounts() {
  const { t } = useTranslation();
  const c = useAppColors();
  const navigate = useNavigate();

  // ── accounts state ──────────────────────────────────────────
  const [accounts, setAccounts] = useState<BankAccount[]>(() => getAllAccounts());
  const reload = useCallback(() => setAccounts(getAllAccounts()), []);

  // ── sheet visibility ────────────────────────────────────────
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [updateBalanceId, setUpdateBalanceId] = useState<string | null>(null);

  // ── form state ──────────────────────────────────────────────
  const [form, setForm] = useState(blankForm());

  // ── net worth calculation ───────────────────────────────────
  const netWorth = useMemo(() => {
    let savingsTotal = 0;
    let creditUsed = 0;
    accounts.forEach(a => {
      if (a.accountType === 'credit_card') {
        creditUsed += a.manualBalance;
      } else {
        savingsTotal += a.manualBalance;
      }
    });
    return { savingsTotal, creditUsed, net: savingsTotal - creditUsed };
  }, [accounts]);

  // ── open add sheet ──────────────────────────────────────────
  const openAdd = () => {
    setForm(blankForm());
    setEditingId(null);
    setShowAdd(true);
  };

  // ── open edit sheet ─────────────────────────────────────────
  const openEdit = (acc: BankAccount) => {
    setForm({
      name: acc.name,
      accountType: acc.accountType,
      bankName: acc.bankName,
      lastFourDigits: acc.lastFourDigits ?? '',
      manualBalance: acc.manualBalance,
      balanceDate: acc.balanceDate,
      creditLimit: acc.creditLimit,
      color: acc.color,
      icon: acc.icon,
      isActive: acc.isActive,
    });
    setEditingId(acc.id);
    setShowAdd(true);
  };

  // ── save account ────────────────────────────────────────────
  const handleSaveAccount = () => {
    if (!form.name.trim()) return;
    const now = new Date().toISOString();
    const acc: BankAccount = {
      id: editingId ?? generateAccountId(),
      ...form,
      icon: ACCOUNT_TYPE_LABELS[form.accountType].icon,
      createdAt: editingId
        ? (accounts.find(a => a.id === editingId)?.createdAt ?? now)
        : now,
    };
    saveAccount(acc);
    reload();
    setShowAdd(false);
    setEditingId(null);
  };

  // ── delete account ──────────────────────────────────────────
  const handleDelete = (id: string) => {
    deleteAccount(id);
    reload();
  };

  // ── update balance ──────────────────────────────────────────
  const [newBalance, setNewBalance] = useState(0);
  const [newBalanceDate, setNewBalanceDate] = useState(todayStr());

  const openUpdateBalance = (acc: BankAccount) => {
    setNewBalance(acc.manualBalance);
    setNewBalanceDate(todayStr());
    setUpdateBalanceId(acc.id);
  };

  const handleUpdateBalance = () => {
    if (!updateBalanceId) return;
    const acc = accounts.find(a => a.id === updateBalanceId);
    if (!acc) return;
    saveAccount({ ...acc, manualBalance: newBalance, balanceDate: newBalanceDate });
    reload();
    setUpdateBalanceId(null);
  };

  const updatingAccount = accounts.find(a => a.id === updateBalanceId);

  // ── card style ──────────────────────────────────────────────
  const cardCls = 'rounded-2xl border';

  return (
    <div
      className="min-h-dvh animate-fade-in"
      style={{ backgroundColor: c.bg }}
    >
      {/* ═══ HEADER ═══ */}
      <div
        className="sticky top-0 z-30 border-b"
        style={{
          backgroundColor: c.navBg,
          borderColor: c.border,
          paddingTop: 'calc(env(safe-area-inset-top, 24px) + 0px)',
        }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl border"
              style={{ backgroundColor: c.card, borderColor: c.border, color: c.text }}
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-bold" style={{ color: c.text }}>
              {t('expenses.myAccounts')}
            </h1>
          </div>
          <button
            onClick={openAdd}
            className="p-2 rounded-xl bg-brand-purple text-white"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-8 space-y-4">

        {/* ═══ NET WORTH CARD ═══ */}
        <div
          className={`${cardCls} p-5`}
          style={{
            background: `linear-gradient(135deg, #8B5CF6, #3B82F6)`,
            borderColor: 'transparent',
          }}
        >
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
            {t('expenses.totalNetWorth')}
          </p>
          <p className="text-white text-2xl font-bold mb-4">
            {fmtINR(netWorth.net)}
          </p>
          <div className="flex gap-4">
            <div>
              <p className="text-white/60 text-[10px] uppercase">{t('expenses.savingsTotal')}</p>
              <p className="text-white text-sm font-bold">{fmtINR(netWorth.savingsTotal)}</p>
            </div>
            <div>
              <p className="text-white/60 text-[10px] uppercase">{t('expenses.creditUsed')}</p>
              <p className="text-red-200 text-sm font-bold">{fmtINR(netWorth.creditUsed)}</p>
            </div>
            <div>
              <p className="text-white/60 text-[10px] uppercase">{t('expenses.netTotal')}</p>
              <p className="text-emerald-200 text-sm font-bold">{fmtINR(netWorth.net)}</p>
            </div>
          </div>
        </div>

        {/* ═══ ACCOUNTS LIST ═══ */}
        {accounts.length === 0 && (
          <div className="text-center py-12">
            <Wallet size={40} className="mx-auto mb-3" style={{ color: c.textMuted }} />
            <p className="text-sm font-medium" style={{ color: c.textSecondary }}>
              {t('expenses.noAccounts')}
            </p>
          </div>
        )}

        {accounts.map(acc => {
          const typeInfo = ACCOUNT_TYPE_LABELS[acc.accountType];
          const isCreditCard = acc.accountType === 'credit_card';
          const utilization = isCreditCard && acc.creditLimit
            ? Math.round((acc.manualBalance / acc.creditLimit) * 100)
            : 0;
          const availableCredit = isCreditCard && acc.creditLimit
            ? acc.creditLimit - acc.manualBalance
            : 0;

          return (
            <motion.div
              key={acc.id}
              layout
              className={`${cardCls} overflow-hidden`}
              style={{ backgroundColor: c.card, borderColor: c.border }}
            >
              {/* Color accent strip */}
              <div className="h-1" style={{ backgroundColor: acc.color }} />

              <div className="p-4">
                {/* Top row: icon + name + type */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ backgroundColor: acc.color + '20' }}
                    >
                      {typeInfo.icon}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: c.text }}>
                        {acc.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: acc.color + '20', color: acc.color }}
                        >
                          {typeInfo.label}
                        </span>
                        {acc.bankName && (
                          <span className="text-[10px]" style={{ color: c.textSecondary }}>
                            {acc.bankName}
                          </span>
                        )}
                        {acc.lastFourDigits && (
                          <span className="text-[10px]" style={{ color: c.textMuted }}>
                            ****{acc.lastFourDigits}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance */}
                <div className="mb-3">
                  <p className="text-[10px] uppercase font-semibold" style={{ color: c.textSecondary }}>
                    {isCreditCard ? t('expenses.amountUsed') : t('expenses.balance')}
                  </p>
                  <p className="text-xl font-bold" style={{ color: c.text }}>
                    {fmtINR(acc.manualBalance)}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: c.textMuted }}>
                    {t('expenses.asOf')} {new Date(acc.balanceDate + 'T00:00:00').toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Credit card extras */}
                {isCreditCard && acc.creditLimit != null && acc.creditLimit > 0 && (
                  <div
                    className="rounded-xl p-3 mb-3 space-y-2"
                    style={{ backgroundColor: c.inputBg }}
                  >
                    <div className="flex justify-between text-xs">
                      <span style={{ color: c.textSecondary }}>{t('expenses.creditLimit')}</span>
                      <span className="font-bold" style={{ color: c.text }}>{fmtINR(acc.creditLimit)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: c.textSecondary }}>{t('expenses.available')}</span>
                      <span className="font-bold text-emerald-500">{fmtINR(availableCredit)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: c.textSecondary }}>{t('expenses.utilization')}</span>
                      <span
                        className={`font-bold ${
                          utilization > 75 ? 'text-red-500'
                            : utilization > 50 ? 'text-amber-500'
                            : 'text-emerald-500'
                        }`}
                      >
                        {utilization}%
                      </span>
                    </div>
                    {/* Utilization bar */}
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: c.border }}>
                      <div
                        className={`h-full rounded-full transition-all ${
                          utilization > 75 ? 'bg-red-500'
                            : utilization > 50 ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openUpdateBalance(acc)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border"
                    style={{ borderColor: c.border, color: c.textSecondary }}
                  >
                    <RefreshCw size={12} /> {t('expenses.updateBalance')}
                  </button>
                  <button
                    onClick={() => openEdit(acc)}
                    className="p-2 rounded-xl border"
                    style={{ borderColor: c.border, color: c.textSecondary }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(t('expenses.deleteAccountConfirm', 'Are you sure you want to delete this account?'))) {
                        handleDelete(acc.id);
                      }
                    }}
                    className="p-2 rounded-xl border text-red-400"
                    style={{ borderColor: c.border }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════
           ADD / EDIT ACCOUNT BOTTOM SHEET
         ═══════════════════════════════════════════════════════════ */}
      <BottomSheet open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: c.text }}>
            {editingId ? t('expenses.editAccount') : t('expenses.addAccount')}
          </h2>
          <button
            onClick={() => { setShowAdd(false); setEditingId(null); }}
            className="p-1 rounded-lg"
            style={{ color: c.textSecondary }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Account Name */}
          <div>
            <label className="text-xs font-semibold uppercase mb-1.5 block" style={{ color: c.textSecondary }}>
              {t('expenses.accountName')}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder={t('expenses.accountNamePlaceholder')}
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
              style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }}
            />
          </div>

          {/* Account Type Chips */}
          <div>
            <label className="text-xs font-semibold uppercase mb-2 block" style={{ color: c.textSecondary }}>
              {t('expenses.accountType')}
            </label>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_TYPES.map(at => {
                const info = ACCOUNT_TYPE_LABELS[at];
                const selected = form.accountType === at;
                return (
                  <button
                    key={at}
                    onClick={() => setForm(p => ({
                      ...p,
                      accountType: at,
                      icon: info.icon,
                      creditLimit: at === 'credit_card' ? (p.creditLimit ?? 0) : undefined,
                    }))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      selected
                        ? 'bg-brand-purple text-white border-brand-purple'
                        : ''
                    }`}
                    style={selected ? {} : { borderColor: c.border, color: c.textSecondary }}
                  >
                    {info.icon} {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bank Name */}
          <div>
            <label className="text-xs font-semibold uppercase mb-1.5 block" style={{ color: c.textSecondary }}>
              {t('expenses.bankName')}
            </label>
            <input
              type="text"
              value={form.bankName}
              onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))}
              placeholder={t('expenses.bankNamePlaceholder')}
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
              style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }}
            />
          </div>

          {/* Last 4 digits */}
          <div>
            <label className="text-xs font-semibold uppercase mb-1.5 block" style={{ color: c.textSecondary }}>
              {t('expenses.lastFourDigits')}
            </label>
            <input
              type="text"
              maxLength={4}
              value={form.lastFourDigits ?? ''}
              onChange={e => setForm(p => ({ ...p, lastFourDigits: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              placeholder="1234"
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
              style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }}
            />
          </div>

          {/* Current Balance */}
          <div>
            <label className="text-xs font-semibold uppercase mb-1.5 block" style={{ color: c.textSecondary }}>
              {t('expenses.currentBalance')}
            </label>
            <div
              className="flex items-center gap-2 px-4 py-3 rounded-xl border focus-within:ring-2 focus-within:ring-purple-500/40 transition-all"
              style={{ backgroundColor: c.inputBg, borderColor: c.border }}
            >
              <span className="text-brand-purple font-bold">{'\u20B9'}</span>
              <input
                type="number"
                inputMode="numeric"
                value={form.manualBalance || ''}
                onChange={e => setForm(p => ({ ...p, manualBalance: Number(e.target.value) }))}
                placeholder="0"
                className="flex-1 bg-transparent text-sm font-bold outline-none"
                style={{ color: c.text }}
              />
            </div>
          </div>

          {/* Balance Date */}
          <div>
            <label className="text-xs font-semibold uppercase mb-1.5 block" style={{ color: c.textSecondary }}>
              {t('expenses.balanceDate')}
            </label>
            <input
              type="date"
              value={form.balanceDate}
              onChange={e => setForm(p => ({ ...p, balanceDate: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
              style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }}
            />
          </div>

          {/* Credit Limit (credit card only) */}
          {form.accountType === 'credit_card' && (
            <div>
              <label className="text-xs font-semibold uppercase mb-1.5 block" style={{ color: c.textSecondary }}>
                {t('expenses.creditLimit')}
              </label>
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl border focus-within:ring-2 focus-within:ring-purple-500/40 transition-all"
                style={{ backgroundColor: c.inputBg, borderColor: c.border }}
              >
                <span className="text-brand-purple font-bold">{'\u20B9'}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.creditLimit || ''}
                  onChange={e => setForm(p => ({ ...p, creditLimit: Number(e.target.value) }))}
                  placeholder="0"
                  className="flex-1 bg-transparent text-sm font-bold outline-none"
                  style={{ color: c.text }}
                />
              </div>
            </div>
          )}

          {/* Color Picker */}
          <div>
            <label className="text-xs font-semibold uppercase mb-2 block" style={{ color: c.textSecondary }}>
              {t('expenses.color')}
            </label>
            <div className="flex gap-3">
              {PRESET_COLORS.map(pc => (
                <button
                  key={pc}
                  onClick={() => setForm(p => ({ ...p, color: pc }))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    form.color === pc ? 'scale-110 ring-2 ring-offset-2 ring-purple-500' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: pc }}
                />
              ))}
            </div>
          </div>

          {/* Save Button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSaveAccount}
            disabled={!form.name.trim()}
            className="w-full py-4 rounded-2xl font-bold text-sm bg-brand-purple text-white shadow-lg shadow-brand-purple/30 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            {editingId ? t('expenses.saveChanges') : t('expenses.addAccount')}
          </motion.button>
        </div>
      </BottomSheet>

      {/* ═══════════════════════════════════════════════════════════
           UPDATE BALANCE BOTTOM SHEET
         ═══════════════════════════════════════════════════════════ */}
      <BottomSheet open={!!updateBalanceId} onClose={() => setUpdateBalanceId(null)}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: c.text }}>
            {t('expenses.updateBalance')}
          </h2>
          <button
            onClick={() => setUpdateBalanceId(null)}
            className="p-1 rounded-lg"
            style={{ color: c.textSecondary }}
          >
            <X size={20} />
          </button>
        </div>

        {updatingAccount && (
          <div className="space-y-4">
            {/* Account info */}
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ backgroundColor: c.inputBg }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ backgroundColor: updatingAccount.color + '20' }}
              >
                {ACCOUNT_TYPE_LABELS[updatingAccount.accountType].icon}
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: c.text }}>
                  {updatingAccount.name}
                </p>
                <p className="text-[10px]" style={{ color: c.textSecondary }}>
                  {updatingAccount.bankName}
                  {updatingAccount.lastFourDigits ? ` ****${updatingAccount.lastFourDigits}` : ''}
                </p>
              </div>
            </div>

            {/* New Balance */}
            <div>
              <label className="text-xs font-semibold uppercase mb-1.5 block" style={{ color: c.textSecondary }}>
                {t('expenses.newBalance')}
              </label>
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-xl border focus-within:ring-2 focus-within:ring-purple-500/40 transition-all"
                style={{ backgroundColor: c.inputBg, borderColor: c.border }}
              >
                <span className="text-brand-purple font-bold">{'\u20B9'}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={newBalance || ''}
                  onChange={e => setNewBalance(Number(e.target.value))}
                  placeholder="0"
                  className="flex-1 bg-transparent text-sm font-bold outline-none"
                  style={{ color: c.text }}
                />
              </div>
            </div>

            {/* As of Date */}
            <div>
              <label className="text-xs font-semibold uppercase mb-1.5 block" style={{ color: c.textSecondary }}>
                {t('expenses.asOfDate')}
              </label>
              <input
                type="date"
                value={newBalanceDate}
                onChange={e => setNewBalanceDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                style={{ backgroundColor: c.inputBg, borderColor: c.border, color: c.text }}
              />
            </div>

            {/* Update Button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleUpdateBalance}
              className="w-full py-4 rounded-2xl font-bold text-sm bg-brand-purple text-white shadow-lg shadow-brand-purple/30 transition-all"
            >
              {t('expenses.updateBalance')}
            </motion.button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
