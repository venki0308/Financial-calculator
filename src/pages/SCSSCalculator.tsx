import { useEffect } from 'react';
import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

const config = {
    title: 'SCSS Calculator',
    subtitle: 'Senior Citizen Savings Scheme',
    color: 'brand-purple',
    fields: [
        { key: 'investment', label: 'Total Investment', defaultVal: 1500000, min: 1000, max: 3000000, prefix: '₹', helperText: 'Max: ₹30 Lakhs' },
        { key: 'rate', label: 'Interest Rate (p.a.)', defaultVal: 8.2, min: 1, max: 15, suffix: '%', step: 0.1 },
    ],
    compute: (v: Record<string, number>) => {
        const quarterlyIncome = (v.investment * v.rate / 100) / 4;
        return {
            primary: quarterlyIncome, label: 'Quarterly Income',
            rows: [
                { label: 'Principal Amount', value: formatINR(v.investment) },
                { label: 'Annual Income', value: formatINR(quarterlyIncome * 4), color: 'text-brand-green' },
                { label: 'Total Interest (5 yrs)', value: formatINR(quarterlyIncome * 20) },
            ],
        };
    },
};

export default function SCSSCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('SCSS_Calculator'); }, []); return <GenericCalculator config={config} />;
}
