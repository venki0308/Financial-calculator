import { useEffect } from 'react';
import GenericCalculator from '../components/GenericCalculator';
import { formatINR } from '../utils/calculations';
import { AnalyticsService } from '../lib/analytics';

const config = {
 title: 'CAGR Calculator',
 subtitle: 'Compound Annual Growth Rate',
 color: 'brand-purple',
 fields: [
 { key: 'initial', label: 'Initial Investment', defaultVal: 100000, min: 100, max: 100000000, prefix: '₹' },
 { key: 'final', label: 'Final Value', defaultVal: 200000, min: 100, max: 500000000, prefix: '₹' },
 { key: 'years', label: 'Time Period (years)', defaultVal: 5, min: 0.1, max: 50, suffix: ' years' },
 ],
 compute: (v: Record<string, number>) => {
 const cagr = (Math.pow(v.final / v.initial, 1 / v.years) - 1) * 100;
 return {
 primary: cagr, label: 'CAGR (%)',
 rows: [
 { label: 'Total Returns', value: formatINR(v.final - v.initial), color: 'text-brand-green' },
 { label: 'Absolute Increase', value: `${((v.final / v.initial - 1) * 100).toFixed(2)}%` },
 ],
 };
 },
};

export default function CAGRCalculator() {
 useEffect(() => { AnalyticsService.trackScreen('CAGR_Calculator'); }, []); return <GenericCalculator config={config} />;
}