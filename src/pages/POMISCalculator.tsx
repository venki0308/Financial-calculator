import { useEffect } from 'react';
import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

const config = {
    title: 'Post Office MIS',
    subtitle: 'Monthly Income Scheme',
    color: 'brand-blue',
    fields: [
        { key: 'investment', label: 'Total Investment', defaultVal: 450000, min: 1000, max: 1500000, prefix: '₹', helperText: 'Max: 9L (Single), 15L (Joint)' },
        { key: 'rate', label: 'Interest Rate (p.a.)', defaultVal: 7.4, min: 1, max: 15, suffix: '%', step: 0.1 },
    ],
    compute: (v: Record<string, number>) => {
        const monthlyIncome = (v.investment * v.rate / 100) / 12;
        return {
            primary: monthlyIncome, label: 'Monthly Income',
            rows: [
                { label: 'Principal at Maturity', value: formatINR(v.investment) },
                { label: 'Total Interest (5 yrs)', value: formatINR(monthlyIncome * 60), color: 'text-brand-green' },
            ],
        };
    },
};

export default function POMISCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('POMIS_Calculator'); }, []); return <GenericCalculator config={config} />;
}