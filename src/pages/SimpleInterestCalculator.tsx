import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';

const config = {
    title: 'Simple Interest',
    subtitle: 'Basic interest calculator',
    color: 'brand-gold',
    fields: [
        { key: 'principal', label: 'Principal Amount', defaultVal: 100000, min: 100, max: 100000000, prefix: '₹' },
        { key: 'rate', label: 'Interest Rate (p.a.)', defaultVal: 10, min: 0.1, max: 100, suffix: '%' },
        { key: 'years', label: 'Time Period (years)', defaultVal: 1, min: 0.1, max: 50, suffix: ' years' },
    ],
    compute: (v: Record<string, number>) => {
        const interest = (v.principal * v.rate * v.years) / 100;
        const total = v.principal + interest;
        return {
            primary: total, label: 'Total Amount',
            rows: [
                { label: 'Principal', value: formatINR(v.principal) },
                { label: 'Interest Earned', value: formatINR(interest), color: 'text-brand-green' },
            ],
        };
    },
    formulaText: 'Simple Interest = (Principal × Rate × Time) / 100.',
};

export default function SimpleInterestCalculator() { return <GenericCalculator config={config} />; }
