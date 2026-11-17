/**
 * Tax-group formulas that the app keeps inside screen components (not exported from src/utils),
 * copied unchanged so the website computes exactly what the app shows. Each is re-implemented
 * independently in scripts/qa-features/tax.mjs.
 */

export interface HraResult {
    annualBasicDA: number; annualHRA: number; annualRent: number;
    opt1: number; opt2: number; opt3: number;
    exempt: number; taxable: number; minIdx: number;
}

/**
 * HRA exemption — copied unchanged from src/pages/HRACalculator.tsx (computeHRA).
 * Monthly basic, DA, HRA and rent in; yearly figures out. Condition 1 = HRA received,
 * 2 = 50% (metro) / 40% of basic + DA, 3 = rent minus 10% of basic + DA; exempt = least (old regime only).
 */
export const computeHRA = (b: number, d: number, h: number, r: number, metro: boolean, regime: 'old' | 'new'): HraResult => {
    try {
        const annualBasicDA = (b + d) * 12;
        const annualHRA = h * 12;
        const annualRent = r * 12;

        const opt1 = annualHRA;                                               // Condition 1
        const opt2 = metro ? annualBasicDA * 0.5 : annualBasicDA * 0.4;       // Condition 2
        const opt3 = Math.max(0, annualRent - (annualBasicDA * 0.1));         // Condition 3

        let exempt = 0;
        if (regime === 'old') {
            exempt = Math.min(opt1, opt2, opt3);
        }

        const taxable = Math.max(0, annualHRA - exempt);
        const minIdx = regime === 'old' ? [opt1, opt2, opt3].indexOf(Math.min(opt1, opt2, opt3)) : -1;

        return { annualBasicDA, annualHRA, annualRent, opt1, opt2, opt3, exempt, taxable, minIdx };
    } catch {
        // Return safe zero-state so the UI doesn't crash
        return { annualBasicDA: 0, annualHRA: 0, annualRent: 0, opt1: 0, opt2: 0, opt3: 0, exempt: 0, taxable: 0, minIdx: -1 };
    }
};

export interface GstResult { base: number; gst: number; cess: number; cgst: number; sgst: number; igst: number; total: number }

/**
 * GST added to a price, or taken out of a GST-inclusive total — copied from src/pages/GSTCalculator.tsx
 * (stdResult; the screen's cessRate is a constant 0 after the 2025 rate changes).
 */
export function gstStandard(stdAmount: number, stdRate: number, stdDirection: 'add' | 'remove', isIGST = false): GstResult | null {
    const cessRate = 0;
    if (!stdAmount || stdRate == null || Number.isNaN(stdRate)) return null;
    if (stdDirection === 'add') {
        const gst = stdAmount * (stdRate / 100);
        const cess = stdAmount * (cessRate / 100);
        const total = stdAmount + gst + cess;
        return { base: stdAmount, gst, cess, cgst: isIGST ? 0 : gst / 2, sgst: isIGST ? 0 : gst / 2, igst: isIGST ? gst : 0, total };
    } else {
        const base = stdAmount / (1 + (stdRate + cessRate) / 100);
        const gst = base * (stdRate / 100);
        const cess = base * (cessRate / 100);
        return { base, gst, cess, cgst: isIGST ? 0 : gst / 2, sgst: isIGST ? 0 : gst / 2, igst: isIGST ? gst : 0, total: stdAmount };
    }
}

/**
 * Salary hike arithmetic — copied from src/pages/SalaryHikeCalculator.tsx (the start of `result`):
 * 'findHike' works out the percentage from the new salary; otherwise the new salary from the percentage.
 * The screen's tax step is not copied: the website uses compareSalaryTax (src/utils/incomeTax.ts).
 */
export function salaryHike(mode: 'findHike' | 'findSalary', currentSalary: number, newSalaryInput: number, hikePct: number) {
    let computedHikePct: number;
    let computedNewSalary: number;
    let hikeAmount: number;

    if (mode === 'findHike') {
        hikeAmount = newSalaryInput - currentSalary;
        computedHikePct = currentSalary > 0 ? (hikeAmount / currentSalary) * 100 : 0;
        computedNewSalary = newSalaryInput;
    } else {
        computedHikePct = hikePct;
        hikeAmount = currentSalary * (hikePct / 100);
        computedNewSalary = currentSalary + hikeAmount;
    }

    const currentMonthly = currentSalary / 12;
    const newMonthly = computedNewSalary / 12;
    const hikeMonthly = hikeAmount / 12;
    return { hikeAmount, hikePct: computedHikePct, newSalary: computedNewSalary, currentMonthly, newMonthly, hikeMonthly };
}
