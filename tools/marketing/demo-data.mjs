// Demo inputs for the marketing captures (tools/marketing/capture.mjs).
// Everything here is fictional. These are INPUTS only: every result shown in a
// capture is computed by the app itself from these values.

/** The captures pin the browser clock to this instant so "this month" is
 *  always November 2026, whenever the script is re-run. */
export const DEMO_NOW = '2026-11-16T10:30:00+05:30';

export const TAX = {
    annualSalary: 1450000,
    zeroTaxSalary: 1275000,
    deductions: { sec80C: 150000, sec80D: 25000, homeLoanInterest: 200000 },
};

export const HOME_LOAN = { amount: 4500000, rate: 8.5, years: 20 };
export const PART_PAYMENT = { amount: 500000, afterMonth: 36 };
export const FORECLOSURE = { monthsPaid: 36, chargePct: 0 };

export const SIP = { monthly: 10000, years: 15, rate: 12, extraYears: [5, 10, 20, 25] };
export const FD = { principal: 500000, years: 5 };
export const RD = { monthly: 10000, months: 60 };
export const PPF = { yearly: 150000, years: 15 };
export const HRA = { basicMonthly: 60000, hraMonthly: 24000, rentMonthly: 22000, metro: true };
export const GST = { base: 50000, rate: 18 };

export const GOALS = [
    { name: 'Child Education', preset: 'education', cost: 2500000, years: 10 },
    { name: 'Europe Trip', preset: 'custom', cost: 400000, years: 2 },
];

export const ADVISOR = { income: 120000, age: 32, expenses: 65000, savings: 400000, emi: 0, goals: ['house', 'education', 'retirement'] };

// ── Expense tracker ─────────────────────────────────────────────────────────
// [day, type, category id, amount, description, payment method]
const NOV = [
    [1, 'income', 'salary', 112000, 'Monthly salary', 'net_banking'],
    [10, 'income', 'freelance', 8000, 'Weekend design project', 'upi'],
    [5, 'investment', 'inv_mutual_fund', 10000, 'Monthly SIP', 'auto_debit'],
    [1, 'expense', 'rent_housing', 28000, 'Monthly rent', 'net_banking'],
    [1, 'expense', 'groceries', 2450, 'Monthly staples', 'upi'],
    [2, 'expense', 'transport', 2000, 'Petrol', 'debit_card'],
    [2, 'expense', 'subscription', 649, 'Video streaming plan', 'auto_debit'],
    [3, 'expense', 'food_dining', 1280, 'Family dinner', 'upi'],
    [3, 'expense', 'insurance', 2100, 'Term insurance premium', 'auto_debit'],
    [4, 'expense', 'utilities', 1860, 'Electricity bill', 'upi'],
    [4, 'expense', 'utilities', 799, 'Broadband', 'auto_debit'],
    [5, 'expense', 'groceries', 1320, 'Vegetables and fruits', 'upi'],
    [5, 'expense', 'health', 850, 'Pharmacy', 'upi'],
    [6, 'expense', 'transport', 450, 'Metro card recharge', 'upi'],
    [7, 'expense', 'shopping', 3499, 'Festive clothing', 'debit_card'],
    [7, 'expense', 'food_dining', 640, 'Office lunch', 'upi'],
    [8, 'expense', 'entertainment', 900, 'Movie tickets', 'upi'],
    [8, 'expense', 'groceries', 1780, 'Weekly groceries', 'upi'],
    [9, 'expense', 'subscription', 199, 'Music app', 'auto_debit'],
    [9, 'expense', 'transport', 1800, 'Petrol', 'debit_card'],
    [10, 'expense', 'utilities', 499, 'Mobile recharge', 'upi'],
    [10, 'expense', 'health', 1200, 'Doctor consultation', 'upi'],
    [11, 'expense', 'food_dining', 420, 'Coffee and snacks', 'upi'],
    [12, 'expense', 'shopping', 2150, 'Home essentials', 'debit_card'],
    [12, 'expense', 'education', 1500, 'Online course', 'debit_card'],
    [13, 'expense', 'groceries', 1640, 'Weekly groceries', 'upi'],
    [14, 'expense', 'food_dining', 1950, 'Weekend dinner', 'upi'],
    [14, 'expense', 'personal_care', 700, 'Salon', 'cash'],
    [15, 'expense', 'utilities', 950, 'Cooking gas cylinder', 'upi'],
    [15, 'expense', 'transport', 380, 'Cab ride', 'upi'],
    [16, 'expense', 'groceries', 560, 'Milk and bread', 'cash'],
];

// A lighter set for the three earlier months so the yearly report has a trend.
const EARLIER = (salary, rows) => [
    [1, 'income', 'salary', salary, 'Monthly salary', 'net_banking'],
    [5, 'investment', 'inv_mutual_fund', 10000, 'Monthly SIP', 'auto_debit'],
    [1, 'expense', 'rent_housing', 28000, 'Monthly rent', 'net_banking'],
    ...rows,
];
const AUG = EARLIER(112000, [
    [3, 'expense', 'groceries', 7900, 'Groceries', 'upi'],
    [6, 'expense', 'transport', 4300, 'Petrol and metro', 'debit_card'],
    [9, 'expense', 'utilities', 4250, 'Electricity, broadband, mobile', 'upi'],
    [14, 'expense', 'food_dining', 3900, 'Dining out', 'upi'],
    [18, 'expense', 'shopping', 2600, 'Clothing', 'debit_card'],
    [22, 'expense', 'health', 900, 'Pharmacy', 'upi'],
    [25, 'expense', 'subscription', 848, 'Streaming and music', 'auto_debit'],
]);
const SEP = EARLIER(112000, [
    [2, 'expense', 'groceries', 8400, 'Groceries', 'upi'],
    [7, 'expense', 'transport', 3950, 'Petrol and metro', 'debit_card'],
    [10, 'expense', 'utilities', 4600, 'Electricity, broadband, mobile', 'upi'],
    [13, 'expense', 'food_dining', 4700, 'Dining out', 'upi'],
    [19, 'expense', 'travel', 9500, 'Weekend trip', 'debit_card'],
    [24, 'expense', 'health', 1500, 'Health check-up', 'upi'],
    [25, 'expense', 'subscription', 848, 'Streaming and music', 'auto_debit'],
]);
const OCT = EARLIER(112000, [
    [12, 'income', 'gift', 15000, 'Festival bonus', 'net_banking'],
    [3, 'expense', 'groceries', 9100, 'Groceries', 'upi'],
    [6, 'expense', 'transport', 4100, 'Petrol and metro', 'debit_card'],
    [9, 'expense', 'utilities', 4380, 'Electricity, broadband, mobile', 'upi'],
    [15, 'expense', 'shopping', 12800, 'Festival shopping', 'debit_card'],
    [17, 'expense', 'food_dining', 5200, 'Dining out', 'upi'],
    [21, 'expense', 'entertainment', 1800, 'Concert tickets', 'upi'],
    [25, 'expense', 'subscription', 848, 'Streaming and music', 'auto_debit'],
]);

const pad = (n) => String(n).padStart(2, '0');

function buildEntries() {
    const out = [];
    let seq = 0;
    for (const [month, rows] of [[8, AUG], [9, SEP], [10, OCT], [11, NOV]]) {
        for (const [day, type, category, amount, description, paymentMethod] of rows) {
            const date = `2026-${pad(month)}-${pad(day)}`;
            const stamp = new Date(`${date}T${pad(9 + (seq % 10))}:${pad((seq * 7) % 60)}:00+05:30`);
            const iso = stamp.toISOString();
            out.push({
                id: `entry_${stamp.getTime()}_demo${pad(seq)}`,
                type, amount, date, category, description, paymentMethod,
                recurrence: 'none', isDeleted: false, createdAt: iso, updatedAt: iso,
            });
            seq++;
        }
    }
    return out;
}

const CATEGORY_LIMITS = [
    ['rent_housing', 28000], ['groceries', 9000], ['food_dining', 6000], ['transport', 6000],
    ['utilities', 5000], ['shopping', 6000], ['health', 3000], ['insurance', 2500],
    ['education', 2000], ['entertainment', 2000], ['personal_care', 1500], ['subscription', 1000],
];

function buildBudgets() {
    return [8, 9, 10, 11].map((month) => {
        const created = new Date(`2026-${pad(month)}-01T08:00:00+05:30`);
        return {
            id: `budget_${created.getTime()}`,
            month: `2026-${pad(month)}`,
            monthlyIncome: 120000,
            fixedExpenses: [],
            categoryLimits: CATEGORY_LIMITS.map(([categoryId, monthlyLimit]) => ({ categoryId, monthlyLimit })),
            investmentTargets: [{ categoryId: 'inv_mutual_fund', monthlyTarget: 10000 }],
            createdAt: created.toISOString(),
            updatedAt: created.toISOString(),
        };
    });
}

export const EXPENSES = {
    month: '2026-11',
    monthlyIncome: 120000,
    entries: buildEntries(),
    budgets: buildBudgets(),
};
