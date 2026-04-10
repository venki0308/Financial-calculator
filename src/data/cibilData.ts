/**
 * cibilData.ts — CIBIL Score ranges, loan rate matrix, improvement tips
 * Based on RBI guidelines & industry data. NO bank/NBFC names.
 */

export interface CibilRange {
    id: string; label: string; range: string; min: number; max: number;
    color: string; emoji: string; description: string; approvalChance: string; note: string;
}

export const CIBIL_RANGES: CibilRange[] = [
    { id: 'nh', label: 'No History', range: 'NH', min: 0, max: 0, color: '#94a3b8', emoji: '🆕', description: 'cibil.nhDesc', approvalChance: 'cibil.moderate', note: 'cibil.nhNote' },
    { id: 'very_poor', label: 'Very Poor', range: '300–549', min: 300, max: 549, color: '#ef4444', emoji: '🔴', description: 'cibil.vpDesc', approvalChance: 'cibil.veryLow', note: 'cibil.vpNote' },
    { id: 'poor', label: 'Poor', range: '550–649', min: 550, max: 649, color: '#f97316', emoji: '🟠', description: 'cibil.poorDesc', approvalChance: 'cibil.low', note: 'cibil.poorNote' },
    { id: 'average', label: 'Average', range: '650–699', min: 650, max: 699, color: '#f59e0b', emoji: '🟡', description: 'cibil.avgDesc', approvalChance: 'cibil.moderate', note: 'cibil.avgNote' },
    { id: 'good', label: 'Good', range: '700–749', min: 700, max: 749, color: '#84cc16', emoji: '🟢', description: 'cibil.goodDesc', approvalChance: 'cibil.good', note: 'cibil.goodNote' },
    { id: 'very_good', label: 'Very Good', range: '750–779', min: 750, max: 779, color: '#22c55e', emoji: '✅', description: 'cibil.vgDesc', approvalChance: 'cibil.veryGood', note: 'cibil.vgNote' },
    { id: 'excellent', label: 'Excellent', range: '780–900', min: 780, max: 900, color: '#10b981', emoji: '⭐', description: 'cibil.exDesc', approvalChance: 'cibil.excellent', note: 'cibil.exNote' },
];

export function getCibilTier(score: number): CibilRange {
    if (score <= 0) return CIBIL_RANGES[0]; // NH
    return CIBIL_RANGES.find(r => score >= r.min && score <= r.max) || CIBIL_RANGES[0];
}

export function getTierId(score: number): string {
    if (score <= 0) return 'nh';
    if (score < 550) return 'very_poor';
    if (score < 650) return 'poor';
    if (score < 700) return 'average';
    if (score < 750) return 'good';
    if (score < 780) return 'very_good';
    return 'excellent';
}

interface RateRange { min: number; max: number }

export interface LoanCibilConfig {
    loanType: string;
    minBank: number;
    minNBFC: number;
    ideal: number;
    rates: Record<string, RateRange>;
    ltv: Record<string, number>;
    notes: string[];
}

export const LOAN_CIBIL_RATES: Record<string, LoanCibilConfig> = {
    // Updated April 2026: RBI repo rate held at 5.25%, banks tightening MCLR
    home_loan: {
        loanType: 'Home Loan', minBank: 700, minNBFC: 650, ideal: 760,
        rates: { nh: { min: 14, max: 16 }, very_poor: { min: 14, max: 16 }, poor: { min: 12, max: 14 }, average: { min: 10.5, max: 12 }, good: { min: 9.75, max: 10.5 }, very_good: { min: 9, max: 9.75 }, excellent: { min: 8.5, max: 9 } },
        ltv: { nh: 75, very_poor: 65, poor: 65, average: 75, good: 80, very_good: 85, excellent: 90 },
        notes: ['cibil.homeTip1', 'cibil.homeTip2', 'cibil.homeTip3'],
    },
    personal_loan: {
        loanType: 'Personal Loan', minBank: 720, minNBFC: 600, ideal: 750,
        rates: { nh: { min: 28, max: 36 }, very_poor: { min: 22, max: 36 }, poor: { min: 22, max: 36 }, average: { min: 18, max: 24 }, good: { min: 14, max: 18 }, very_good: { min: 11.8, max: 14 }, excellent: { min: 10.5, max: 13 } },
        ltv: { nh: 50, very_poor: 30, poor: 30, average: 60, good: 75, very_good: 90, excellent: 100 },
        notes: ['cibil.personalTip1', 'cibil.personalTip2'],
    },
    car_loan: {
        loanType: 'Car Loan', minBank: 700, minNBFC: 650, ideal: 750,
        rates: { nh: { min: 14.5, max: 20 }, very_poor: { min: 14.5, max: 20 }, poor: { min: 14.5, max: 20 }, average: { min: 12, max: 14.5 }, good: { min: 10.5, max: 12 }, very_good: { min: 9.75, max: 10.5 }, excellent: { min: 9, max: 9.75 } },
        ltv: { nh: 70, very_poor: 60, poor: 60, average: 75, good: 80, very_good: 85, excellent: 90 },
        notes: ['cibil.carTip1', 'cibil.carTip2'],
    },
    two_wheeler_loan: {
        loanType: 'Two Wheeler', minBank: 680, minNBFC: 600, ideal: 720,
        rates: { nh: { min: 20, max: 30 }, very_poor: { min: 20, max: 30 }, poor: { min: 20, max: 30 }, average: { min: 16, max: 22 }, good: { min: 13, max: 16 }, very_good: { min: 11, max: 13 }, excellent: { min: 9.5, max: 11 } },
        ltv: { nh: 75, very_poor: 65, poor: 65, average: 75, good: 85, very_good: 90, excellent: 100 },
        notes: ['cibil.twTip1'],
    },
    education_loan: {
        loanType: 'Education Loan', minBank: 650, minNBFC: 600, ideal: 700,
        rates: { nh: { min: 9, max: 12 }, very_poor: { min: 13, max: 18 }, poor: { min: 13, max: 18 }, average: { min: 11, max: 14 }, good: { min: 9.5, max: 12 }, very_good: { min: 8.5, max: 10.5 }, excellent: { min: 7.5, max: 9.5 } },
        ltv: { nh: 100, very_poor: 80, poor: 80, average: 90, good: 100, very_good: 100, excellent: 100 },
        notes: ['cibil.eduTip1'],
    },
    mortgage: {
        loanType: 'Mortgage', minBank: 700, minNBFC: 650, ideal: 760,
        rates: { nh: { min: 14, max: 16 }, very_poor: { min: 14, max: 16 }, poor: { min: 12, max: 14 }, average: { min: 10.5, max: 12 }, good: { min: 9.75, max: 10.5 }, very_good: { min: 9, max: 9.75 }, excellent: { min: 8.5, max: 9 } },
        ltv: { nh: 75, very_poor: 65, poor: 65, average: 75, good: 80, very_good: 85, excellent: 90 },
        notes: ['cibil.homeTip1', 'cibil.homeTip2', 'cibil.homeTip3'],
    },
    // Gold loan rates updated April 2026 to reflect actual market floors:
    // PSU banks (Kotak/SBI/PNB) start ~8.25%, private banks ~9-11%, NBFCs
    // ~11-22% (Muthoot/IIFL/Manappuram). CIBIL impact is small because the
    // gold itself is collateral, but it still affects rate ~1-3 pp across
    // the score band. RBI 2026 LTV is tier-based (85/80/75) on loan amount,
    // not score, so the score-keyed LTV map below is purely informational
    // and gets overridden by GoldLoanCalculator's tiered logic at runtime.
    gold_loan: {
        loanType: 'Gold Loan', minBank: 0, minNBFC: 0, ideal: 0,
        rates: {
            nh:        { min: 10,    max: 14 },
            very_poor: { min: 14,    max: 22 },
            poor:      { min: 13,    max: 18 },
            average:   { min: 11,    max: 15 },
            good:      { min: 9.5,   max: 12 },
            very_good: { min: 8.75,  max: 10.5 },
            excellent: { min: 8.25,  max: 9.5 },
        },
        ltv: { nh: 75, very_poor: 75, poor: 75, average: 75, good: 80, very_good: 85, excellent: 85 },
        notes: ['cibil.goldTip1'],
    },
};

export const CIBIL_TIPS = [
    { id: 'payment', titleKey: 'cibil.tipPayTitle', descKey: 'cibil.tipPayDesc', impact: 'High', points: '50-100', time: '3-6 months' },
    { id: 'utilisation', titleKey: 'cibil.tipUtilTitle', descKey: 'cibil.tipUtilDesc', impact: 'High', points: '20-50', time: '1-2 months' },
    { id: 'old_accounts', titleKey: 'cibil.tipOldTitle', descKey: 'cibil.tipOldDesc', impact: 'Medium', points: '10-30', time: 'Gradual' },
    { id: 'applications', titleKey: 'cibil.tipAppTitle', descKey: 'cibil.tipAppDesc', impact: 'Medium', points: '-5 to -10 each', time: 'Immediate' },
    { id: 'credit_mix', titleKey: 'cibil.tipMixTitle', descKey: 'cibil.tipMixDesc', impact: 'Medium', points: '10-20', time: 'Gradual' },
    { id: 'errors', titleKey: 'cibil.tipErrTitle', descKey: 'cibil.tipErrDesc', impact: 'High', points: '100+', time: '30-45 days' },
    { id: 'secured_card', titleKey: 'cibil.tipSecTitle', descKey: 'cibil.tipSecDesc', impact: 'High', points: '0→700+', time: '6-12 months' },
];

export const CIBIL_MYTHS = [
    { mythKey: 'cibil.myth1', factKey: 'cibil.fact1' },
    { mythKey: 'cibil.myth2', factKey: 'cibil.fact2' },
    { mythKey: 'cibil.myth3', factKey: 'cibil.fact3' },
    { mythKey: 'cibil.myth4', factKey: 'cibil.fact4' },
    { mythKey: 'cibil.myth5', factKey: 'cibil.fact5' },
    { mythKey: 'cibil.myth6', factKey: 'cibil.fact6' },
];

export const RBI_NOTES = [
    'cibil.rbi1', 'cibil.rbi2', 'cibil.rbi3', 'cibil.rbi4', 'cibil.rbi5', 'cibil.rbi6',
];
