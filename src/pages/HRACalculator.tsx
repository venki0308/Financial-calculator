import { useEffect } from 'react';
import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

const config = {
    title: 'HRA Calculator',
    subtitle: 'House Rent Allowance exemption',
    color: 'brand-gold',
    module: 'hra',
    fields: [
        { key: 'basic', label: 'Basic Salary (Monthly)', defaultVal: 40000, min: 0, max: 1000000, prefix: '₹' },
        { key: 'hra', label: 'HRA Received (Monthly)', defaultVal: 20000, min: 0, max: 1000000, prefix: '₹' },
        { key: 'rent', label: 'Rent Paid (Monthly)', defaultVal: 15000, min: 0, max: 1000000, prefix: '₹' },
        { key: 'isMetro', label: 'Live in Metro City?', defaultVal: 1, min: 0, max: 1, helperText: '1 for Yes, 0 for No' },
    ],
    compute: (v: Record<string, number>) => {
        const annualBasic = v.basic * 12;
        const annualHRA = v.hra * 12;
        const annualRent = v.rent * 12;

        const opt1 = annualHRA;
        const opt2 = v.isMetro === 1 ? annualBasic * 0.5 : annualBasic * 0.4;
        const opt3 = Math.max(0, annualRent - (annualBasic * 0.1));

        const exempt = Math.min(opt1, opt2, opt3);

        return {
            primary: exempt, label: 'Annual Tax Exempted HRA',
            rows: [
                { label: 'Taxable HRA', value: formatINR(annualHRA - exempt), color: 'text-brand-red' },
                { label: 'Monthly Exemption', value: formatINR(exempt / 12), color: 'text-brand-green' },
            ],
        };
    },
};

export default function HRACalculator() {
    useEffect(() => { AnalyticsService.trackScreen('HRA_Calculator'); }, []); return <GenericCalculator config={config} />;
}
