import { useEffect } from 'react';
import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

const config = {
    title: 'Break Even Calculator',
    subtitle: 'Business planning',
    color: 'brand-green',
    fields: [
        { key: 'fixed', label: 'Fixed Costs', defaultVal: 50000, min: 0, max: 10000000, prefix: '₹', helperText: 'Rent, salaries, etc.' },
        { key: 'price', label: 'Selling Price per Unit', defaultVal: 200, min: 1, max: 1000000, prefix: '₹' },
        { key: 'variable', label: 'Variable Cost per Unit', defaultVal: 120, min: 0, max: 1000000, prefix: '₹' },
    ],
    compute: (v: Record<string, number>) => {
        const contribution = v.price - v.variable;
        const breakEvenUnits = contribution > 0 ? v.fixed / contribution : 0;
        const breakEvenSales = breakEvenUnits * v.price;

        return {
            primary: breakEvenUnits, label: 'Units to Break Even',
            rows: [
                { label: 'Break Even Sales', value: formatINR(breakEvenSales), color: 'text-brand-green' },
                { label: 'Margin per Unit', value: formatINR(contribution), color: 'text-brand-blue' },
            ],
        };
    },
};

export default function BreakEvenCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('BreakEven'); }, []); return <GenericCalculator config={config} />;
}