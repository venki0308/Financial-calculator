/**
 * Display-only translation helpers for the loan, credit-card, CIBIL, property and utility screens.
 * Stored values (loan type names, unit ids, city ids) never change; these map them to the user's
 * language at render time.
 */
import i18n from '../i18n';
import { formatDateUI } from './uiLocale';
import { CIBIL_TIER_LABEL_KEYS, CIBIL_TIP_TEXT_KEYS } from '../data/cibilData';
import { UNIT_LABELS, UNIT_SHORT, UNIT_VARIES, STATE_RATES } from './propertyData';

const tr = (key: string, def: string, opts?: Record<string, unknown>) =>
    String(i18n.t(key, { defaultValue: def, ...(opts || {}) }));

/** Loan type names used as stored values ('Home Loan', 'Car Loan', …) → label in the user's language. */
const LOAN_TYPE_KEYS: Record<string, string> = {
    'Home Loan': 'cibil.homeLoan',
    'Car Loan': 'cibil.carLoan',
    'Personal Loan': 'cibil.personalLoan',
    'Education Loan': 'cibil.educationLoan',
    'Two Wheeler': 'cibil.twoWheeler',
    'Two Wheeler Loan': 'cibil.twoWheeler',
    'Gold Loan': 'cibil.goldLoan',
    'Mortgage': 'cibil.mortgage',
    'Overdraft': 'myLoans.typeLabelOverdraft',
    'Credit Card': 'loanUi.creditCard',
};

export function loanTypeLabel(lt: string): string {
    const key = LOAN_TYPE_KEYS[lt];
    return key ? tr(key, lt) : lt;
}

/** CIBIL tier label ('Very Good' …) in the user's language. */
export function cibilTierLabel(tier: { id: string; label: string }): string {
    const key = CIBIL_TIER_LABEL_KEYS[tier.id];
    return key ? tr(key, tier.label) : tier.label;
}

/** CIBIL tip impact / time / points text ('High', '3-6 months' …) in the user's language. */
export function cibilTipText(v: string): string {
    const key = CIBIL_TIP_TEXT_KEYS[v];
    return key ? tr(key, v) : v;
}

/**
 * Some keys exist only in en.json (no translations yet). On screen we use a loanUi.* copy that has
 * all six languages; the original key stays as the English default.
 */
const EN_ONLY_KEYS: Record<string, string> = {
    'cibil.overdraft': 'myLoans.typeLabelOverdraft',
    'cibil.creditCard': 'loanUi.creditCard',
};

/** i18n.t for a key that may only exist in English: uses the translated loanUi copy when there is one. */
export function tKey(key: string, opts?: Record<string, unknown>): string {
    const alt = EN_ONLY_KEYS[key];
    if (!alt) return String(i18n.t(key, opts as never));
    return tr(alt, String(i18n.t(key, opts as never)), opts);
}

// ─── Property: land units, states, construction grades ───────────────────────
/** Land/area unit name (full) in the user's language; ids are the UNIT_CONV keys. */
export function unitLabelUI(id: string): string {
    return tr(`loanUi.unit_${id}`, UNIT_LABELS[id] ?? id);
}
/** Short unit label for buttons (Sq.ft, Sq.m, Sq.yd; other units use the full name). */
export function unitShortUI(id: string): string {
    if (id === 'sqft' || id === 'sqm' || id === 'sqyard') return tr(`loanUi.unitShort_${id}`, UNIT_SHORT[id] ?? id);
    return unitLabelUI(id);
}
/** The "size differs by state" note for bigha / katha. */
export function unitVariesUI(id: string): string {
    return tr(`loanUi.unitVaries_${id}`, UNIT_VARIES[id] ?? '');
}
const STATE_ID_BY_NAME: Record<string, string> = Object.fromEntries(
    Object.entries(STATE_RATES).map(([id, v]) => [v.name, id]),
);
/** Indian state name ('Telangana', 'Tamil Nadu' …) in the user's language. */
export function stateNameUI(name: string): string {
    const id = STATE_ID_BY_NAME[name];
    return id ? tr(`loanUi.state_${id}`, name) : name;
}
/** Two-wheeler EV benefit note for a state (keyed by English state name). */
export function evBenefitUI(name: string, text: string): string {
    const id = STATE_ID_BY_NAME[name];
    return id ? tr(`loanUi.evBenefit_${id}`, text) : text;
}
/** Construction grade label (economy / standard / premium / luxury). */
export function gradeLabelUI(key: string, label: string): string {
    return tr(`loanUi.grade_${key}`, label);
}

/** "Apr 2026" in the user's language (month is 1-12). */
export function monthYearUI(year: number, month: number): string {
    return formatDateUI(new Date(year, month - 1, 1), { month: 'short', year: 'numeric' });
}

/** "Typical range 8-14% (Apr 2026)" in the user's language. */
export function typicalRange(range: string, year: number, month: number): string {
    return tr('loanUi.typicalRange', 'Typical range {{range}} ({{when}})', { range, when: monthYearUI(year, month) });
}
