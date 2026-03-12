import { useEffect } from 'react';
import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

const config = {
 title: 'SWP Calculator',
 subtitle: 'Systematic Withdrawal Plan',
 color: 'brand-blue',
 fields: [
 { key: 'principal', label: 'Total Investment', defaultVal: 1000000, min: 10000, max: 1000000000, prefix: '₹' },
 { key: 'withdrawal', label: 'Monthly Withdrawal', defaultVal: 10000, min: 500, max: 1000000, prefix: '₹' },
 { key: 'rate', label: 'Expected Return (p.a.)', defaultVal: 8, min: 1, max: 30, suffix: '%' },
 { key: 'years', label: 'Time Period (years)', defaultVal: 10, min: 1, max: 40, suffix: ' years' },
 ],
 compute: (v: Record<string, number>) => {
 const r = v.rate / 12 / 100;
 const n = v.years * 12;
 let balance = v.principal;
 let totalWithdrawn = 0;
 for (let i = 0; i < n; i++) {
 balance = (balance - v.withdrawal) * (1 + r);
 totalWithdrawn += v.withdrawal;
 if (balance < 0) { balance = 0; break; }
 }
 return {
 primary: balance, label: 'Final Balance',
 rows: [
 { label: 'Total Withdrawn', value: formatINR(totalWithdrawn), color: 'text-brand-green' },
 { label: 'Initial Principal', value: formatINR(v.principal) },
 ],
 };
 },
};

export default function SWPCalculator() {
 useEffect(() => { AnalyticsService.trackScreen('SWP_Calculator'); }, []); return <GenericCalculator config={config} />;
}