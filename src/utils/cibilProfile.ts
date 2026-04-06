/**
 * cibilProfile.ts — CIBIL Profile storage engine
 * Stores user's CIBIL score locally, provides rate suggestions for all loan types.
 */
import { LOAN_CIBIL_RATES, getTierId } from '../data/cibilData';

export type CibilTier = 'nh' | 'very_poor' | 'poor' | 'average' | 'good' | 'very_good' | 'excellent';

export interface CibilProfile {
    score: number | null;
    isNTC: boolean;
    lastUpdated: string;
    employmentType: 'salaried_govt' | 'salaried_private' | 'self_employed' | 'business_owner' | 'student' | 'retired' | null;
    gender: 'male' | 'female' | 'other' | null;
    history: Array<{ score: number; date: string; note?: string }>;
    isSimulated: boolean;
}

const STORAGE_KEY = 'fincalix_cibil_profile';
const ONBOARDING_KEY = 'cibil_onboarding_shown';

export const getCibilProfile = (): CibilProfile | null => {
    try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null; } catch { return null; }
};

export const saveCibilProfile = (p: CibilProfile): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
};

export const clearCibilProfile = (): void => {
    localStorage.removeItem(STORAGE_KEY);
};

export const isOnboardingShown = (): boolean => localStorage.getItem(ONBOARDING_KEY) === '1';
export const markOnboardingShown = (): void => { localStorage.setItem(ONBOARDING_KEY, '1'); };

export const getProfileTier = (score: number | null, isNTC: boolean): CibilTier => {
    if (isNTC || score === null) return 'nh';
    return getTierId(score) as CibilTier;
};

export const getSuggestedRate = (
    loanType: string, score: number | null, isNTC: boolean,
    employmentType: string | null, gender: string | null,
): { min: number; max: number; suggested: number } => {
    const tier = getProfileTier(score, isNTC);
    const config = LOAN_CIBIL_RATES[loanType];
    const base = config?.rates[tier] ?? { min: 12, max: 18 };
    let adjMin = base.min, adjMax = base.max;
    if (employmentType === 'salaried_govt') { adjMin -= 0.25; adjMax -= 0.25; }
    if (employmentType === 'self_employed') { adjMin += 0.25; adjMax += 0.5; }
    if (employmentType === 'student') { adjMin += 0.5; adjMax += 1; }
    if (gender === 'female') { adjMin -= 0.5; adjMax -= 0.25; }
    const suggested = Math.round(((adjMin + adjMax) / 2) * 100) / 100;
    return { min: Math.max(6, adjMin), max: Math.min(36, adjMax), suggested };
};

const TIER_COLORS: Record<string, string> = {
    nh: '#94a3b8', very_poor: '#ef4444', poor: '#f97316', average: '#f59e0b',
    good: '#84cc16', very_good: '#22c55e', excellent: '#10b981',
};

export const getCibilColor = (score: number | null, isNTC: boolean): string => TIER_COLORS[getProfileTier(score, isNTC)] || '#94a3b8';