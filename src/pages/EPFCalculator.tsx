import { useEffect } from 'react';
import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

const config = {
    title: 'EPF Calculator',
    subtitle: 'Employee Provident Fund',
    color: 'brand-gold',
    fields: [
        { key: 'basic', label: 'Basic Salary + DA', defaultVal: 30000, min: 5000, max: 500000, prefix: '₹', helperText: 'Monthly basic + DA' },
        { key: 'empPct', label: 'Employee Contribution (%)', defaultVal: 12, min: 12, max: 20, suffix: '%', helperText: '12% minimum' },
        { key: 'rate', label: 'EPF Interest Rate', defaultVal: 8.25, min: 5, max: 12, suffix: '%', step: 0.05, helperText: 'FY 2025-26: 8.25%' },
        { key: 'age', label: 'Current Age', defaultVal: 28, min: 18, max: 55, suffix: ' years' },
        { key: 'retireAge', label: 'Retirement Age', defaultVal: 58, min: 55, max: 60, suffix: ' years' },
        { key: 'hike', label: 'Annual Salary Hike (%)', defaultVal: 5, min: 0, max: 20, suffix: '%', step: 0.5 },
    ],
    compute: (v: Record<string, number>) => {
        const years = Math.max(v.retireAge - v.age, 1);
        const r = v.rate / 12 / 100;
        let balance = 0, totalEmp = 0, totalEmployer = 0;
        let salary = v.basic;
        for (let y = 0; y < years; y++) {
            for (let m = 0; m < 12; m++) {
                const emp = salary * v.empPct / 100;
                const employer = salary * 3.67 / 100; // employer EPF portion (8.33% goes to EPS)
                balance = (balance + emp + employer) * (1 + r);
                totalEmp += emp;
                totalEmployer += employer;
            }
            salary *= (1 + v.hike / 100);
        }
        return {
            primary: balance, label: 'EPF Corpus at Retirement',
            rows: [
                { label: 'Your Contribution', value: formatINR(totalEmp) },
                { label: 'Employer EPF Contribution', value: formatINR(totalEmployer) },
                { label: 'Interest Earned', value: formatINR(balance - totalEmp - totalEmployer), color: 'text-brand-green' },
            ],
        };
    },
    formulaText: 'EPF: Employee 12% + Employer 3.67% (EPF) + 8.33% (EPS). Interest compounded monthly.',
};

export default function EPFCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('EPF_Calculator'); }, []); return <GenericCalculator config={config} />; }