/**
 * loanStatusEngine.ts — Live Loan Status Engine
 * Calculates exact daily-level position of any loan.
 * Works for Home Loan, Personal Loan, Car Loan, Education Loan.
 */

export interface LoanProfile {
    loanAmount: number;
    annualRate: number;
    tenureMonths: number;
    emiAmount: number;
    disbursementDate: string;       // YYYY-MM-DD
    emiDueDay: number;              // 1–31
    loanType: 'floating' | 'fixed';
}

export interface LiveLoanStatus {
    today: string;
    emisPaid: number;
    emisRemaining: number;
    nextEmiDate: string;
    daysToNextEmi: number;
    lastEmiDate: string;
    principalOutstanding: number;
    daysSinceLastEmi: number;
    interestAccruedToday: number;
    exactPayoffToday: number;
    foreclosureCharge: number;
    totalSettlementToday: number;
    percentComplete: number;
    principalPaidSoFar: number;
    interestPaidSoFar: number;
    totalPaidSoFar: number;
    interestSavedIfCloseToday: number;
    nextEmiInterest: number;
    nextEmiPrincipal: number;
    dailyInterest: number;
    hourlyInterest: number;
    loanNotStarted: boolean;
    loanFullyPaid: boolean;
}

export function calculateLiveLoanStatus(profile: LoanProfile): LiveLoanStatus {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const disbDate = new Date(profile.disbursementDate);
    disbDate.setHours(0, 0, 0, 0);

    const monthlyRate = profile.annualRate / 12 / 100;
    const dailyRate = profile.annualRate / 365 / 100;

    // Loan hasn't started yet
    if (today < disbDate) {
        return {
            today: fmtISO(today), emisPaid: 0, emisRemaining: profile.tenureMonths,
            nextEmiDate: '', daysToNextEmi: 0, lastEmiDate: '',
            principalOutstanding: profile.loanAmount, daysSinceLastEmi: 0,
            interestAccruedToday: 0, exactPayoffToday: profile.loanAmount,
            foreclosureCharge: 0, totalSettlementToday: profile.loanAmount,
            percentComplete: 0, principalPaidSoFar: 0, interestPaidSoFar: 0,
            totalPaidSoFar: 0, interestSavedIfCloseToday: 0,
            nextEmiInterest: 0, nextEmiPrincipal: 0,
            dailyInterest: 0, hourlyInterest: 0,
            loanNotStarted: true, loanFullyPaid: false,
        };
    }

    // Generate EMI due dates
    const emiDates: Date[] = [];
    for (let i = 0; i < profile.tenureMonths; i++) {
        const d = new Date(disbDate.getFullYear(), disbDate.getMonth() + 1 + i, 1);
        const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(profile.emiDueDay, maxDay));
        emiDates.push(d);
    }

    // Find EMIs paid
    let emisPaid = 0;
    let lastEmiDate = disbDate;
    for (let i = 0; i < emiDates.length; i++) {
        if (emiDates[i] <= today) {
            emisPaid = i + 1;
            lastEmiDate = emiDates[i];
        }
    }

    const emisRemaining = profile.tenureMonths - emisPaid;

    // Next EMI date
    let nextEmiDate: Date;
    if (emisPaid < emiDates.length) {
        nextEmiDate = emiDates[emisPaid];
    } else {
        nextEmiDate = emiDates[emiDates.length - 1];
    }

    // Loan fully paid
    if (emisPaid >= profile.tenureMonths) {
        const totalPaid = profile.tenureMonths * profile.emiAmount;
        return {
            today: fmtISO(today), emisPaid: profile.tenureMonths, emisRemaining: 0,
            nextEmiDate: '', daysToNextEmi: 0,
            lastEmiDate: fmtISO(emiDates[emiDates.length - 1]),
            principalOutstanding: 0, daysSinceLastEmi: 0,
            interestAccruedToday: 0, exactPayoffToday: 0,
            foreclosureCharge: 0, totalSettlementToday: 0,
            percentComplete: 100,
            principalPaidSoFar: profile.loanAmount,
            interestPaidSoFar: totalPaid - profile.loanAmount,
            totalPaidSoFar: totalPaid,
            interestSavedIfCloseToday: 0,
            nextEmiInterest: 0, nextEmiPrincipal: 0,
            dailyInterest: 0, hourlyInterest: 0,
            loanNotStarted: false, loanFullyPaid: true,
        };
    }

    // Amortize to find principal outstanding after emisPaid
    let balance = profile.loanAmount;
    let totalInterestPaid = 0;
    for (let i = 0; i < emisPaid; i++) {
        const interestPart = balance * monthlyRate;
        const principalPart = profile.emiAmount - interestPart;
        totalInterestPaid += interestPart;
        balance -= principalPart;
        if (balance < 0) balance = 0;
    }
    const principalOutstanding = balance;
    const principalPaidSoFar = profile.loanAmount - principalOutstanding;

    // Days since last EMI
    const daysSinceLastEmi = Math.max(0, Math.floor(
        (today.getTime() - lastEmiDate.getTime()) / (1000 * 60 * 60 * 24)
    ));

    // Interest accrued since last EMI
    const interestAccruedToday = principalOutstanding * dailyRate * daysSinceLastEmi;

    // Exact payoff today
    const exactPayoffToday = principalOutstanding + interestAccruedToday;
    const foreclosureCharge = profile.loanType === 'fixed'
        ? principalOutstanding * 0.03 : 0;
    const totalSettlementToday = exactPayoffToday + foreclosureCharge;

    // Interest saved if close today
    const remainingEmisAmount = emisRemaining * profile.emiAmount;
    const remainingInterestIfFull = remainingEmisAmount - principalOutstanding;
    const interestSavedIfCloseToday = Math.max(0, remainingInterestIfFull - interestAccruedToday);

    // Next EMI breakdown
    const nextEmiInterest = principalOutstanding * monthlyRate;
    const nextEmiPrincipal = Math.max(0, profile.emiAmount - nextEmiInterest);

    // Days to next EMI
    const daysToNextEmi = Math.max(0, Math.ceil(
        (nextEmiDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    ));

    const dailyInterest = principalOutstanding * dailyRate;

    return {
        today: fmtISO(today),
        emisPaid,
        emisRemaining,
        nextEmiDate: fmtISO(nextEmiDate),
        daysToNextEmi,
        lastEmiDate: fmtISO(lastEmiDate),
        principalOutstanding,
        daysSinceLastEmi,
        interestAccruedToday,
        exactPayoffToday,
        foreclosureCharge,
        totalSettlementToday,
        percentComplete: (emisPaid / profile.tenureMonths) * 100,
        principalPaidSoFar,
        interestPaidSoFar: totalInterestPaid,
        totalPaidSoFar: emisPaid * profile.emiAmount,
        interestSavedIfCloseToday,
        nextEmiInterest,
        nextEmiPrincipal,
        dailyInterest,
        hourlyInterest: dailyInterest / 24,
        loanNotStarted: false,
        loanFullyPaid: false,
    };
}

function fmtISO(d: Date): string {
    return d.toISOString().split('T')[0];
}
