/**
 * FinCalix Notification Helper
 * Call from any calculator/module after a successful calculation.
 * Adds a contextual in-app notification and schedules a follow-up.
 */

import { useNotificationStore } from '../store/useNotificationStore';

interface CalcNotifOptions {
 type: 'emi' | 'sip' | 'ppf' | 'fd' | 'rd' | 'nps' | 'epf' | 'tax' | 'gst' | 'ssy' | 'scss' | 'kvp' | 'nsc' | 'pomis' | 'swp' | 'lumpsum' | 'cagr' | 'step_sip' | 'goal_sip' | 'hra' | 'gratuity' | 'salary' | 'breakeven' | 'property' | 'age' | 'general';
 resultSummary?: string; // E.g. "EMI: ₹24,500/mo"
}

const NOTIF_TEMPLATES: Record<string, (summary?: string) => { title: string; body: string; icon: string }> = {
 emi: (s) => ({
 title: '💳 EMI Saved',
 body: `Your loan calculation${s ? ` (${s})` : ''} is saved. Set a reminder to keep monthly EMI funds ready!`,
 icon: '💳',
 }),
 sip: (s) => ({
 title: '📈 SIP Planned',
 body: `Your SIP plan${s ? ` (${s})` : ''} is ready. Consider setting up an auto-debit to stay consistent.`,
 icon: '📈',
 }),
 ppf: (s) => ({
 title: '🏦 PPF Projection Ready',
 body: `Your PPF calculation${s ? ` — ${s}` : ''} is done. PPF deposits by April 5 earn interest for the full month!`,
 icon: '🏦',
 }),
 fd: (s) => ({
 title: '🏛️ FD Maturity Noted',
 body: `Your Fixed Deposit projection${s ? ` (${s})` : ''} is calculated. Review on maturity for reinvestment options.`,
 icon: '🏛️',
 }),
 rd: (s) => ({
 title: '📅 RD Plan Ready',
 body: `Your Recurring Deposit plan${s ? ` (${s})` : ''} is set. Keep deposits on time to avoid penalty.`,
 icon: '📅',
 }),
 nps: (s) => ({
 title: '🎯 NPS Projection Done',
 body: `NPS calculation complete${s ? ` — ${s}` : ''}. NPS contributions qualify for additional ₹50,000 tax deduction under 80CCD(1B).`,
 icon: '🎯',
 }),
 epf: (s) => ({
 title: '🏢 EPF Projection Done',
 body: `EPF calculation complete${s ? ` — ${s}` : ''}. Ensure your employer matches contributions correctly.`,
 icon: '🏢',
 }),
 tax: (s) => ({
 title: '📋 Tax Estimate Ready',
 body: `Your income tax estimate${s ? ` (${s})` : ''} is calculated. Compare Old vs New regime for best savings.`,
 icon: '📋',
 }),
 gst: (s) => ({
 title: '🧾 GST Calculated',
 body: `GST calculation done${s ? ` — ${s}` : ''}. Save this for invoicing purposes.`,
 icon: '🧾',
 }),
 ssy: (s) => ({
 title: '👧 SSY Projection Ready',
 body: `Sukanya Samriddhi${s ? ` (${s})` : ''} calculated. Deposits by April 5 earn interest for the whole month!`,
 icon: '👧',
 }),
 scss: (s) => ({
 title: '👴 SCSS Calculation Done',
 body: `Senior Citizen Savings${s ? ` (${s})` : ''} calculated. Quarterly interest is credited in April, July, October, January.`,
 icon: '👴',
 }),
 kvp: (s) => ({
 title: '💰 KVP Maturity Calculated',
 body: `Kisan Vikas Patra${s ? ` — ${s}` : ''} maturity projected. Money doubles in about 115 months at current rates.`,
 icon: '💰',
 }),
 nsc: (s) => ({
 title: '📜 NSC Calculation Done',
 body: `National Savings Certificate${s ? ` (${s})` : ''} calculated. Interest is reinvested and qualifies for 80C deduction.`,
 icon: '📜',
 }),
 pomis: (s) => ({
 title: '📮 PO MIS Plan Ready',
 body: `PO Monthly Income Scheme${s ? ` (${s})` : ''} projected. Monthly interest helps manage regular expenses.`,
 icon: '📮',
 }),
 swp: (s) => ({
 title: '💸 SWP Plan Calculated',
 body: `Systematic Withdrawal Plan${s ? ` — ${s}` : ''} is ready. Ensure corpus is large enough to sustain withdrawals.`,
 icon: '💸',
 }),
 lumpsum: (s) => ({
 title: '📊 Lumpsum Projection Done',
 body: `Lumpsum investment${s ? ` (${s})` : ''} projected. Consider STPs for large amounts to reduce timing risk.`,
 icon: '📊',
 }),
 cagr: (s) => ({
 title: '📉 CAGR Calculated',
 body: `CAGR analysis${s ? ` — ${s}` : ''} done. Compare across asset classes for informed decisions.`,
 icon: '📉',
 }),
 step_sip: (s) => ({
 title: '📈 Step-Up SIP Planned',
 body: `Step-Up SIP plan${s ? ` (${s})` : ''} calculated. Increasing SIP annually by 10% significantly boosts wealth.`,
 icon: '📈',
 }),
 goal_sip: (s) => ({
 title: '🎯 Goal SIP Set',
 body: `Goal-based SIP${s ? ` (${s})` : ''} is calculated. Align your goal timeline with your investment horizon.`,
 icon: '🎯',
 }),
 hra: (s) => ({
 title: '🏠 HRA Exemption Calculated',
 body: `HRA exemption${s ? ` — ${s}` : ''} calculated. Collect rent receipts and PAN of landlord for amounts above ₹1L/yr.`,
 icon: '🏠',
 }),
 gratuity: (s) => ({
 title: '🎁 Gratuity Estimated',
 body: `Gratuity calculation${s ? ` (${s})` : ''} done. Gratuity is tax-free up to ₹20 Lakhs for private employees.`,
 icon: '🎁',
 }),
 salary: (s) => ({
 title: '💼 Salary Hike Calculated',
 body: `Salary hike projection${s ? ` — ${s}` : ''} ready. Review your revised CTC and tax implications.`,
 icon: '💼',
 }),
 breakeven: (s) => ({
 title: '⚖️ Break-Even Analysed',
 body: `Break-even analysis${s ? ` (${s})` : ''} complete. Factor in all fixed and variable costs for accuracy.`,
 icon: '⚖️',
 }),
 property: (s) => ({
 title: '🏗️ Property Cost Estimated',
 body: `Property calculation${s ? ` — ${s}` : ''} done. Don't forget stamp duty, registration and GST when planning budget.`,
 icon: '🏗️',
 }),
 age: (s) => ({
 title: '🎂 Age Calculated',
 body: `Age calculation done${s ? ` — ${s}` : ''}. Knowing your exact age helps in planning insurance and retirement timelines.`,
 icon: '🎂',
 }),
 general: (s) => ({
 title: '✅ Calculation Complete',
 body: `Your financial calculation${s ? ` (${s})` : ''} is saved. Tap to review anytime.`,
 icon: '✅',
 }),
};

// Throttle per calc type — don't spam same notification within 5 minutes
const lastNotifTime: Record<string, number> = {};

export function triggerCalcNotification(type: CalcNotifOptions['type'], resultSummary?: string) {
 const now = Date.now();
 const key = type;
 if (lastNotifTime[key] && now - lastNotifTime[key] < 5 * 60 * 1000) return;
 lastNotifTime[key] = now;

 const template = NOTIF_TEMPLATES[type] || NOTIF_TEMPLATES.general;
 const { title, body, icon } = template(resultSummary);
 const routeMap: Record<string, string> = {
 emi: '/calculator/loan-emi',
 sip: '/calculator/sip',
 ppf: '/calculator/ppf-advanced',
 fd: '/calculator/fd',
 rd: '/calculator/rd',
 nps: '/calculator/nps',
 epf: '/calculator/epf',
 tax: '/calculator/income-tax',
 gst: '/calculator/gst',
 ssy: '/calculator/ssy',
 scss: '/calculator/scss',
 kvp: '/calculator/kvp',
 nsc: '/calculator/nsc',
 pomis: '/calculator/pomis',
 swp: '/calculator/swp',
 lumpsum: '/calculator/lumpsum',
 cagr: '/calculator/cagr',
 step_sip: '/calculator/step-up-sip',
 goal_sip: '/calculator/goal-sip',
 hra: '/calculator/hra',
 gratuity: '/calculator/gratuity',
 salary: '/calculator/salary-hike',
 breakeven: '/calculator/break-even',
 property: '/calculator/property',
 age: '/calculator/age',
 };

 useNotificationStore.getState().addNotification({
 type: type === 'emi' ? 'emi_reminder' :
 type === 'sip' || type === 'step_sip' || type === 'goal_sip' ? 'sip_reminder' :
 type === 'tax' ? 'tax_alert' :
 'savings_insight',
 title,
 body,
 icon,
 route: routeMap[type] || undefined,
 });
}
