/**
 * loanStorage.ts — My Loans data model & localStorage CRUD
 */

export type LoanType =
    | 'home_loan'
    | 'car_loan'
    | 'personal_loan'
    | 'education_loan'
    | 'gold_loan'
    | 'business_loan'
    | 'two_wheeler_loan'
    | 'other';

export interface SavedLoan {
    id: string;
    nickName: string;
    loanType: LoanType;
    lenderName: string;
    accountNumber?: string;
    loanAmount: number;
    interestRate: number;
    tenureMonths: number;
    emiAmount: number;
    rateType: 'floating' | 'fixed';
    disbursementDate: string;   // YYYY-MM-DD
    emiDueDay: number;          // 1–31
    notes?: string;
    /** Foreclosure charge % for fixed-rate loans only (default 3%, varies 1-4% by bank). */
    foreclosureChargePercent?: number;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
}

const STORAGE_KEY = 'fincalix_my_loans';

export const getAllLoans = (): SavedLoan[] => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

export const saveLoan = (loan: SavedLoan): void => {
    const loans = getAllLoans();
    const index = loans.findIndex(l => l.id === loan.id);
    if (index >= 0) {
        loans[index] = { ...loan, updatedAt: new Date().toISOString() };
    } else {
        loans.push(loan);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
};

export const deleteLoan = (id: string): void => {
    const loans = getAllLoans().filter(l => l.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
};

export const getLoanById = (id: string): SavedLoan | null => {
    return getAllLoans().find(l => l.id === id) || null;
};

export const generateLoanId = (): string => {
    return 'loan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

export const LOAN_TYPE_META: Record<LoanType, { icon: string; label: string; color: string }> = {
    home_loan: { icon: '🏠', label: 'myLoans.typeHome', color: '#8B5CF6' },
    car_loan: { icon: '🚗', label: 'myLoans.typeCar', color: '#3B82F6' },
    personal_loan: { icon: '💳', label: 'myLoans.typePersonal', color: '#F59E0B' },
    education_loan: { icon: '🎓', label: 'myLoans.typeEducation', color: '#06B6D4' },
    gold_loan: { icon: '🥇', label: 'myLoans.typeGold', color: '#EAB308' },
    business_loan: { icon: '💼', label: 'myLoans.typeBusiness', color: '#10B981' },
    two_wheeler_loan: { icon: '🛵', label: 'myLoans.typeTwoWheeler', color: '#EC4899' },
    other: { icon: '📋', label: 'myLoans.typeOther', color: '#64748B' },
};