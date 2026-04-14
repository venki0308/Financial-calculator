// ═══════════════════════════════════════════════════════════════
// FINCALIX — DATA INTEGRITY CHECK
// Runs on app start to validate localStorage data, repair corruption,
// and ensure all stores survive an app restart cleanly.
// ═══════════════════════════════════════════════════════════════

import type { Entry, BankAccount, Budget } from '../types/expense';
import type { SavedLoan } from './loanStorage';

interface IntegrityReport {
    checked: number;
    repaired: number;
    removed: number;
    issues: string[];
}

const STORAGE_KEYS = {
    entries: 'fincalix_entries',
    accounts: 'fincalix_accounts',
    budgets: 'fincalix_budgets',
    loans: 'fincalix_my_loans',
    creditCards: 'fincalix_credit_cards',
} as const;

// ── Validators ─────────────────────────────────────────────

const isValidEntry = (e: unknown): e is Entry => {
    if (!e || typeof e !== 'object') return false;
    const x = e as Record<string, unknown>;
    return (
        typeof x.id === 'string' &&
        typeof x.amount === 'number' && Number.isFinite(x.amount) && x.amount >= 0 &&
        typeof x.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.date) &&
        typeof x.category === 'string' &&
        ['expense', 'income', 'investment', 'transfer'].includes(x.type as string)
    );
};

const isValidAccount = (a: unknown): a is BankAccount => {
    if (!a || typeof a !== 'object') return false;
    const x = a as Record<string, unknown>;
    return (
        typeof x.id === 'string' &&
        typeof x.name === 'string' && x.name.length > 0 &&
        typeof x.manualBalance === 'number' && Number.isFinite(x.manualBalance) &&
        typeof x.accountType === 'string'
    );
};

const isValidLoan = (l: unknown): l is SavedLoan => {
    if (!l || typeof l !== 'object') return false;
    const x = l as Record<string, unknown>;
    return (
        typeof x.id === 'string' &&
        typeof x.loanAmount === 'number' && Number.isFinite(x.loanAmount) && x.loanAmount > 0 &&
        typeof x.interestRate === 'number' && Number.isFinite(x.interestRate) && x.interestRate >= 0 &&
        typeof x.tenureMonths === 'number' && x.tenureMonths > 0
    );
};

const isValidCreditCard = (c: unknown): c is Record<string, unknown> => {
    if (!c || typeof c !== 'object') return false;
    const x = c as Record<string, unknown>;
    return (
        typeof x.id === 'string' &&
        typeof x.bankName === 'string' &&
        typeof x.creditLimit === 'number' && Number.isFinite(x.creditLimit) && x.creditLimit >= 0 &&
        typeof x.currentBalance === 'number' && Number.isFinite(x.currentBalance) && x.currentBalance >= 0 &&
        typeof x.annualInterestRate === 'number' && Number.isFinite(x.annualInterestRate) && x.annualInterestRate >= 0 &&
        typeof x.statementDate === 'number' && x.statementDate >= 1 && x.statementDate <= 31 &&
        typeof x.dueDate === 'number' && x.dueDate >= 1 && x.dueDate <= 31
    );
};

const isValidBudget = (b: unknown): b is Budget => {
    if (!b || typeof b !== 'object') return false;
    const x = b as Record<string, unknown>;
    return (
        typeof x.month === 'string' &&
        typeof x.monthlyIncome === 'number' && Number.isFinite(x.monthlyIncome) &&
        Array.isArray(x.fixedExpenses) &&
        Array.isArray(x.categoryLimits) &&
        Array.isArray(x.investmentTargets)
    );
};

// ── Generic store validator ────────────────────────────────

function validateStore<T>(
    key: string,
    validator: (item: unknown) => item is T,
    report: IntegrityReport,
    storeLabel: string,
): void {
    const raw = localStorage.getItem(key);
    if (!raw) return;

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch {
        // Corrupted JSON — back it up and reset to empty array
        localStorage.setItem(`${key}_corrupted_backup_${Date.now()}`, raw);
        localStorage.setItem(key, '[]');
        report.issues.push(`${storeLabel}: corrupted JSON, backed up and reset`);
        return;
    }

    if (!Array.isArray(parsed)) {
        // Wrong shape — back it up
        localStorage.setItem(`${key}_corrupted_backup_${Date.now()}`, raw);
        localStorage.setItem(key, '[]');
        report.issues.push(`${storeLabel}: not an array, backed up and reset`);
        return;
    }

    const validItems: T[] = [];
    let removedCount = 0;
    for (const item of parsed) {
        report.checked++;
        if (validator(item)) {
            validItems.push(item);
        } else {
            removedCount++;
        }
    }

    if (removedCount > 0) {
        localStorage.setItem(key, JSON.stringify(validItems));
        report.removed += removedCount;
        report.issues.push(`${storeLabel}: removed ${removedCount} invalid item(s)`);
    }
}

/**
 * Run a full integrity check on all critical stores.
 * - Detects and backs up corrupted JSON
 * - Removes invalid entries (NaN amounts, missing IDs, wrong dates, etc.)
 * - Returns a report of what was checked / repaired / removed
 *
 * Safe to call on every app start. No side effects when data is healthy.
 */
export function runDataIntegrityCheck(): IntegrityReport {
    const report: IntegrityReport = {
        checked: 0,
        repaired: 0,
        removed: 0,
        issues: [],
    };

    try {
        validateStore(STORAGE_KEYS.entries, isValidEntry, report, 'entries');
        validateStore(STORAGE_KEYS.accounts, isValidAccount, report, 'accounts');
        validateStore(STORAGE_KEYS.loans, isValidLoan, report, 'loans');

        // Budgets is a single object per month, but stored as array
        validateStore(STORAGE_KEYS.budgets, isValidBudget, report, 'budgets');

        // Credit cards — flat array, same pattern as the others. Catches
        // NaN limits, corrupt dates, and missing required fields before
        // the Credit Card Manager tries to render them.
        validateStore(STORAGE_KEYS.creditCards, isValidCreditCard, report, 'creditCards');
    } catch (err) {
        report.issues.push(`Integrity check failed: ${(err as Error).message}`);
    }

    if (report.issues.length > 0) {
        console.warn('[FinCalix] Data integrity issues found:', report);
    }

    return report;
}
