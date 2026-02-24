import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';

const config = {
    title: 'Gratuity Calculator',
    subtitle: 'Service gratuity estimate',
    color: 'brand-blue',
    fields: [
        { key: 'salary', label: 'Last Drawn Salary (Basic + DA)', defaultVal: 50000, min: 0, max: 10000000, prefix: '₹', helperText: 'Monthly Basic + DA' },
        { key: 'years', label: 'Years of Service', defaultVal: 5, min: 5, max: 50, suffix: ' years', helperText: 'Min 5 years for eligibility' },
    ],
    compute: (v: Record<string, number>) => {
        // Formula: (Last Drawn Salary * 15 * Years of Service) / 26
        const gratuity = (v.salary * 15 * v.years) / 26;
        return {
            primary: gratuity, label: 'Estimated Gratuity',
            rows: [
                { label: 'Service Period', value: `${v.years} years` },
                { label: 'Tax Exemption', value: 'Up to ₹20 Lakhs', color: 'text-brand-green' },
            ],
        };
    },
    formulaText: 'Gratuity Formula = (Basic Salary + DA) × (15/26) × Years of Service.',
};

export default function GratuityCalculator() { return <GenericCalculator config={config} />; }
