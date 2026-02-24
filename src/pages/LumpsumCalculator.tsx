import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';

const config = {
    title: 'Lumpsum Calculator',
    subtitle: 'One-time investment growth',
    color: 'brand-blue',
    fields: [
        { key: 'principal', label: 'Total Investment', defaultVal: 100000, min: 1000, max: 100000000, prefix: '₹' },
        { key: 'rate', label: 'Expected Return (p.a.)', defaultVal: 12, min: 1, max: 30, suffix: '%' },
        { key: 'years', label: 'Time Period (years)', defaultVal: 10, min: 1, max: 40, suffix: ' years' },
    ],
    compute: (v: Record<string, number>) => {
        const fv = v.principal * Math.pow(1 + v.rate / 100, v.years);
        return {
            primary: fv, label: 'Estimated Maturity Value',
            rows: [
                { label: 'Total Invested', value: formatINR(v.principal) },
                { label: 'Wealth Gained', value: formatINR(fv - v.principal), color: 'text-brand-green' },
            ],
        };
    },
    formulaText: 'FV = P(1 + r)^n where P is principal, r is annual rate and n is years.',
};

export default function LumpsumCalculator() { return <GenericCalculator config={config} />; }
