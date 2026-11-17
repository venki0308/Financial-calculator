/** Number wording for the feature pages' text (Indian style). */
import { formatINR } from '../../utils/calculations';

/** ₹26,035 */
export const inr = (n: number) => formatINR(Math.round(n));

/** ₹30 lakh / ₹1 crore / ₹1.25 crore / ₹75,000 (for amounts written into sentences). */
export function amt(n: number): string {
    const r = Math.round(n);
    if (r >= 1e7) return `₹${trim(r / 1e7)} crore`;
    if (r >= 1e5) return `₹${trim(r / 1e5)} lakh`;
    return inr(r);
}
const trim = (v: number) => (Math.round(v * 100) / 100).toString().replace(/\.0+$/, '');

/** 7.5% */
export const pct = (v: number, dp = 2) => `${(Math.round(v * 10 ** dp) / 10 ** dp).toLocaleString('en-IN')}%`;

/** "Nil" for zero tax, else ₹ amount. */
export const taxText = (n: number) => (Math.round(n) === 0 ? 'Nil' : inr(n));
