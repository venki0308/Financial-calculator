import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';

const config = {
    title: 'Post Office TD',
    subtitle: 'Time Deposit (FD)',
    color: 'brand-blue',
    fields: [
        { key: 'investment', label: 'Investment Amount', defaultVal: 100000, min: 1000, max: 10000000, prefix: '₹' },
        { key: 'years', label: 'Tenure (years)', defaultVal: 5, min: 1, max: 5, suffix: ' years' },
        { key: 'rate', label: 'Interest Rate (p.a.)', defaultVal: 7.5, min: 1, max: 15, suffix: '%', step: 0.1 },
    ],
    compute: (v: Record<string, number>) => {
        // Quarterly compounding but payable annually
        const r = v.rate / 400;
        const maturity = v.investment * Math.pow(1 + r, 4 * v.years);
        return {
            primary: maturity, label: 'Maturity Amount',
            rows: [
                { label: 'Total Invested', value: formatINR(v.investment) },
                { label: 'Interest Earned', value: formatINR(maturity - v.investment), color: 'text-brand-green' },
            ],
        };
    },
    formulaText: 'Post Office Time Deposit calculates interest quarterly and pays annually.',
};

export default function POTDCalculator() { return <GenericCalculator config={config} />; }
