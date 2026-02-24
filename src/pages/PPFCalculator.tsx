import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';

const config = {
    title: 'PPF Calculator',
    subtitle: 'Public Provident Fund returns',
    color: 'brand-green',
    fields: [
        { key: 'yearly', label: 'Yearly Investment', defaultVal: 150000, min: 500, max: 150000, prefix: '₹', helperText: '₹500 - ₹1,50,000/year' },
        { key: 'rate', label: 'Interest Rate (p.a.)', defaultVal: 7.1, min: 1, max: 15, suffix: '%', step: 0.1, helperText: 'Current rate: 7.1%' },
        { key: 'years', label: 'Period (years)', defaultVal: 15, min: 15, max: 50, suffix: ' years', helperText: '15 - 50 years (extendable in 5-yr blocks)' },
    ],
    compute: (v: Record<string, number>) => {
        const r = v.rate / 100;
        let balance = 0;
        for (let i = 0; i < v.years; i++) { balance = (balance + v.yearly) * (1 + r); }
        const invested = v.yearly * v.years;
        return {
            primary: balance, label: 'Maturity Amount',
            rows: [
                { label: 'Total Invested', value: formatINR(invested) },
                { label: 'Interest Earned', value: formatINR(balance - invested), color: 'text-brand-green' },
                { label: 'Tax Benefit (Sec 80C)', value: 'Up to ₹1,50,000/yr', color: 'text-brand-gold' },
            ],
        };
    },
    formulaText: 'PPF uses annual compounding. Deposits made before 5th earn interest for that month.',
};

export default function PPFCalculator() { return <GenericCalculator config={config} />; }
