/**
 * Credit Card Calculations — FinCalix
 * All formulas use Indian daily balance method with 18% GST on finance charges.
 */

export interface CCCard {
  id: string;
  cardName: string;
  bankName: string;
  cardNetwork: 'Visa' | 'Mastercard' | 'RuPay' | 'Amex' | 'Diners';
  cardColor: string;
  last4Digits: string;
  creditLimit: number;
  currentBalance: number;
  minimumDue: number;
  statementBalance: number;
  annualInterestRate: number;
  annualFee: number;
  annualFeeMonth: number;
  feeWaiverSpend: number;
  cashAdvanceFee: number;
  forexMarkup: number;
  latePaymentFee: number;
  overLimitFee: number;
  statementDate: number;
  dueDate: number;
  cardOpenedDate: string;
  rewardType: 'cashback' | 'points' | 'miles' | 'none';
  baseRewardRate: number;
  rewardValuePerPoint: number;
  pendingRewardPoints: number;
  rewardExpiryDate?: string;
  annualSpend: number;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

// ─── Daily Balance Interest (Indian Method) ──────────────────────────────────

export function getDailyInterest(balance: number, annualRate: number): number {
  return balance * (annualRate / 100) / 365;
}

export function getPeriodInterest(balance: number, annualRate: number, days: number): number {
  return getDailyInterest(balance, annualRate) * days;
}

export function getGSTOnInterest(interest: number): number {
  return interest * 0.18;
}

export function getTrueCost(balance: number, annualRate: number, days: number) {
  const interest = getPeriodInterest(balance, annualRate, days);
  const gst = getGSTOnInterest(interest);
  const total = interest + gst;
  const trueAPR = Math.round(annualRate * 1.18 * 100) / 100;
  return { interest: Math.round(interest), gst: Math.round(gst), total: Math.round(total), trueAPR };
}

// ─── Minimum Payment (Indian Standard) ───────────────────────────────────────

export function getMinimumDue(balance: number, annualRate: number): number {
  if (balance <= 0) return 0;
  const monthlyInterest = balance * (annualRate / 100) / 12;
  const option1 = balance * 0.05; // 5% of balance (RBI standard)
  const option2 = monthlyInterest + (balance * 0.01); // interest + 1% principal
  return Math.max(Math.ceil(Math.max(option1, option2)), 200); // ₹200 floor per industry standard
}

// ─── Payoff Months ───────────────────────────────────────────────────────────
// Indian CC convention: finance charges carry 18% GST, so the effective monthly
// accrual on a carried balance is `apr/12 * 1.18`. Both single-card (here) and
// multi-card (`runPayoffStrategy`) engines use the same GST-inclusive rate so
// the Detail page and the Payoff Calculator agree on month counts and totals.
const GST_RATE = 1.18;
const PAYOFF_MONTHS_CAP = 1200; // 100 years — anything beyond is "never pays off"

export function getPayoffMonths(balance: number, annualRate: number, monthlyPayment: number): number {
  if (balance <= 0 || monthlyPayment <= 0) return 0;
  const r = (annualRate / 12 / 100) * GST_RATE;
  if (r === 0) return Math.ceil(balance / monthlyPayment);
  if (monthlyPayment <= balance * r) return Infinity;
  const months = Math.ceil(Math.log(monthlyPayment / (monthlyPayment - balance * r)) / Math.log(1 + r));
  return months > PAYOFF_MONTHS_CAP ? Infinity : months;
}

export function getTotalInterest(balance: number, annualRate: number, monthlyPayment: number): number {
  const months = getPayoffMonths(balance, annualRate, monthlyPayment);
  if (months === Infinity || months === 0) return months === Infinity ? Infinity : 0;
  return Math.round((monthlyPayment * months) - balance);
}

// ─── Utilization ─────────────────────────────────────────────────────────────

export function getUtilization(balance: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.round((balance / limit) * 1000) / 10;
}

export function getUtilizationLabel(pct: number): { label: string; labelKey: string; color: string } {
  if (pct < 10) return { label: 'Excellent', labelKey: 'cc.utilExcellent', color: '#22c55e' };
  if (pct < 30) return { label: 'Good', labelKey: 'cc.utilGood', color: '#3b82f6' };
  if (pct < 50) return { label: 'Fair', labelKey: 'cc.utilFair', color: '#eab308' };
  return { label: 'High — CIBIL impact', labelKey: 'cc.utilHigh', color: '#ef4444' };
}

export function getUtilizationBarColor(pct: number): string {
  if (pct < 30) return '#22c55e';
  if (pct < 60) return '#eab308';
  return '#ef4444';
}

// ─── Cash Advance ────────────────────────────────────────────────────────────

export function getCashAdvanceCost(amount: number, feePercent: number, annualRate: number, days: number) {
  if (amount <= 0 || days <= 0) return { fee: 0, feeGst: 0, interest: 0, interestGst: 0, total: 0, effectiveAPR: 0 };
  const fee = Math.round(amount * feePercent / 100);
  const feeGst = Math.round(fee * 0.18);
  const interest = Math.round(getPeriodInterest(amount, annualRate, days));
  const interestGst = Math.round(interest * 0.18);
  const total = fee + feeGst + interest + interestGst;
  // Note: Effective APR includes annualized one-time fee — intentionally shows the shock cost
  const effectiveAPR = Math.round((total / amount) * (365 / days) * 10000) / 100;
  return { fee, feeGst, interest, interestGst, total, effectiveAPR };
}

// ─── Annual Fee ROI ──────────────────────────────────────────────────────────

export function getAnnualFeeROI(card: CCCard) {
  const feeWithGst = Math.round(card.annualFee * 1.18);
  const estimatedRewards = card.rewardType === 'none' ? 0
    : card.rewardType === 'cashback'
      ? Math.round(card.annualSpend * card.baseRewardRate / 100)
      : Math.round((card.annualSpend / 100) * card.baseRewardRate * card.rewardValuePerPoint);
  const netValue = estimatedRewards - feeWithGst;
  const feeWaiverProgress = card.feeWaiverSpend > 0
    ? Math.min(100, Math.round((card.annualSpend / card.feeWaiverSpend) * 100))
    : 100;
  const feeWaived = card.feeWaiverSpend > 0 && card.annualSpend >= card.feeWaiverSpend;
  return { feeWithGst, estimatedRewards, netValue, feeWaiverProgress, feeWaived, verdict: netValue >= 0 ? 'KEEP' : 'REVIEW' };
}

// ─── Multi-Card Payoff Strategies ────────────────────────────────────────────

export interface PayoffCardInput {
  id: string;
  name: string;
  balance: number;
  apr: number;
  minDue: number;
}

export interface PayoffMonthRow {
  month: number;
  payments: Record<string, number>; // cardId -> payment
  balances: Record<string, number>; // cardId -> remaining balance
  totalPaid: number;
  totalInterest: number;
  totalBalance: number;
  cardCleared?: string; // cardId if cleared this month
}

export interface PayoffResult {
  strategy: string;
  totalMonths: number;
  totalInterest: number;
  totalPaid: number;
  payoffOrder: Array<{ id: string; name: string; month: number; interest: number }>;
  schedule: PayoffMonthRow[];
}

function runPayoffStrategy(
  cards: PayoffCardInput[],
  monthlyBudget: number,
  sortFn: (a: PayoffCardInput, b: PayoffCardInput) => number
): PayoffResult {
  if (cards.length === 0 || monthlyBudget <= 0) {
    return { strategy: '', totalMonths: 0, totalInterest: 0, totalPaid: 0, payoffOrder: [], schedule: [] };
  }

  // Clone balances
  const bals: Record<string, number> = {};
  const rates: Record<string, number> = {};
  const mins: Record<string, number> = {};
  const names: Record<string, string> = {};
  const active = new Set<string>();

  for (const c of cards) {
    if (c.balance > 0) {
      bals[c.id] = c.balance;
      rates[c.id] = c.apr;
      mins[c.id] = c.minDue;
      names[c.id] = c.name;
      active.add(c.id);
    }
  }

  const sorted = [...cards].filter(c => c.balance > 0).sort(sortFn);
  const schedule: PayoffMonthRow[] = [];
  const payoffOrder: Array<{ id: string; name: string; month: number; interest: number }> = [];
  let totalInterest = 0;
  let totalPaid = 0;
  const interestPerCard: Record<string, number> = {};
  for (const c of cards) interestPerCard[c.id] = 0;

  for (let month = 1; month <= 600 && active.size > 0; month++) {
    let budget = monthlyBudget;
    const payments: Record<string, number> = {};
    let monthInterest = 0;
    let cardCleared: string | undefined;

    // 1. Accrue interest + 18% GST on all active cards
    for (const id of active) {
      const interest = bals[id] * (rates[id] / 100) / 12;
      const interestWithGst = interest * 1.18; // 18% GST on finance charges
      bals[id] += interestWithGst;
      monthInterest += interestWithGst;
      interestPerCard[id] += interestWithGst;
    }

    // 2. Recalculate minimums based on current balance, then pay minimums
    for (const id of active) {
      const dynamicMin = getMinimumDue(bals[id], rates[id]);
      const minPay = Math.min(dynamicMin, bals[id]);
      payments[id] = minPay;
      bals[id] -= minPay;
      budget -= minPay;
    }

    // 3. Apply extra to priority card
    if (budget > 0) {
      for (const c of sorted) {
        if (!active.has(c.id)) continue;
        const extra = Math.min(budget, bals[c.id]);
        if (extra > 0) {
          payments[c.id] = (payments[c.id] || 0) + extra;
          bals[c.id] -= extra;
          budget -= extra;
        }
        if (budget <= 0) break;
      }
    }

    // 4. Check cleared cards (support multiple clearances per month)
    const toRemove: string[] = [];
    for (const id of active) {
      if (bals[id] <= 1) {
        bals[id] = 0;
        toRemove.push(id);
        if (!cardCleared) cardCleared = id;
        payoffOrder.push({ id, name: names[id], month, interest: Math.round(interestPerCard[id]) });
      }
    }
    for (const id of toRemove) active.delete(id);

    const monthPaid = Object.values(payments).reduce((s, v) => s + v, 0);
    totalPaid += monthPaid;
    totalInterest += monthInterest;

    schedule.push({
      month,
      payments: Object.fromEntries(Object.entries(payments).map(([k, v]) => [k, Math.round(v)])),
      balances: Object.fromEntries(Object.entries(bals).map(([k, v]) => [k, Math.max(0, Math.round(v))])),
      totalPaid: Math.round(monthPaid),
      totalInterest: Math.round(monthInterest),
      totalBalance: Math.round(Object.values(bals).reduce((s, v) => s + Math.max(0, v), 0)),
      cardCleared,
    });
  }

  return {
    strategy: '',
    totalMonths: schedule.length,
    totalInterest: Math.round(totalInterest),
    totalPaid: Math.round(totalPaid),
    payoffOrder,
    schedule,
  };
}

export function calculateAvalanche(cards: PayoffCardInput[], budget: number): PayoffResult {
  const result = runPayoffStrategy(cards, budget, (a, b) => b.apr - a.apr);
  result.strategy = 'avalanche';
  return result;
}

export function calculateSnowball(cards: PayoffCardInput[], budget: number): PayoffResult {
  const result = runPayoffStrategy(cards, budget, (a, b) => a.balance - b.balance);
  result.strategy = 'snowball';
  return result;
}

export function calculateHybrid(cards: PayoffCardInput[], budget: number): PayoffResult {
  const result = runPayoffStrategy(cards, budget, (a, b) => {
    if (Math.abs(a.apr - b.apr) < 2) return a.balance - b.balance;
    return b.apr - a.apr;
  });
  result.strategy = 'hybrid';
  return result;
}

export function calculateEqual(cards: PayoffCardInput[], budget: number): PayoffResult {
  // For equal distribution, modify mins proportionally — clamp to budget
  const totalBalance = cards.reduce((s, c) => s + c.balance, 0);
  if (totalBalance <= 0) return { strategy: 'equal', totalMonths: 0, totalInterest: 0, totalPaid: 0, payoffOrder: [], schedule: [] };
  const rawMins = cards.map(c => Math.max(c.minDue, Math.round(budget * (c.balance / totalBalance))));
  const rawTotal = rawMins.reduce((s, v) => s + v, 0);
  // Normalize so total doesn't exceed budget
  const scale = rawTotal > budget ? budget / rawTotal : 1;
  const adjusted = cards.map((c, i) => ({ ...c, minDue: Math.round(rawMins[i] * scale) }));
  const result = runPayoffStrategy(adjusted, budget, (a, b) => b.apr - a.apr);
  result.strategy = 'equal';
  return result;
}

export function calculateMinimumOnly(cards: PayoffCardInput[]): PayoffResult {
  const totalMin = cards.reduce((s, c) => s + c.minDue, 0);
  const result = runPayoffStrategy(cards, totalMin, (a, b) => b.apr - a.apr);
  result.strategy = 'minimum';
  return result;
}

// ─── Utilization Optimizer ───────────────────────────────────────────────────

export function getOptimalSpendDistribution(
  cards: CCCard[],
  totalMonthlySpend: number,
  targetUtilization: number = 30
): Array<{ id: string; name: string; limit: number; recommendedSpend: number; resultingUtil: number }> {
  const activeCards = cards.filter(c => c.isActive && c.creditLimit > 0);
  const totalLimit = activeCards.reduce((s, c) => s + c.creditLimit, 0);
  if (totalLimit === 0) return [];

  const maxSpend = totalLimit * (targetUtilization / 100);
  const effectiveSpend = Math.min(totalMonthlySpend, maxSpend);

  return activeCards.map(c => {
    const proportion = c.creditLimit / totalLimit;
    const recommended = Math.round(proportion * effectiveSpend);
    const util = Math.round((recommended / c.creditLimit) * 1000) / 10;
    return { id: c.id, name: c.cardName, limit: c.creditLimit, recommendedSpend: recommended, resultingUtil: util };
  }).sort((a, b) => b.limit - a.limit);
}

// ─── Smart Insights Generator ────────────────────────────────────────────────

export interface CCInsight {
  type: 'danger' | 'savings' | 'reward' | 'health';
  text: string;
  key: string;
}

export function generateInsights(cards: CCCard[]): CCInsight[] {
  const insights: CCInsight[] = [];
  const activeCards = cards.filter(c => c.isActive);
  if (activeCards.length === 0) return insights;

  const totalLimit = activeCards.reduce((s, c) => s + c.creditLimit, 0);
  const totalBalance = activeCards.reduce((s, c) => s + c.currentBalance, 0);
  const overallUtil = totalLimit > 0 ? (totalBalance / totalLimit) * 100 : 0;

  // Danger alerts
  for (const c of activeCards) {
    const util = getUtilization(c.currentBalance, c.creditLimit);
    if (util > 75) {
      insights.push({ type: 'danger', text: `${c.cardName} utilization at ${util}% — significant CIBIL score impact.`, key: `high_util_${c.id}` });
    }
    if (c.currentBalance > 0 && c.annualInterestRate > 0) {
      const dailyInt = getDailyInterest(c.currentBalance, c.annualInterestRate);
      if (dailyInt > 50) {
        insights.push({ type: 'danger', text: `${c.cardName} is costing INR ${Math.round(dailyInt)}/day in interest on INR ${c.currentBalance.toLocaleString('en-IN')} balance.`, key: `daily_int_${c.id}` });
      }
    }
  }

  // Savings opportunities
  const cardsWithBalance = activeCards.filter(c => c.currentBalance > 0).sort((a, b) => b.annualInterestRate - a.annualInterestRate);
  if (cardsWithBalance.length >= 2) {
    const highest = cardsWithBalance[0];
    const lowest = cardsWithBalance[cardsWithBalance.length - 1];
    if (highest.annualInterestRate - lowest.annualInterestRate > 5) {
      const savings = Math.round(highest.currentBalance * (highest.annualInterestRate - lowest.annualInterestRate) / 100 / 12);
      insights.push({ type: 'savings', text: `Transfer ${highest.cardName} balance to ${lowest.cardName} (APR ${highest.annualInterestRate}% vs ${lowest.annualInterestRate}%) — saves INR ${savings}/month.`, key: 'bt_opportunity' });
    }
  }

  // Reward alerts
  const totalPendingRewards = activeCards.reduce((s, c) => s + (c.pendingRewardPoints * c.rewardValuePerPoint), 0);
  if (totalPendingRewards > 500) {
    insights.push({ type: 'reward', text: `INR ${Math.round(totalPendingRewards).toLocaleString('en-IN')} in unredeemed rewards across your cards. Consider redeeming.`, key: 'pending_rewards' });
  }

  for (const c of activeCards) {
    if (c.rewardExpiryDate) {
      const daysToExpiry = Math.ceil((new Date(c.rewardExpiryDate).getTime() - Date.now()) / 86400000);
      if (daysToExpiry > 0 && daysToExpiry < 60 && c.pendingRewardPoints > 0) {
        const val = Math.round(c.pendingRewardPoints * c.rewardValuePerPoint);
        insights.push({ type: 'reward', text: `${c.cardName}: INR ${val} in rewards expire in ${daysToExpiry} days. Redeem now!`, key: `expiry_${c.id}` });
      }
    }
  }

  // Credit health
  if (overallUtil < 30) {
    insights.push({ type: 'health', text: `Overall utilization: ${overallUtil.toFixed(1)}% — Good. Below 30% target.`, key: 'overall_util_ok' });
  } else {
    insights.push({ type: 'health', text: `Overall utilization: ${overallUtil.toFixed(1)}% — above 30% target. Consider paying down balances before statement dates.`, key: 'overall_util_high' });
  }

  const oldestCard = activeCards.reduce((oldest, c) => {
    if (!c.cardOpenedDate) return oldest;
    return (!oldest || c.cardOpenedDate < oldest.cardOpenedDate) ? c : oldest;
  }, null as CCCard | null);
  if (oldestCard && oldestCard.cardOpenedDate) {
    const years = Math.floor((Date.now() - new Date(oldestCard.cardOpenedDate).getTime()) / (365.25 * 86400000));
    if (years >= 2) {
      insights.push({ type: 'health', text: `${oldestCard.cardName} (${years}yr credit history) — do not close it. Older accounts boost CIBIL score.`, key: 'oldest_card' });
    }
  }

  return insights;
}

// ─── Days until due ──────────────────────────────────────────────────────────

export function getDaysUntilDue(dueDay: number): number {
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  const target = thisMonth >= today ? thisMonth : nextMonth;
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function getDueUrgency(daysUntil: number): { label: string; color: string; emoji: string } {
  if (daysUntil <= 3) return { label: 'URGENT', color: '#ef4444', emoji: '🔴' };
  if (daysUntil <= 7) return { label: 'DUE SOON', color: '#eab308', emoji: '🟡' };
  return { label: 'UPCOMING', color: '#22c55e', emoji: '🟢' };
}

// ─── CC COMPARE SCENARIOS ─────────────────────────────────────────────────────

export interface SpendProfile {
  groceries: number;
  fuel: number;
  dining: number;
  onlineShopping: number;
  travel: number;
  utilities: number;
  rent: number;
  entertainment: number;
  medical: number;
  other: number;
}

export type CardTypeId = 'cashback' | 'rewards' | 'travel' | 'fuel' | 'lifestyle' | 'shopping' | 'premium' | 'entry' | 'secured' | 'rupay';

interface CardTypeDef {
  id: CardTypeId;
  labelKey: string;
  emoji: string;
  annualFeeRange: [number, number];
  feeWaiverSpend: number;
  baseRate: number;
  boosts: Partial<Record<keyof SpendProfile, number>>;
  excluded: (keyof SpendProfile)[];
  fuelSurchargeWaiver: boolean;
  loungeVisitsPerYear: number;
  milestoneThreshold: number;
  milestoneBonus: number;
  forexMarkup: number;
  minIncome: number;
  minCibil: number;
}

const CARD_TYPES: CardTypeDef[] = [
  { id: 'cashback', labelKey: 'ccCompare.typeCashback', emoji: '💰', annualFeeRange: [0, 500], feeWaiverSpend: 50000, baseRate: 1, boosts: { groceries: 2, onlineShopping: 2 }, excluded: ['rent', 'utilities'], fuelSurchargeWaiver: false, loungeVisitsPerYear: 0, milestoneThreshold: 0, milestoneBonus: 0, forexMarkup: 3.5, minIncome: 15000, minCibil: 650 },
  { id: 'rewards', labelKey: 'ccCompare.typeRewards', emoji: '🎁', annualFeeRange: [500, 2000], feeWaiverSpend: 150000, baseRate: 0.75, boosts: { dining: 3, entertainment: 3, onlineShopping: 2 }, excluded: ['rent', 'utilities'], fuelSurchargeWaiver: false, loungeVisitsPerYear: 2, milestoneThreshold: 200000, milestoneBonus: 2000, forexMarkup: 3.5, minIncome: 30000, minCibil: 700 },
  { id: 'travel', labelKey: 'ccCompare.typeTravel', emoji: '✈️', annualFeeRange: [2500, 10000], feeWaiverSpend: 500000, baseRate: 0.75, boosts: { travel: 5, dining: 2 }, excluded: ['rent', 'utilities'], fuelSurchargeWaiver: false, loungeVisitsPerYear: 8, milestoneThreshold: 400000, milestoneBonus: 5000, forexMarkup: 1.75, minIncome: 75000, minCibil: 750 },
  { id: 'fuel', labelKey: 'ccCompare.typeFuel', emoji: '⛽', annualFeeRange: [0, 500], feeWaiverSpend: 50000, baseRate: 0.5, boosts: { fuel: 3 }, excluded: ['rent', 'utilities'], fuelSurchargeWaiver: true, loungeVisitsPerYear: 0, milestoneThreshold: 0, milestoneBonus: 0, forexMarkup: 3.5, minIncome: 15000, minCibil: 650 },
  { id: 'lifestyle', labelKey: 'ccCompare.typeLifestyle', emoji: '🍽️', annualFeeRange: [500, 3000], feeWaiverSpend: 200000, baseRate: 0.75, boosts: { dining: 5, entertainment: 5 }, excluded: ['rent', 'utilities'], fuelSurchargeWaiver: false, loungeVisitsPerYear: 4, milestoneThreshold: 200000, milestoneBonus: 2500, forexMarkup: 3.5, minIncome: 40000, minCibil: 700 },
  { id: 'shopping', labelKey: 'ccCompare.typeShopping', emoji: '🛒', annualFeeRange: [0, 1500], feeWaiverSpend: 100000, baseRate: 1, boosts: { onlineShopping: 5, groceries: 2 }, excluded: ['rent', 'utilities'], fuelSurchargeWaiver: false, loungeVisitsPerYear: 0, milestoneThreshold: 150000, milestoneBonus: 1500, forexMarkup: 3.5, minIncome: 25000, minCibil: 680 },
  { id: 'premium', labelKey: 'ccCompare.typePremium', emoji: '👑', annualFeeRange: [5000, 15000], feeWaiverSpend: 800000, baseRate: 1.5, boosts: { travel: 3, dining: 3, onlineShopping: 2 }, excluded: ['rent'], fuelSurchargeWaiver: true, loungeVisitsPerYear: 12, milestoneThreshold: 500000, milestoneBonus: 10000, forexMarkup: 2, minIncome: 100000, minCibil: 750 },
  { id: 'entry', labelKey: 'ccCompare.typeEntry', emoji: '🆓', annualFeeRange: [0, 0], feeWaiverSpend: 0, baseRate: 0.5, boosts: {}, excluded: ['rent', 'utilities'], fuelSurchargeWaiver: false, loungeVisitsPerYear: 0, milestoneThreshold: 0, milestoneBonus: 0, forexMarkup: 3.5, minIncome: 12000, minCibil: 0 },
  { id: 'secured', labelKey: 'ccCompare.typeSecured', emoji: '🔒', annualFeeRange: [0, 500], feeWaiverSpend: 0, baseRate: 0.25, boosts: {}, excluded: ['rent', 'utilities'], fuelSurchargeWaiver: false, loungeVisitsPerYear: 0, milestoneThreshold: 0, milestoneBonus: 0, forexMarkup: 3.5, minIncome: 0, minCibil: 0 },
  { id: 'rupay', labelKey: 'ccCompare.typeRuPay', emoji: '🇮🇳', annualFeeRange: [0, 500], feeWaiverSpend: 50000, baseRate: 0.75, boosts: { groceries: 1.5 }, excluded: ['rent', 'utilities'], fuelSurchargeWaiver: false, loungeVisitsPerYear: 4, milestoneThreshold: 0, milestoneBonus: 0, forexMarkup: 99, minIncome: 15000, minCibil: 0 },
];

export function getCardTypes(): CardTypeDef[] { return CARD_TYPES; }

export interface CardTypeResult {
  type: CardTypeDef;
  annualRewardValue: number;
  fuelSurchargeWaiverValue: number;
  loungeValue: number;
  milestoneValue: number;
  annualFee: number;
  netAnnualValue: number;
  breakEvenSpend: number;
  suitabilityScore: number;
  eligible: boolean;
}

export function calcCardTypeResults(
  spend: SpendProfile,
  monthlyIncome: number,
  cibilScore: number,
  domesticFlights: number,
  paysFull: boolean,
  outstandingBalance: number,
  apr: number,
): CardTypeResult[] {
  const totalMonthly = Object.values(spend).reduce((s, v) => s + v, 0);
  const totalAnnual = totalMonthly * 12;

  return CARD_TYPES.map(ct => {
    // Reward value
    let annualRewardValue = 0;
    let eligibleSpend = 0;
    for (const [cat, monthly] of Object.entries(spend) as [keyof SpendProfile, number][]) {
      if (ct.excluded.includes(cat) || monthly <= 0) continue;
      const annual = monthly * 12;
      eligibleSpend += annual;
      const rate = ct.boosts[cat] || ct.baseRate;
      annualRewardValue += annual * (rate / 100);
    }

    // Fuel surcharge waiver (1% on Rs 400-5000 txns, capped Rs 250/cycle × 12)
    const fuelSurchargeWaiverValue = ct.fuelSurchargeWaiver
      ? Math.min(spend.fuel * 12 * 0.01, 250 * 12)
      : 0;

    // Lounge value (Rs 500/visit avg)
    const loungeValue = Math.min(domesticFlights, ct.loungeVisitsPerYear) * 500;

    // Milestone
    const milestoneValue = (ct.milestoneThreshold > 0 && eligibleSpend >= ct.milestoneThreshold)
      ? ct.milestoneBonus : 0;

    // Fee
    const midFee = (ct.annualFeeRange[0] + ct.annualFeeRange[1]) / 2;
    const feeWaived = ct.feeWaiverSpend > 0 && totalAnnual >= ct.feeWaiverSpend;
    const annualFee = feeWaived ? 0 : Math.round(midFee * 1.18);

    // Net value
    let netAnnualValue = annualRewardValue + fuelSurchargeWaiverValue + loungeValue + milestoneValue - annualFee;

    // Interest cost if carrying balance
    let interestCost = 0;
    if (!paysFull && outstandingBalance > 0) {
      interestCost = outstandingBalance * (apr / 100) * 1.18; // Annual interest + GST
      netAnnualValue -= interestCost;
    }

    // Break-even
    const effectiveRate = eligibleSpend > 0 ? annualRewardValue / eligibleSpend : 0;
    const breakEvenSpend = effectiveRate > 0 ? Math.round(annualFee / effectiveRate) : 0;

    // Eligibility
    const eligible = monthlyIncome >= ct.minIncome && (ct.minCibil === 0 || cibilScore === 0 || cibilScore >= ct.minCibil);

    // Suitability score (0-100)
    let score = 0;
    // Income match (15%)
    if (monthlyIncome >= ct.minIncome * 2) score += 15;
    else if (monthlyIncome >= ct.minIncome) score += 10;
    // Spend match (35%) — how well do boosted categories align with user's top spends
    const sortedSpends = Object.entries(spend).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topCats = sortedSpends.map(s => s[0]);
    const boostCats = Object.keys(ct.boosts);
    const matchCount = topCats.filter(c => boostCats.includes(c)).length;
    score += Math.round((matchCount / Math.max(topCats.length, 1)) * 35);
    // Cost efficiency (25%)
    const efficiencyRatio = annualFee > 0 ? annualRewardValue / annualFee : (annualRewardValue > 0 ? 2 : 0.5);
    score += Math.min(25, Math.round(efficiencyRatio * 12.5));
    // Credit match (10%)
    if (ct.minCibil === 0 || cibilScore >= ct.minCibil) score += 10;
    // Travel alignment (15%)
    if (ct.loungeVisitsPerYear > 0 && domesticFlights >= 4) score += 15;
    else if (ct.loungeVisitsPerYear === 0 && domesticFlights < 2) score += 10;
    else score += 5;

    return {
      type: ct,
      annualRewardValue: Math.round(annualRewardValue),
      fuelSurchargeWaiverValue: Math.round(fuelSurchargeWaiverValue),
      loungeValue: Math.round(loungeValue),
      milestoneValue: Math.round(milestoneValue),
      annualFee,
      netAnnualValue: Math.round(netAnnualValue),
      breakEvenSpend,
      suitabilityScore: Math.min(100, Math.max(0, score)),
      eligible,
    };
  }).sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}
