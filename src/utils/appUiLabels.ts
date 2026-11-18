/**
 * Display names of the expense tracker's built-in categories, payment methods and account types
 * in the user's language. The stored values (category ids/names, 'cash', 'savings'…) and the
 * English label tables in src/types/expense.ts and src/store/useBudgetTrackerStore.ts stay as
 * they are (exports and saved data use them); screens translate at display time.
 * User-created (custom) categories are shown as typed.
 */

type T = (key: string, fallback: string) => string;

// English built-in category name → i18n key (existing keys reused where they exist in all six locales).
const NAME_KEYS: Record<string, string> = {
    'Food & Dining': 'expenses.categories.food',
    'Groceries': 'expenses.categories.groceries',
    'Transport': 'expenses.quickAdd.transport',
    'Transportation': 'appUi.cat.transportation',
    'Shopping': 'expenses.categories.shopping',
    'Health & Medical': 'appUi.cat.healthMedical',
    'Healthcare': 'appUi.cat.healthcare',
    'Education': 'expenses.categories.education',
    'Entertainment': 'expenses.categories.entertainment',
    'Utilities & Bills': 'expenses.utilities',
    'Rent & Housing': 'appUi.cat.rentHousing',
    'EMI & Loan': 'appUi.cat.emiLoan',
    'Insurance': 'calculators.categories.insurance',
    'Personal Care': 'expenses.categories.personalCare',
    'Travel': 'appUi.cat.travel',
    'Subscriptions': 'expenses.subscriptions',
    'Others': 'expenses.categories.others',
    'Salary': 'gratuity.salary',
    'Freelance': 'appUi.cat.freelance',
    'Business Income': 'appUi.cat.businessIncome',
    'Business': 'appUi.cat.business',
    'Rental Income': 'appUi.cat.rentalIncome',
    'Rental': 'appUi.cat.rental',
    'Interest/Returns': 'appUi.cat.interestReturns',
    'Interest': 'appUi.cat.interest',
    'Dividend': 'appUi.cat.dividend',
    'Gift/Bonus': 'appUi.cat.giftBonus',
    'Gift': 'appUi.cat.gift',
    'Refund': 'appUi.cat.refund',
    'Other Income': 'tax.otherIncome',
    'Other': 'myLoans.typeOther',
    'Mutual Funds': 'expenses.mutualFunds',
    'Mutual Funds / SIP': 'appUi.cat.mutualFundsSip',
    'Stocks': 'expenses.stocks',
    'Stocks / Equity': 'appUi.cat.stocksEquity',
    'Gold': 'goldLoan.gold',
    'Silver': 'appUi.cat.silver',
    'FD / RD': 'appUi.cat.fdRd',
    'Fixed Deposit / RD': 'appUi.cat.fixedDepositRd',
    'PPF / EPF': 'appUi.cat.ppfEpf',
    'PPF / EPF / NPS': 'appUi.cat.ppfEpfNps',
    'Crypto': 'appUi.cat.crypto',
    'Cash Savings': 'appUi.cat.cashSavings',
    'Cash / Savings': 'appUi.cat.cashOrSavings',
    'Real Estate': 'prag.realEstate',
    'Other Investment': 'appUi.cat.otherInvestment',
};

/** A built-in English label in the user's language (unknown text is returned unchanged). */
export function labelUI(english: string | undefined | null, t: T): string {
    if (!english) return '';
    const key = NAME_KEYS[english];
    return key ? t(key, english) : english;
}

/** Category name for display: built-in names translated, custom ones as typed. */
export function catNameUI(cat: { name: string; isCustom?: boolean } | undefined | null, t: T): string {
    if (!cat) return '';
    return cat.isCustom ? cat.name : labelUI(cat.name, t);
}

const PM_KEYS: Record<string, string> = {
    cash: 'appUi.pm.cash', debit_card: 'appUi.pm.debitCard', credit_card: 'appUi.notif.creditCard',
    net_banking: 'appUi.pm.netBanking', cheque: 'appUi.pm.cheque', auto_debit: 'appUi.pm.autoDebit', other: 'myLoans.typeOther',
};
/** Payment method label ('cash' → Cash) in the user's language; UPI stays UPI. */
export function pmLabelUI(pm: string, english: string, t: T): string {
    const key = PM_KEYS[pm];
    return key ? t(key, english) : english;
}

const ACC_KEYS: Record<string, string> = {
    savings: 'appUi.acc.savings', current: 'appUi.acc.current', salary: 'appUi.acc.salary',
    wallet: 'appUi.acc.wallet', cash: 'appUi.pm.cash', credit_card: 'appUi.notif.creditCard',
};
/** Account type label ('savings' → Savings) in the user's language; FD stays FD. */
export function accTypeUI(type: string, english: string, t: T): string {
    const key = ACC_KEYS[type];
    return key ? t(key, english) : english;
}

/** Transfer From/To options: 'Cash' and 'Other' are stored in English; account/card names as typed. */
export function transferOptionUI(opt: string, t: T): string {
    if (opt === 'Cash') return t('appUi.pm.cash', 'Cash');
    if (opt === 'Other') return t('myLoans.typeOther', 'Other');
    return opt;
}

// Quick-add presets of recurring rules save these English notes as the entry description.
const PRESET_NOTES: Record<string, [string, string]> = {
    'Rent': ['recurring.preset_rent_housing', 'Rent'],
    'Salary': ['recurring.preset_salary', 'Salary'],
    'School Fees': ['recurring.preset_education', 'School Fees'],
};
/** An entry description / rule note: the presets' English notes translated, anything typed as is. */
export function noteUI(note: string | undefined | null, t: T): string {
    if (!note) return '';
    const p = PRESET_NOTES[note];
    return p ? t(p[0], p[1]) : note;
}

/** Billing cycle ('monthly' | 'quarterly' | 'yearly' | 'weekly') in the user's language. */
export function cycleUI(cycle: string, t: T): string {
    const c = String(cycle).toLowerCase();
    const en = c.charAt(0).toUpperCase() + c.slice(1);
    return ['monthly', 'quarterly', 'yearly', 'weekly'].includes(c) ? t(`appUi.cycle.${c}`, en) : cycle;
}
