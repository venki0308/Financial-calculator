import { useEffect } from 'react';
import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

const config = {
    title: 'Sukanya Samriddhi Yojana',
    subtitle: 'Girl Child Savings Scheme',
    color: 'brand-green',
    fields: [
        { key: 'annual', label: 'Annual Deposit', defaultVal: 50000, min: 250, max: 150000, prefix: '₹', helperText: 'Min ₹250, Max ₹1,50,000/year' },
        { key: 'rate', label: 'Interest Rate (p.a.)', defaultVal: 8.2, min: 1, max: 15, suffix: '%', step: 0.1, helperText: 'Current rate: 8.2%' },
        { key: 'age', label: 'Girl Child Age', defaultVal: 1, min: 0, max: 10, suffix: ' years' },
    ],
    compute: (v: Record<string, number>) => {
        const r = v.rate / 100;
        const investYears = 15; // Deposit for 15 years
        const maturityYears = 21; // Matures after 21 years
        let balance = 0;
        for (let i = 1; i <= maturityYears; i++) {
            if (i <= investYears) {
                balance = (balance + v.annual) * (1 + r);
            } else {
                balance = balance * (1 + r);
            }
        }
        const invested = v.annual * investYears;
        return {
            primary: balance, label: 'Maturity Amount',
            rows: [
                { label: 'Total Invested', value: formatINR(invested) },
                { label: 'Interest Earned', value: formatINR(balance - invested), color: 'text-brand-green' },
                { label: 'Maturity Age', value: `${v.age + 21} years`, color: 'text-brand-blue' },
            ],
        };
    },
    formulaText: 'SSY interest is compounded annually. Maturity is 21 years from account opening or marriage.',
};

export default function SSYCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('SSY_Calculator'); }, []); return <GenericCalculator config={config} />; }