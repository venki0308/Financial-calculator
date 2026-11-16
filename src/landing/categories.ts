/**
 * The website groups the app's registry (src/data/calculatorList.ts) into seven
 * categories. This is a lookup table over the registry's own categories, with
 * a few per-path exceptions; no calculator is listed by hand here.
 */
export type SiteCategory = 'loans' | 'investments' | 'tax' | 'retire' | 'cards' | 'goals' | 'utilities';

export const SITE_CATEGORIES: ReadonlyArray<{ id: SiteCategory; label: string }> = [
    { id: 'loans', label: 'Loans' },
    { id: 'investments', label: 'Investments' },
    { id: 'tax', label: 'Tax & Salary' },
    { id: 'retire', label: 'Retirement & Govt Savings' },
    { id: 'cards', label: 'Credit Cards' },
    { id: 'goals', label: 'Expense & Goals' },
    { id: 'utilities', label: 'Utilities' },
];

/** Registry category → website category. */
const BY_REGISTRY_CATEGORY: Readonly<Record<string, SiteCategory>> = {
    loans: 'loans',
    investments: 'investments',
    banking: 'investments',
    taxSalary: 'tax',
    retirement: 'retire',
    postOffice: 'retire',
    insurance: 'goals',     // protection planning sits with goals
    planning: 'goals',      // appTools: trackers and planners
    business: 'utilities',
    property: 'utilities',
    tools: 'utilities',
};

/** Paths whose registry category does not match how people look for them. */
const BY_PATH: Readonly<Record<string, SiteCategory>> = {
    '/calculator/compound-interest': 'investments', // registry: loans
    '/calculator/overdraft': 'loans',               // registry: banking
    '/calculator/gst': 'tax',                       // registry: business
    '/cibil-score': 'cards',                        // registry: tools
};

export function siteCategory(item: { path: string; category: string }): SiteCategory {
    if (item.path.includes('credit-card')) return 'cards';
    return BY_PATH[item.path] ?? BY_REGISTRY_CATEGORY[item.category] ?? 'utilities';
}
