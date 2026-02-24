import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';

const config = {
    title: 'Step Up SIP',
    subtitle: 'SIP with annual increment',
    color: 'brand-green',
    fields: [
        { key: 'initial', label: 'Initial Monthly SIP', defaultVal: 5000, min: 500, max: 1000000, prefix: '₹' },
        { key: 'stepUp', label: 'Annual Step-up (%)', defaultVal: 10, min: 1, max: 100, suffix: '%' },
        { key: 'rate', label: 'Expected Return (p.a.)', defaultVal: 12, min: 1, max: 30, suffix: '%' },
        { key: 'years', label: 'Time Period (years)', defaultVal: 10, min: 1, max: 40, suffix: ' years' },
    ],
    compute: (v: Record<string, number>) => {
        const r = v.rate / 12 / 100;
        let balance = 0;
        let totalInvested = 0;
        let monthly = v.initial;

        for (let y = 1; y <= v.years; y++) {
            for (let m = 1; m <= 12; m++) {
                balance = (balance + monthly) * (1 + r);
                totalInvested += monthly;
            }
            monthly *= (1 + v.stepUp / 100);
        }

        return {
            primary: balance, label: 'Estimated Future Value',
            rows: [
                { label: 'Total Invested', value: formatINR(totalInvested) },
                { label: 'Wealth Gained', value: formatINR(balance - totalInvested), color: 'text-brand-green' },
            ],
        };
    },
};

export default function StepUpSIPCalculator() { return <GenericCalculator config={config} />; }
