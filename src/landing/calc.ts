/**
 * State and results for the website's mini-calculator. The hero's figure card
 * and the calculator section are two views of this one store, so the hero
 * always shows the live result. All maths comes from the app's own code:
 * calculateReducingEMI / calculateSIP (utils/calculations) and
 * compareSalaryTax (utils/incomeTax). Nothing is re-implemented here.
 */
import { useSyncExternalStore } from 'react';
import { calculateReducingEMI, calculateSIP, formatINR, formatINRShort, formatINRWords } from '../utils/calculations';
import { compareSalaryTax } from '../utils/incomeTax';
import { playUrl } from './play';

export type Tab = 'emi' | 'sip' | 'tax';

export interface CalcState {
    tab: Tab;
    emi: { amount: number; rate: number; years: number };
    sip: { monthly: number; rate: number; years: number };
    tax: { salary: number; deductions: number };
}

/** Defaults match the demo inputs used for the app screenshots. */
export const DEFAULT_STATE: CalcState = {
    tab: 'emi',
    emi: { amount: 3000000, rate: 8.5, years: 20 },
    sip: { monthly: 5000, rate: 12, years: 10 },
    tax: { salary: 1450000, deductions: 375000 },
};

let state: CalcState = DEFAULT_STATE;
const listeners = new Set<() => void>();

export const calcStore = {
    get: () => state,
    update(fn: (s: CalcState) => CalcState) {
        state = fn(state);
        listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
        listeners.add(l);
        return () => { listeners.delete(l); };
    },
};

export function useCalc(): CalcState {
    return useSyncExternalStore(calcStore.subscribe, calcStore.get, () => DEFAULT_STATE);
}

export interface Row { label: string; value: string; tone?: 'money' | 'warn' | 'muted' }

export interface Result {
    tab: Tab;
    label: string;
    value: number;
    words: string;
    caption: string;
    rows: Row[];
    bar: { a: number; b: number; aLabel: string; bLabel: string };
    href: string;
    linkLabel: string;
    note: string;
}

const short = (v: number) => formatINRShort(v).replace(/L$/, ' lakh').replace(/Cr$/, ' crore');
const words = (v: number) => (Math.round(v) === 0 ? 'Zero rupees' : `${formatINRWords(v)} rupees`);
const yrs = (n: number) => `${n} year${n === 1 ? '' : 's'}`;

export function computeResult(s: CalcState): Result {
    if (s.tab === 'sip') {
        const { monthly, rate, years } = s.sip;
        const r = calculateSIP(monthly, rate, years);
        return {
            tab: 'sip', label: `Value after ${yrs(years)}`, value: r.futureValue, words: words(r.futureValue),
            caption: `${formatINR(monthly)} a month · ${rate}% a year · ${yrs(years)}`,
            rows: [
                { label: 'You invest', value: formatINR(r.invested) },
                { label: 'Estimated gains', value: formatINR(r.wealthGained), tone: 'money' },
                { label: 'Total value', value: formatINR(r.futureValue) },
            ],
            bar: { a: r.invested, b: Math.max(0, r.wealthGained), aLabel: 'Invested', bLabel: 'Gains' },
            href: playUrl('mini_calc'), linkLabel: 'Get the full breakdown in the app',
            note: `Assumes a fixed ${rate}% yearly return. Mutual fund returns go up and down with the market.`,
        };
    }
    if (s.tab === 'tax') {
        const { salary, deductions } = s.tax;
        const c = compareSalaryTax(salary, deductions);
        const newTax = Math.round(c.newTax.totalTax), oldTax = Math.round(c.oldTax.totalTax);
        const lower = Math.min(newTax, oldTax);
        const label = newTax === oldTax ? (newTax === 0 ? 'No tax in either regime' : 'Same tax in both regimes')
            : `Lower tax: ${newTax < oldTax ? 'New' : 'Old'} Regime`;
        return {
            tab: 'tax', label, value: lower, words: words(lower),
            caption: `${short(salary)} salary · ${short(deductions)} Old Regime deductions`,
            rows: [
                { label: 'New Regime tax', value: formatINR(newTax), tone: newTax <= oldTax ? 'money' : undefined },
                { label: 'Old Regime tax', value: formatINR(oldTax), tone: oldTax < newTax ? 'money' : undefined },
                { label: 'You save', value: formatINR(Math.abs(newTax - oldTax)) },
            ],
            bar: { a: newTax, b: oldTax, aLabel: 'New Regime', bLabel: 'Old Regime' },
            href: playUrl('mini_calc'), linkLabel: 'Get the full breakdown in the app',
            note: 'FY 2026-27, salaried resident below 60, including 4% cess. An estimate, not tax advice.',
        };
    }
    const { amount, rate, years } = s.emi;
    const r = calculateReducingEMI(amount, rate, years * 12);
    return {
        tab: 'emi', label: 'Monthly EMI', value: r.emi, words: words(r.emi),
        caption: `${short(amount)} · ${rate}% · ${yrs(years)}`,
        rows: [
            { label: 'Loan amount', value: formatINR(amount) },
            { label: 'Total interest', value: formatINR(r.totalInterest), tone: 'warn' },
            { label: 'Total payment', value: formatINR(r.totalPayment) },
        ],
        bar: { a: amount, b: r.totalInterest, aLabel: 'Principal', bLabel: 'Interest' },
        href: playUrl('mini_calc'), linkLabel: 'Get the full breakdown in the app',
        note: 'Reducing-balance EMI. An estimate for planning; your lender’s figures may differ.',
    };
}

export { formatINR };
