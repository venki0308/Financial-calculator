// ─── Unit Conversions (all expressed as sq.ft per unit) ──────────────────────
export const UNIT_CONV: Record<string, number> = {
    sqft: 1, sqm: 10.7639, sqyard: 9, cent: 435.6, gunta: 1089,
    ankanam: 72, gajam: 9, acre: 43560, ground: 2400, bigha: 27000, hectare: 107639,
};
export const UNIT_LABELS: Record<string, string> = {
    sqft: 'Square Feet', sqm: 'Square Meter', sqyard: 'Square Yard', cent: 'Cent',
    gunta: 'Gunta', ankanam: 'Ankanam', gajam: 'Gajam', acre: 'Acre',
    ground: 'Ground', bigha: 'Bigha', hectare: 'Hectare',
};
export const UNIT_SHORT: Record<string, string> = {
    sqft: 'Sq.ft', sqm: 'Sq.m', sqyard: 'Sq.yd', cent: 'Cent', gunta: 'Gunta',
    ankanam: 'Ankanam', gajam: 'Gajam', acre: 'Acre', ground: 'Ground', bigha: 'Bigha', hectare: 'Hectare',
};
export const UNIT_KEYS = Object.keys(UNIT_CONV);
export const REF_UNITS = ['cent', 'gunta', 'ankanam', 'gajam', 'acre', 'ground', 'bigha', 'hectare'];

// ─── Stamp Duty by state ─────────────────────────────────────────────────────
export const STATE_RATES: Record<string, { name: string; stamp: number; reg: number; transfer: number }> = {
    telangana: { name: 'Telangana', stamp: 4, reg: 0.5, transfer: 1.5 },
    andhra: { name: 'Andhra Pradesh', stamp: 5, reg: 1, transfer: 1.5 },
    karnataka: { name: 'Karnataka', stamp: 5.6, reg: 1, transfer: 0 },
    tamilnadu: { name: 'Tamil Nadu', stamp: 7, reg: 1, transfer: 0 },
    maharashtra: { name: 'Maharashtra', stamp: 5, reg: 1, transfer: 1 },
    delhi: { name: 'Delhi', stamp: 6, reg: 1, transfer: 0 },
    gujarat: { name: 'Gujarat', stamp: 4.9, reg: 1, transfer: 0 },
    rajasthan: { name: 'Rajasthan', stamp: 6, reg: 1, transfer: 0 },
    kerala: { name: 'Kerala', stamp: 8, reg: 2, transfer: 0 },
    westbengal: { name: 'West Bengal', stamp: 6, reg: 1, transfer: 0 },
};

// ─── Construction Grades ─────────────────────────────────────────────────────
export const CONSTRUCTION_GRADES = [
    { key: 'economy', label: 'Economy', rate: 1800 },
    { key: 'standard', label: 'Standard', rate: 2500 },
    { key: 'premium', label: 'Premium', rate: 3500 },
    { key: 'luxury', label: 'Luxury', rate: 5000 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const fmt = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;
export const fmtArea = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 3 });

export function calcEMI(principal: number, ratePA: number, tenureYears: number) {
    const r = ratePA / (12 * 100);
    const n = tenureYears * 12;
    if (r === 0) return { emi: principal / n, totalPayment: principal, totalInterest: 0 };
    const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    return { emi, totalPayment, totalInterest: totalPayment - principal };
}

export function getAmortization(principal: number, ratePA: number, tenureYears: number) {
    const r = ratePA / (12 * 100);
    const n = tenureYears * 12;
    const emi = r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    let balance = principal;
    const yearly: { year: number; principalPaid: number; interestPaid: number; balance: number }[] = [];
    let yrPrin = 0, yrInt = 0;
    for (let m = 1; m <= n; m++) {
        const intPart = balance * r;
        const prinPart = Math.min(emi - intPart, balance);
        balance -= prinPart;
        yrPrin += prinPart; yrInt += intPart;
        if (m % 12 === 0 || m === n) {
            yearly.push({ year: Math.ceil(m / 12), principalPaid: yrPrin, interestPaid: yrInt, balance: Math.max(0, balance) });
            yrPrin = 0; yrInt = 0;
        }
    }
    return yearly;
}
