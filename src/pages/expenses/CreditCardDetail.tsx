import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, CreditCard, Trash2, Edit3, AlertTriangle,
  CheckCircle2, Clock, Shield, Gift, TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../../theme/useAppColors';
import { formatINR } from '../../utils/calculations';
import { getCreditCardById, deleteCreditCard } from '../../utils/creditCardStorage';
import {
  getUtilization, getUtilizationBarColor, getUtilizationLabel,
  getDailyInterest, getPeriodInterest, getGSTOnInterest,
  getTrueCost, getMinimumDue, getPayoffMonths, getTotalInterest,
  getAnnualFeeROI, getDaysUntilDue, getDueUrgency,
  type CCCard,
} from '../../utils/creditCardCalculations';

// ── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      {icon}
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color }}>{title}</h3>
    </div>
  );
}

function StatBox({ label, value, sub, color, bg }: { label: string; value: string; sub?: string; color: string; bg: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: 10, background: bg }}>
      <div style={{ fontSize: 11, color, opacity: 0.7, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color, opacity: 0.6, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CreditCardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const c = useAppColors();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [daysSincePayment, setDaysSincePayment] = useState(30);
  const [customPayment, setCustomPayment] = useState(0);

  const card: CCCard | null = useMemo(() => (id ? getCreditCardById(id) : null), [id]);

  // Derived calculations
  const calc = useMemo(() => {
    if (!card) return null;
    const util = getUtilization(card.currentBalance, card.creditLimit);
    const utilLabel = getUtilizationLabel(util);
    const utilBarColor = getUtilizationBarColor(util);
    const available = Math.max(0, card.creditLimit - card.currentBalance);
    const dailyInt = getDailyInterest(card.currentBalance, card.annualInterestRate);
    const minDue = card.minimumDue > 0 ? card.minimumDue : getMinimumDue(card.currentBalance, card.annualInterestRate);
    const stmtBal = card.statementBalance > 0 ? card.statementBalance : card.currentBalance;

    // Payment option 1 — Minimum only
    const minPayoffMonths = getPayoffMonths(card.currentBalance, card.annualInterestRate, minDue);
    const minTotalInterest = getTotalInterest(card.currentBalance, card.annualInterestRate, minDue);

    // Interest calculator
    const interestCalc = getTrueCost(card.currentBalance, card.annualInterestRate, daysSincePayment);

    // Interest-free status
    const dueDay = card.dueDate;
    const stmtDay = card.statementDate;
    const daysUntilDue = getDaysUntilDue(dueDay);
    const dueUrgency = getDueUrgency(daysUntilDue);
    const interestFreeDays = Math.max(0, daysUntilDue);

    // Annual fee ROI
    const feeROI = getAnnualFeeROI(card);

    // Reward points
    const rewardValue = card.pendingRewardPoints * card.rewardValuePerPoint;
    const rewardExpiry = card.rewardExpiryDate
      ? Math.ceil((new Date(card.rewardExpiryDate).getTime() - Date.now()) / 86400000)
      : null;

    return {
      util, utilLabel, utilBarColor, available, dailyInt, minDue, stmtBal,
      minPayoffMonths, minTotalInterest, interestCalc, daysUntilDue, dueUrgency,
      interestFreeDays, stmtDay, feeROI, rewardValue, rewardExpiry,
    };
  }, [card, daysSincePayment]);

  // Custom payment derived
  const customCalc = useMemo(() => {
    if (!card || !calc) return null;
    const pay = customPayment || calc.minDue;
    const months = getPayoffMonths(card.currentBalance, card.annualInterestRate, pay);
    const interest = getTotalInterest(card.currentBalance, card.annualInterestRate, pay);
    const savingsVsMin = calc.minTotalInterest === Infinity ? Infinity : calc.minTotalInterest - interest;
    return { months, interest, savingsVsMin };
  }, [card, calc, customPayment]);

  // Init custom slider on first calc
  useMemo(() => {
    if (calc && customPayment === 0) setCustomPayment(calc.minDue);
  }, [calc?.minDue]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    deleteCreditCard(id);
    navigate('/expenses', { replace: true });
  }, [id, navigate]);

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!card || !calc) {
    return (
      <div style={{ minHeight: '100vh', background: c.bg, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <CreditCard size={48} color={c.textMuted} />
        <p style={{ color: c.textSecondary, marginTop: 12 }}>{t('cc.notFound', 'Card not found')}</p>
        <button onClick={() => navigate('/expenses')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
          {t('cc.goBack', 'Go Back')}
        </button>
      </div>
    );
  }

  const sectionBg = c.card;
  const sectionStyle: React.CSSProperties = { background: sectionBg, borderRadius: 14, padding: 16, marginBottom: 14, border: `1px solid ${c.border}` };

  return (
    <div style={{ minHeight: '100vh', background: c.bg, paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: c.navBg, backdropFilter: 'blur(12px)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${c.border}` }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.text, padding: 4 }}>
          <ArrowLeft size={22} />
        </button>
        <h2 style={{ flex: 1, margin: 0, fontSize: 17, fontWeight: 700, color: c.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {card.cardName || t('cc.cardDetail', 'Card Detail')}
        </h2>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* ── Section A: Card Health Overview ──────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Card graphic */}
          <div style={{
            background: `linear-gradient(135deg, ${card.cardColor}, ${card.cardColor}dd)`,
            borderRadius: 16, padding: '20px 20px 16px', color: '#fff', marginBottom: 14,
            boxShadow: `0 4px 20px ${card.cardColor}44`, position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4 }}>{card.bankName}</div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 4, marginBottom: 16 }}>
              **** **** **** {card.last4Digits || '0000'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>{card.cardNetwork}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{t('cc.due', 'Due')}: {calc.daysUntilDue}d</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, opacity: 0.7 }}>{t('cc.balance', 'Balance')}</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{formatINR(card.currentBalance)}</div>
              </div>
            </div>
          </div>

          {/* Live stats */}
          <div style={sectionStyle}>
            <SectionTitle icon={<Shield size={16} color="#3b82f6" />} title={t('cc.cardHealth', 'Card Health')} color={c.text} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <StatBox label={t('cc.limit', 'Limit')} value={formatINR(card.creditLimit)} color={c.text} bg={c.inputBg} />
              <StatBox label={t('cc.available', 'Available')} value={formatINR(calc.available)} color={c.text} bg={c.inputBg} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <StatBox label={t('cc.apr', 'APR')} value={`${card.annualInterestRate}%`} color={c.text} bg={c.inputBg} />
              <StatBox label={t('cc.dailyInterest', 'Daily Interest')} value={formatINR(calc.dailyInt)} sub={t('cc.running', 'running')} color={c.text} bg={c.inputBg} />
            </div>
            {/* Utilization bar */}
            <div style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: c.textSecondary }}>{t('cc.utilization', 'Utilization')}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: calc.utilLabel.color }}>{calc.util}% — {t(calc.utilLabel.labelKey, calc.utilLabel.label)}</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: c.inputBg, overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(calc.util, 100)}%` }} transition={{ duration: 0.6 }} style={{ height: '100%', borderRadius: 4, background: calc.utilBarColor }} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Section B: Payment Planning ─────────────────────────────────────── */}
        <motion.div style={sectionStyle} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <SectionTitle icon={<TrendingUp size={16} color="#22c55e" />} title={t('cc.paymentPlanning', 'Payment Planning')} color={c.text} />

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {/* Option 1 — Minimum */}
            <div style={{ flex: 1, padding: 10, borderRadius: 10, background: c.inputBg, border: '1px solid #ef444444' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>{t('cc.minOnly', 'MINIMUM DUE')}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{formatINR(calc.minDue)}</div>
              <div style={{ fontSize: 10, color: c.textSecondary, marginTop: 4 }}>
                {calc.minPayoffMonths === Infinity
                  ? t('cc.neverPayoff', 'Never pays off')
                  : `${calc.minPayoffMonths} ${t('cc.months', 'months')}`}
              </div>
              <div style={{ fontSize: 10, color: c.textSecondary }}>
                {calc.minTotalInterest === Infinity
                  ? t('cc.infiniteInterest', 'Infinite interest')
                  : `${t('cc.interest', 'Interest')}: ${formatINR(calc.minTotalInterest)}`}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                <AlertTriangle size={10} /> {t('cc.minWarning', 'DEBT TRAP')}
              </div>
            </div>

            {/* Option 2 — Full statement */}
            <div style={{ flex: 1, padding: 10, borderRadius: 10, background: c.inputBg, border: '1px solid #22c55e88' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>{t('cc.fullStmt', 'FULL STATEMENT')}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{formatINR(calc.stmtBal)}</div>
              <div style={{ fontSize: 10, color: '#22c55e', marginTop: 4 }}>{t('cc.noInterest', 'No interest charged')}</div>
              <div style={{ marginTop: 6, background: '#22c55e', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <CheckCircle2 size={10} /> {t('cc.bestOption', 'BEST OPTION')}
              </div>
            </div>
          </div>

          {/* Option 3 — Custom */}
          <div style={{ padding: 12, borderRadius: 10, background: c.inputBg, border: `1px solid ${c.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', marginBottom: 6 }}>{t('cc.customPayment', 'CUSTOM PAYMENT')}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: c.text, marginBottom: 6 }}>{formatINR(customPayment)}</div>
            <input
              type="range"
              min={calc.minDue}
              max={Math.max(calc.stmtBal, calc.minDue + 1)}
              value={customPayment}
              onChange={e => setCustomPayment(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#3b82f6' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: c.textMuted, marginTop: 2 }}>
              <span>{formatINR(calc.minDue)}</span>
              <span>{formatINR(calc.stmtBal)}</span>
            </div>
            {customCalc && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: c.textSecondary }}>{t('cc.payoffIn', 'Payoff in')}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>
                    {customCalc.months === Infinity ? '---' : `${customCalc.months} ${t('cc.months', 'months')}`}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: c.textSecondary }}>{t('cc.totalInterest', 'Total Interest')}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>
                    {customCalc.interest === Infinity ? '---' : formatINR(customCalc.interest)}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: c.textSecondary }}>{t('cc.savings', 'Savings vs min')}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>
                    {customCalc.savingsVsMin === Infinity || customCalc.interest === Infinity ? '---' : formatINR(Math.max(0, customCalc.savingsVsMin))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Section C: Interest Calculator ──────────────────────────────────── */}
        <motion.div style={sectionStyle} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <SectionTitle icon={<Clock size={16} color="#eab308" />} title={t('cc.interestCalc', 'Interest Calculator (Live)')} color={c.text} />

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: c.textSecondary, display: 'block', marginBottom: 4 }}>
              {t('cc.daysSincePayment', 'Days since last payment')}
            </label>
            <input
              type="number"
              min={0}
              max={365}
              value={daysSincePayment}
              onChange={e => setDaysSincePayment(Math.max(0, Number(e.target.value)))}
              style={{ width: 80, padding: '6px 10px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontSize: 14, fontWeight: 600 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatBox label={t('cc.interestAccrued', 'Interest Accrued')} value={formatINR(calc.interestCalc.interest)} color={c.text} bg={c.inputBg} />
            <StatBox label={t('cc.gst18', 'GST @18%')} value={formatINR(calc.interestCalc.gst)} color={c.text} bg={c.inputBg} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <StatBox label={t('cc.totalCharge', 'Total Charge')} value={formatINR(calc.interestCalc.total)} color="#ef4444" bg={c.isDark ? '#ef44441a' : '#fef2f2'} />
            <StatBox label={t('cc.trueAPR', 'True APR (incl GST)')} value={`${calc.interestCalc.trueAPR}%`} color={c.text} bg={c.inputBg} />
          </div>

          {/* Interest-free period */}
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: calc.interestFreeDays > 0 ? (c.isDark ? '#22c55e1a' : '#f0fdf4') : (c.isDark ? '#ef44441a' : '#fef2f2'), display: 'flex', alignItems: 'center', gap: 8 }}>
            {calc.interestFreeDays > 0 ? <CheckCircle2 size={16} color="#22c55e" /> : <AlertTriangle size={16} color="#ef4444" />}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: calc.interestFreeDays > 0 ? '#22c55e' : '#ef4444' }}>
                {calc.interestFreeDays > 0
                  ? t('cc.interestFreeActive', 'Interest-free period active')
                  : t('cc.interestFreeExpired', 'Interest-free period expired')}
              </div>
              <div style={{ fontSize: 10, color: c.textSecondary }}>
                {calc.interestFreeDays > 0
                  ? `${calc.interestFreeDays} ${t('cc.daysRemaining', 'days remaining — pay full to avoid charges')}`
                  : t('cc.interestRunning', 'Interest is being charged on outstanding balance')}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Section D: Annual Fee ROI ──────────────────────────────────────── */}
        <motion.div style={sectionStyle} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <SectionTitle icon={<TrendingUp size={16} color="#8b5cf6" />} title={t('cc.annualFeeROI', 'Annual Fee ROI')} color={c.text} />

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <StatBox label={t('cc.feeWithGST', 'Fee + GST')} value={formatINR(calc.feeROI.feeWithGst)} color={c.text} bg={c.inputBg} />
            <StatBox
              label={t('cc.waiverThreshold', 'Waiver Threshold')}
              value={card.feeWaiverSpend > 0 ? formatINR(card.feeWaiverSpend) : t('cc.na', 'N/A')}
              color={c.text}
              bg={c.inputBg}
            />
          </div>

          {/* Waiver progress */}
          {card.feeWaiverSpend > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: c.textSecondary }}>{t('cc.waiverProgress', 'Waiver Progress')}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: calc.feeROI.feeWaived ? '#22c55e' : '#eab308' }}>
                  {calc.feeROI.feeWaiverProgress}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: c.inputBg, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${calc.feeROI.feeWaiverProgress}%` }}
                  transition={{ duration: 0.6 }}
                  style={{ height: '100%', borderRadius: 3, background: calc.feeROI.feeWaived ? '#22c55e' : '#eab308' }}
                />
              </div>
              <div style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}>
                {formatINR(card.annualSpend)} / {formatINR(card.feeWaiverSpend)}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <StatBox label={t('cc.estRewards', 'Est. Rewards')} value={formatINR(calc.feeROI.estimatedRewards)} color={c.text} bg={c.inputBg} />
            <StatBox
              label={t('cc.netValue', 'Net Value')}
              value={formatINR(calc.feeROI.netValue)}
              color={calc.feeROI.netValue >= 0 ? '#22c55e' : '#ef4444'}
              bg={calc.feeROI.netValue >= 0 ? (c.isDark ? '#22c55e1a' : '#f0fdf4') : (c.isDark ? '#ef44441a' : '#fef2f2')}
            />
          </div>

          {/* Verdict badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8,
            background: calc.feeROI.verdict === 'KEEP' ? '#22c55e' : '#ef4444', color: '#fff', fontWeight: 700, fontSize: 12,
          }}>
            {calc.feeROI.verdict === 'KEEP' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {t('cc.verdict', 'Verdict')}: {calc.feeROI.verdict === 'KEEP' ? t('cc.keep', 'KEEP') : t('cc.review', 'REVIEW')}
          </div>
        </motion.div>

        {/* ── Section E: Reward Points Tracker ───────────────────────────────── */}
        {card.rewardType !== 'none' && (
          <motion.div style={sectionStyle} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <SectionTitle icon={<Gift size={16} color="#eab308" />} title={t('cc.rewardTracker', 'Reward Points Tracker')} color={c.text} />

            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <StatBox
                label={t('cc.pendingPoints', 'Pending Points')}
                value={card.pendingRewardPoints.toLocaleString('en-IN')}
                sub={`${t('cc.worth', 'Worth')} ${formatINR(calc.rewardValue)}`}
                color={c.text}
                bg={c.inputBg}
              />
              <StatBox
                label={t('cc.rewardType', 'Type')}
                value={card.rewardType.charAt(0).toUpperCase() + card.rewardType.slice(1)}
                sub={`${card.baseRewardRate}${card.rewardType === 'cashback' ? '%' : 'x'} ${t('cc.base', 'base')}`}
                color={c.text}
                bg={c.inputBg}
              />
            </div>

            {/* Expiry warning */}
            {calc.rewardExpiry !== null && calc.rewardExpiry > 0 && calc.rewardExpiry < 60 && card.pendingRewardPoints > 0 && (
              <div style={{
                padding: 10, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                background: c.isDark ? '#ef44441a' : '#fef2f2',
              }}>
                <AlertTriangle size={16} color="#ef4444" />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
                    {t('cc.rewardsExpiring', 'Points expiring soon!')}
                  </div>
                  <div style={{ fontSize: 10, color: c.textSecondary }}>
                    {formatINR(calc.rewardValue)} {t('cc.expiresIn', 'expires in')} {calc.rewardExpiry} {t('cc.days', 'days')}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Section F: Actions ─────────────────────────────────────────────── */}
        <motion.div style={sectionStyle} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => navigate(`/expenses/credit-cards/add?edit=${card.id}`)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 10, border: `1px solid ${c.border}`,
                background: c.inputBg, color: c.text, fontWeight: 600, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Edit3 size={16} /> {t('cc.editCard', 'Edit Card')}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #ef444444',
                background: c.isDark ? '#ef44441a' : '#fef2f2', color: '#ef4444', fontWeight: 600, fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Trash2 size={16} /> {t('cc.deleteCard', 'Delete Card')}
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── Delete Confirmation Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 100, background: c.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ background: c.card, borderRadius: 16, padding: 24, maxWidth: 340, width: '100%', textAlign: 'center', border: `1px solid ${c.border}` }}
            >
              <Trash2 size={36} color="#ef4444" style={{ marginBottom: 12 }} />
              <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: c.text }}>
                {t('cc.confirmDelete', 'Delete this card?')}
              </h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: c.textSecondary }}>
                {t('cc.deleteWarning', 'This will permanently remove all data for')} <strong>{card.cardName}</strong>.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${c.border}`, background: c.inputBg, color: c.text, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  {t('cc.cancel', 'Cancel')}
                </button>
                <button
                  onClick={handleDelete}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  {t('cc.confirmDeleteBtn', 'Yes, Delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
