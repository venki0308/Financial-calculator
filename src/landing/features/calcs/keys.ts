/** The feature-page calculators (one island each). Kept free of React so types can import it. */
export const CALC_KEYS = ['taxRegime', 'incomeTax', 'prepayment', 'goalSip', 'stepUpSip', 'ssy', 'ccInterest', 'goldLoan', 'poTd'] as const;
export type CalcKey = typeof CALC_KEYS[number];
