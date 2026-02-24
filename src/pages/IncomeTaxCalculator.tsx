import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';

const config = {
    title: 'Income Tax Calculator',
    subtitle: 'FY 2025-26 (Old vs New Regime)',
    color: 'brand-green',
    fields: [
        { key: 'income', label: 'Annual Income', defaultVal: 1000000, min: 0, max: 100000000, prefix: '₹', helperText: 'Total annual gross income' },
        { key: 'deductions', label: 'Total Deductions (Old Regime)', defaultVal: 150000, min: 0, max: 2000000, prefix: '₹', helperText: '80C, 80D, etc. (Not for New Regime)' },
    ],
    compute: (v: Record<string, number>) => {
        const income = v['income'];
        const deductions = v['deductions'];

        const calculateTax = (inc: number, regime: 'new' | 'old') => {
            let taxable = regime === 'old' ? Math.max(0, inc - deductions - 50000) : Math.max(0, inc - 75000);
            let tax = 0;
            if (regime === 'new') {
                if (taxable <= 1200000) return 0;
                if (taxable > 1200000) {
                    tax = (taxable - 1200000) * 0.2 + 60000;
                }
            } else {
                if (taxable <= 500000) return 0;
                tax = taxable * 0.1;
            }
            return tax * 1.04;
        };

        const newTax = calculateTax(income, 'new');
        const oldTax = calculateTax(income, 'old');

        return {
            primary: newTax, label: 'Tax (New Regime)',
            rows: [
                { label: 'Tax (Old Regime)', value: formatINR(oldTax), color: 'text-slate-400' },
                { label: 'Savings in New Regime', value: formatINR(Math.max(0, oldTax - newTax)), color: 'text-brand-green' },
                { label: 'Standard Deduction', value: '₹75,000 (New) / ₹50,000 (Old)', color: 'text-brand-blue' },
            ],
        };
    },
    formulaText: 'Tax calculated based on Finance Act 2025. Rebate u/s 87A up to ₹12L in New Regime.',
};

export default function IncomeTaxCalculator() { return <GenericCalculator config={config} />; }
