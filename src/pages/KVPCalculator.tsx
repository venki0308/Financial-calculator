import { useEffect } from 'react';
import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

const config = {
    title: 'KVP Calculator',
    subtitle: 'Kisan Vikas Patra',
    color: 'brand-green',
    fields: [
        { key: 'investment', label: 'Investment Amount', defaultVal: 50000, min: 1000, max: 10000000, prefix: '₹' },
        { key: 'rate', label: 'Interest Rate (p.a.)', defaultVal: 7.5, min: 1, max: 15, suffix: '%', step: 0.1 },
    ],
    compute: (v: Record<string, number>) => {
        // Current doubling period for 7.5% is 115 months (9y 7m)
        const months = 115;
        const maturity = v.investment * 2;
        return {
            primary: maturity, label: 'Maturity Amount',
            rows: [
                { label: 'Principal', value: formatINR(v.investment) },
                { label: 'Doubling Period', value: '115 Months (9y 7m)', color: 'text-brand-blue' },
                { label: 'Interest Earned', value: formatINR(v.investment), color: 'text-brand-green' },
            ],
        };
    },
};

export default function KVPCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('KVP_Calculator'); }, []); return <GenericCalculator config={config} />;
}