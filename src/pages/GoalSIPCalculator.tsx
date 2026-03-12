import { useEffect } from 'react';
import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

const config = {
    title: 'Goal SIP Calculator',
    subtitle: 'How much to invest for your goal?',
    color: 'brand-blue',
    fields: [
        { key: 'target', label: 'Target Amount', defaultVal: 1000000, min: 10000, max: 1000000000, prefix: '₹' },
        { key: 'years', label: 'In how many years?', defaultVal: 5, min: 1, max: 40, suffix: ' years' },
        { key: 'rate', label: 'Expected Return (p.a.)', defaultVal: 12, min: 1, max: 30, suffix: '%' },
    ],
    compute: (v: Record<string, number>) => {
        const r = v.rate / 12 / 100;
        const n = v.years * 12;
        const denominator = ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
        const monthlyNeeded = v.target / denominator;

        return {
            primary: monthlyNeeded, label: 'Monthly SIP Required',
            rows: [
                { label: 'Target Amount', value: formatINR(v.target) },
                { label: 'Total Invested', value: formatINR(monthlyNeeded * n) },
                { label: 'Estimated Returns', value: formatINR(v.target - (monthlyNeeded * n)), color: 'text-brand-green' },
            ],
        };
    },
};

export default function GoalSIPCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Goal_SIP'); }, []); return <GenericCalculator config={config} />;
}
