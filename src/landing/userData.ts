/**
 * Does this browser hold FinCalix data from the old web app? Used by the export banner
 * and /export-my-data. Only real user records count (expense entries, loans, saved and
 * recent calculations …), not defaults or preferences, so a visitor who merely opened the
 * app once is not asked to export. Read-only: nothing here writes or deletes app data.
 */
interface Source { key: string; label: string; fields?: string[]; object?: boolean }

const SOURCES: Source[] = [
    { key: 'fincalix_entries', label: 'expense entries' },
    { key: 'fincalix_accounts', label: 'bank accounts' },
    { key: 'fincalix_budgets', label: 'monthly budgets' },
    { key: 'fincalix_my_loans', label: 'loans' },
    { key: 'fincalix_credit_cards', label: 'credit cards' },
    { key: 'fincalix_businesses', label: 'businesses' },
    { key: 'fincalix_business_entries', label: 'business entries' },
    { key: 'fincalix_recurring', label: 'recurring payments' },
    { key: 'calculator-storage', label: 'saved calculations', fields: ['savedCalculations'] },
    { key: 'calculator-storage', label: 'recent calculations', fields: ['history'] },
    { key: 'fincalix-calculator-store', label: 'saved calculations (older version)' },
    { key: 'budget-tracker-storage', label: 'budget tracker entries', fields: ['entries', 'subscriptions', 'netWorthHistory'] },
    { key: 'fincalix-expenses', label: 'expenses (older version)', fields: ['expenses', 'subscriptions', 'netWorthHistory'] },
    { key: 'live-status-storage', label: 'saved status profiles', fields: ['savedProfiles'] },
    { key: 'scheme-storage', label: 'bookmarked schemes', fields: ['bookmarkedSchemes'] },
    { key: 'fincalix_cibil_profile', label: 'CIBIL profile', object: true },
    { key: 'fincalix_property_data', label: 'property details', object: true },
];

const SINGULAR: Readonly<Record<string, string>> = {
    "expense entries": "expense entry",
    "bank accounts": "bank account",
    "monthly budgets": "monthly budget",
    "loans": "loan",
    "credit cards": "credit card",
    "businesses": "business",
    "business entries": "business entry",
    "recurring payments": "recurring payment",
    "saved calculations": "saved calculation",
    "recent calculations": "recent calculation",
    "saved calculations (older version)": "saved calculation (older version)",
    "budget tracker entries": "budget tracker entry",
    "expenses (older version)": "expense (older version)",
    "saved status profiles": "saved status profile",
    "bookmarked schemes": "bookmarked scheme"
};

function read(key: string): unknown {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function count(src: Source): number {
    const v = read(src.key);
    if (v === null || v === undefined) return 0;
    if (src.object) return typeof v === 'object' && Object.values(v as object).some((x) => x !== null && x !== '' && x !== 0) ? 1 : 0;
    if (Array.isArray(v)) return v.length;
    const state = (v as { state?: Record<string, unknown> }).state ?? (v as Record<string, unknown>);
    if (!state || typeof state !== 'object') return 0;
    const fields = src.fields ?? Object.keys(state);
    return fields.reduce((t, f) => t + (Array.isArray(state[f]) ? (state[f] as unknown[]).length : 0), 0);
}

/** What the browser holds, as "12 expense entries", "2 loans" …; empty when nothing. */
export function dataSummary(): Array<{ label: string; n: number }> {
    try {
        return SOURCES.map((s) => ({ s, n: count(s) })).filter((x) => x.n > 0)
            .map(({ s, n }) => ({ label: n === 1 ? (SINGULAR[s.label] ?? s.label) : s.label, n }));
    } catch {
        return [];
    }
}

export const hasFinCalixData = () => dataSummary().length > 0;
