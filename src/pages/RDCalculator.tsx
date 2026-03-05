import { useEffect } from 'react';
import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

const config = {
    title: 'Recurring Deposit',
    subtitle: 'RD returns calculator',
    color: 'brand-blue',
    fields: [
        { key: 'monthly', label: 'Monthly Deposit', defaultVal: 5000, min: 100, max: 1000000, prefix: '₹' },
        { key: 'rate', label: 'Interest Rate (p.a.)', defaultVal: 6.7, min: 1, max: 15, suffix: '%', step: 0.1 },
        { key: 'months', label: 'Time Period (months)', defaultVal: 12, min: 6, max: 120, suffix: ' months' },
    ],
    compute: (v: Record<string, number>) => {
        // RD maturity = P * (1+r)^n + P * (1+r)^(n-1) ...
        // Quarterly compounding is standard for bank RDs
        const r = v.rate / 400; // quarterly rate
        let maturity = 0;
        for (let i = 1; i <= v.months; i++) {
            maturity += v.monthly * Math.pow(1 + r, (v.months - i + 1) / 3);
        }
        const invested = v.monthly * v.months;
        return {
            primary: maturity, label: 'Maturity Amount',
            rows: [
                { label: 'Total Invested', value: formatINR(invested) },
                { label: 'Interest Earned', value: formatINR(maturity - invested), color: 'text-brand-green' },
            ],
        };
    },
    formulaText: 'RD maturity value is based on quarterly compounding of interest.',
};

export default function RDCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('RD_Calculator'); }, []); return <GenericCalculator config={config} />; }