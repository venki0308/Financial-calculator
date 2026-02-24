import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';

const config = {
    title: 'NPS Calculator',
    subtitle: 'National Pension Scheme',
    color: 'brand-blue',
    fields: [
        { key: 'monthly', label: 'Monthly Contribution', defaultVal: 5000, min: 500, max: 200000, prefix: '₹', helperText: '₹500 - ₹2,00,000' },
        { key: 'rate', label: 'Expected Return (p.a.)', defaultVal: 10, min: 4, max: 14, suffix: '%', step: 0.5, helperText: '4% - 14%' },
        { key: 'age', label: 'Current Age', defaultVal: 30, min: 18, max: 55, suffix: ' years', helperText: '18 - 55 years' },
        { key: 'retireAge', label: 'Retirement Age', defaultVal: 60, min: 55, max: 70, suffix: ' years', helperText: '55 - 70 years' },
        { key: 'annuityPct', label: 'Annuity Purchase (%)', defaultVal: 40, min: 40, max: 100, suffix: '%', helperText: 'Min 40% must buy annuity' },
    ],
    compute: (v: Record<string, number>) => {
        const years = Math.max(v.retireAge - v.age, 1);
        const r = v.rate / 12 / 100;
        const n = years * 12;
        const invested = v.monthly * n;
        const fv = r === 0 ? invested : v.monthly * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
        const annuity = fv * (v.annuityPct / 100);
        const lumpsum = fv - annuity;
        const monthlyPension = annuity * 0.06 / 12; // ~6% annuity rate estimate
        return {
            primary: fv, label: 'Total Corpus at Retirement',
            rows: [
                { label: 'Total Invested', value: formatINR(invested) },
                { label: 'Wealth Gained', value: formatINR(fv - invested), color: 'text-brand-green' },
                { label: 'Lumpsum Withdrawal', value: formatINR(lumpsum), color: 'text-brand-blue' },
                { label: 'Annuity Investment', value: formatINR(annuity) },
                { label: 'Est. Monthly Pension', value: formatINR(monthlyPension), color: 'text-brand-gold' },
                { label: 'Tax Benefit (Sec 80CCD)', value: 'Up to ₹2,00,000', color: 'text-brand-gold' },
            ],
        };
    },
    formulaText: 'NPS corpus = SIP FV formula. Min 40% annuity purchase mandatory at retirement.',
};

export default function NPSCalculator() { return <GenericCalculator config={config} />; }
