import { EXPENSE_CATEGORIES, INVESTMENT_TYPES, INCOME_CATEGORIES } from '../store/useBudgetTrackerStore';

/**
 * Master lookup for human-readable category display names.
 * This consolidates expense categories, investment types, and income categories
 * into a single map, so we NEVER rely on i18n keys that may not exist for
 * investment/income IDs like 'gold', 'stocks', 'mutual_funds', etc.
 *
 * Usage: getCategoryDisplayName('gold')  → "Gold"
 *        getCategoryDisplayName('food')  → "Food & Dining"
 */

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {};

// Expense categories (food, transportation, etc.)
EXPENSE_CATEGORIES.forEach(c => {
    CATEGORY_DISPLAY_NAMES[c.id] = c.name;
});

// Investment types (gold, stocks, mutual_funds, etc.)
INVESTMENT_TYPES.forEach(c => {
    CATEGORY_DISPLAY_NAMES[c.id] = c.label;
});

// Income categories (salary, freelance, etc.)
INCOME_CATEGORIES.forEach(c => {
    CATEGORY_DISPLAY_NAMES[c.id] = c.name;
});

/**
 * Returns a human-readable display name for any category ID.
 * Falls back to title-casing the raw ID if no mapping is found.
 */
export function getCategoryDisplayName(id: string): string {
    return CATEGORY_DISPLAY_NAMES[id] || formatCategoryId(id);
}

/**
 * Returns the emoji icon for a category/investment/income ID.
 */
export function getCategoryIcon(id: string): string {
    const expense = EXPENSE_CATEGORIES.find(c => c.id === id);
    if (expense) return expense.icon;
    const investment = INVESTMENT_TYPES.find(c => c.id === id);
    if (investment) return investment.icon;
    const income = INCOME_CATEGORIES.find(c => c.id === id);
    if (income) return income.icon;
    return '📌';
}

/**
 * Fallback: converts a snake_case or camelCase ID into a readable label.
 * e.g. 'mutual_funds' → 'Mutual Funds', 'personalCare' → 'Personal Care'
 */
function formatCategoryId(id: string): string {
    return id
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/\b\w/g, c => c.toUpperCase());
}
