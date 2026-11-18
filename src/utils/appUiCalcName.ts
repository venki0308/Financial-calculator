/**
 * Calculator names saved with history/saved entries (`calculatorType`, English, e.g. 'FD Calculator',
 * 'Loan EMI Calculator', 'swp') → the translated calculator name key, for display only.
 * The stored value never changes; unknown names are shown as saved.
 */

const NAME_KEYS: Record<string, string> = {
    'emi': 'calculators.emi.name', 'loan emi': 'calculators.emi.name',
    'home loan': 'calculators.homeLoan.name',
    'sip': 'calculators.sip.name',
    'advanced sip': 'calculators.advancedSip.name',
    'step up sip': 'calculators.stepUpSip.name', 'stepup sip': 'calculators.stepUpSip.name',
    'goal sip': 'calculators.goalSip.name',
    'fd': 'calculators.fd.name', 'fixed deposit': 'calculators.fd.name',
    'rd': 'calculators.rd.name', 'recurring deposit': 'calculators.rd.name',
    'ci': 'calculators.compound.name', 'compound interest': 'calculators.compound.name',
    'simple interest': 'calculators.simple.name', 'interest': 'calculators.simple.name',
    'tax': 'calculators.incomeTax.name', 'income tax': 'calculators.incomeTax.name',
    'form 16 tax': 'calculators.form16Tax.name',
    'salary hike': 'calculators.salaryHike.name',
    'hra': 'calculators.hra.name',
    'lumpsum': 'calculators.lumpsum.name',
    'swp': 'calculators.swp.name', 'stp': 'calculators.stp.name',
    'cagr': 'calculators.cagr.name',
    'ppf': 'calculators.ppf.name', 'nps': 'calculators.nps.name', 'epf': 'calculators.epf.name',
    'gratuity': 'calculators.gratuity.name',
    'ssy': 'calculators.ssy.name', 'sukanya samriddhi': 'calculators.ssy.name',
    'nsc': 'calculators.nsc.name', 'kvp': 'calculators.kvp.name',
    'pomis': 'calculators.pomis.name', 'post office mis': 'calculators.pomis.name',
    'scss': 'calculators.scss.name',
    'potd': 'calculators.potd.name', 'post office td': 'calculators.potd.name',
    'break even': 'calculators.breakEven.name', 'breakeven': 'calculators.breakEven.name',
    'property': 'calculators.property.name',
    'gst': 'calculators.gst.name',
    'two wheeler loan': 'calculators.twoWheeler.name',
    'car loan': 'calculators.carLoan.name',
    'personal loan': 'calculators.personalLoan.name',
    'education loan': 'calculators.educationLoan.name',
    'overdraft': 'calculators.overdraft.name',
    'goal planner': 'calculators.goalPlanner.name',
    'mortgage': 'calculators.advancedMortgage.name', 'advanced mortgage': 'calculators.advancedMortgage.name',
    'insurance': 'calculators.insurance.name',
    'insurance compare': 'calculators.insuranceCompare.name',
    'gold loan': 'calculators.goldLoan.name',
    'capital gains': 'calculators.capitalGains.name',
    'lrs tcs': 'calculators.lrsTcs.name',
    'cc payoff': 'calculators.ccPayoff.name',
    'cc interest': 'calculators.ccInterest.name', 'credit card interest': 'calculators.ccInterest.name',
    'cc compare': 'calculators.ccCompare.name', 'credit card compare': 'calculators.ccCompare.name',
    'asset rebalancer': 'calculators.prag.name', 'prag': 'calculators.prag.name',
    'age': 'calculators.age.name',
};

function normalize(name: string): string {
    return name.toLowerCase().replace(/[_-]/g, ' ').replace(/\bcalculator\b/g, '').replace(/\s+/g, ' ').trim();
}

/** i18n key of a saved calculator name, or undefined when it is not a known English name. */
export function calcNameKey(calculatorType: string | undefined | null): string | undefined {
    if (!calculatorType) return undefined;
    return NAME_KEYS[normalize(calculatorType)];
}
