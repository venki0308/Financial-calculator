import { useEffect } from 'react';
import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

const config = {
    title: 'NSC Calculator',
    subtitle: 'National Savings Certificate',
    color: 'brand-gold',
    fields: [
        { key: 'investment', label: 'Total Investment', defaultVal: 50000, min: 1000, max: 10000000, prefix: '₹' },
        { key: 'rate', label: 'Interest Rate (p.a.)', defaultVal: 7.7, min: 1, max: 15, suffix: '%', step: 0.1, helperText: 'Current: 7.7% (FY 2025-26)' },
    ],
    compute: (v: Record<string, number>) => {
        // NSC maturity: 5 years, compounded annually
        const years = 5;
        const maturity = v.investment * Math.pow(1 + v.rate / 100, years);
        return {
            primary: maturity, label: 'Maturity Amount',
            rows: [
                { label: 'Total Invested', value: formatINR(v.investment) },
                { label: 'Interest Earned', value: formatINR(maturity - v.investment), color: 'text-brand-green' },
                { label: 'Maturity Period', value: '5 Years' },
            ],
        };
    },
};

export default function NSCCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('NSC_Calculator'); }, []); return <GenericCalculator config={config} />;
}