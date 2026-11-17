/**
 * The feature-page calculators. Rendered on the server with their starting values (so the page
 * shows a real result without JavaScript) and hydrated in the browser from one lazily loaded chunk.
 * Every result comes from the app's functions (src/utils) or features/math.ts / derive.ts.
 */
import { useState } from 'react';
import type { ComponentType } from 'react';
import { Field } from '../../Field';
import { Shell, Toggle, inr } from './Shell';
import type { CalcKey } from './keys';
import { compareSalaryTax } from '../../../utils/incomeTax';
import { calculateSIP } from '../../../utils/calculations';
import { getMinimumDue, getPayoffMonths, getTotalInterest, getTrueCost } from '../../../utils/creditCardCalculations';
import { breakEvenDeductions, prepaymentScenario, stepUpStartFor, yearsMonths } from '../derive';
import type { PrepayMode } from '../derive';
import { goalSip, goldLoanEligibility, poTd, ssyProjection, stepUpSip } from '../math';
import type { GoldPurity } from '../math';

export type CalcProps = { campaign: string } & Record<string, number | string | boolean>;
type P = CalcProps;
const n = (v: unknown, d: number) => (typeof v === 'number' ? v : d);
const pct = (v: number) => `${(Math.round(v * 100) / 100).toLocaleString('en-IN')}%`;

/** Old vs new regime: tax under both, which is lower, and the deductions at which old breaks even. */
function TaxRegimeCalc(p: P) {
    const [salary, setSalary] = useState(n(p.salary, 1500000));
    const [ded, setDed] = useState(n(p.deductions, 200000));
    const c = compareSalaryTax(salary, ded);
    const be = breakEvenDeductions(salary);
    const tie = c.oldTax.totalTax === c.newTax.totalTax;
    return (
        <Shell campaign={p.campaign} eyebrow="Salaried, below 60, FY 2026-27"
            inputs={<>
                <Field label="Yearly salary (gross)" money prefix="₹" value={salary} min={300000} max={10000000} step={25000} onChange={setSalary} />
                <Field label="Old Regime deductions" money prefix="₹" value={ded} min={0} max={1500000} step={5000}
                    hint="80C (now section 123), 80D (now 126), home-loan interest, HRA, your own NPS and similar. The standard deduction is added for you in both regimes." onChange={setDed} />
            </>}
            label={tie ? 'Both regimes cost the same' : `${c.betterRegime} Regime saves you`}
            figure={tie ? inr(c.newTax.totalTax) : inr(c.saving)}
            words={tie ? 'a year in either regime' : 'a year in tax'}
            rows={[
                { label: 'New Regime tax', value: inr(c.newTax.totalTax), tone: c.betterRegime === 'New' && !tie ? 'money' : undefined },
                { label: 'Old Regime tax', value: inr(c.oldTax.totalTax), tone: c.betterRegime === 'Old' && !tie ? 'money' : undefined },
                { label: 'Old Regime wins from', value: be === null ? 'Never' : be === 0 ? '₹0 of deductions' : `${inr(be)} of deductions` },
            ]}
            note="Tax includes the rebate (section 156, the old 87A), marginal relief, surcharge and 4% cess. Estimate only: your employer and the tax department compute the final figure." />
    );
}

/** Income tax for a salary, New Regime (default) with the Old Regime alongside. */
function IncomeTaxCalc(p: P) {
    const [salary, setSalary] = useState(n(p.salary, 1275000));
    const [ded, setDed] = useState(n(p.deductions, 0));
    const c = compareSalaryTax(salary, ded);
    const eff = salary > 0 ? (c.newTax.totalTax / salary) * 100 : 0;
    return (
        <Shell campaign={p.campaign} eyebrow="Salaried, below 60, FY 2026-27"
            inputs={<>
                <Field label="Yearly salary (gross)" money prefix="₹" value={salary} min={0} max={10000000} step={25000} onChange={setSalary} />
                <Field label="Old Regime deductions" money prefix="₹" value={ded} min={0} max={1500000} step={5000}
                    hint="Only for the Old Regime figure. The New Regime allows the ₹75,000 standard deduction." onChange={setDed} />
            </>}
            label="New Regime tax (default)"
            figure={c.newTax.totalTax === 0 ? 'Nil' : inr(c.newTax.totalTax)}
            words={c.newTax.totalTax === 0 ? 'no tax to pay' : `about ${inr(c.newTax.totalTax / 12)} a month`}
            rows={[
                { label: 'Taxable income (New)', value: inr(c.newTaxableIncome) },
                { label: 'Cess (4%) included', value: inr(c.newTax.cess) },
                { label: 'Effective rate', value: pct(eff) },
                { label: 'Old Regime tax', value: c.oldTax.totalTax === 0 ? 'Nil' : inr(c.oldTax.totalTax) },
            ]}
            note="Includes the rebate (section 156, the old 87A) with marginal relief, surcharge and cess. Estimate only." />
    );
}

/** Home loan prepayment: one lump sum, reduce tenure or reduce EMI. */
function PrepaymentCalc(p: P) {
    const [amount, setAmount] = useState(n(p.amount, 3000000));
    const [rate, setRate] = useState(n(p.rate, 8.5));
    const [years, setYears] = useState(n(p.years, 20));
    const [prepay, setPrepay] = useState(n(p.prepay, 300000));
    const [after, setAfter] = useState(n(p.afterYears, 3));
    const [mode, setMode] = useState<PrepayMode>('reduce_tenure');
    const afterMonths = Math.min(years * 12 - 1, Math.max(1, after * 12));
    const s = prepaymentScenario(amount, rate, years, Math.min(prepay, amount), afterMonths, mode);
    return (
        <Shell campaign={p.campaign} eyebrow="One part-prepayment"
            inputs={<>
                <Field label="Loan amount" money prefix="₹" value={amount} min={500000} max={30000000} step={100000} onChange={setAmount} />
                <Field label="Interest rate (per year)" suffix="%" value={rate} min={6} max={14} step={0.05} onChange={(v) => setRate(Math.round(v * 100) / 100)} />
                <Field label="Tenure" suffix=" years" value={years} min={5} max={30} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
                <Field label="Prepayment" money prefix="₹" value={prepay} min={0} max={5000000} step={25000} onChange={setPrepay} />
                <Field label="Paid after" suffix=" years" value={after} min={1} max={Math.max(1, years - 1)} step={1} onChange={(v) => setAfter(Math.max(1, Math.round(v)))} />
                <Toggle label="After the prepayment" value={mode} onChange={setMode}
                    options={[{ id: 'reduce_tenure', label: 'Keep EMI, cut tenure' }, { id: 'reduce_emi', label: 'Keep tenure, cut EMI' }]} />
            </>}
            label="Interest you save"
            figure={inr(s.saved)}
            words={mode === 'reduce_tenure' ? `loan ends ${yearsMonths(s.monthsSaved)} earlier` : `EMI drops by ${inr(s.emi - s.newEmi)} a month`}
            rows={[
                { label: 'EMI now', value: inr(s.emi) },
                mode === 'reduce_tenure'
                    ? { label: 'New tenure', value: yearsMonths(s.newMonths) }
                    : { label: 'New EMI', value: inr(s.newEmi), tone: 'money' },
                { label: 'Total interest, no prepayment', value: inr(s.baseInterest) },
                { label: 'Total interest, with prepayment', value: inr(s.newInterest) },
            ]}
            note="Same maths as the app's mortgage calculator (reducing balance, EMI rounded up). Your lender's statement is final." />
    );
}

/** Monthly SIP needed for a goal (₹1 crore by default), plus the step-up alternative. */
function GoalSipCalc(p: P) {
    const [target, setTarget] = useState(n(p.target, 10000000));
    const [years, setYears] = useState(n(p.years, 15));
    const [rate, setRate] = useState(n(p.rate, 12));
    const g = goalSip(target, years, rate);
    const step = stepUpStartFor(target, years, rate, 10);
    return (
        <Shell campaign={p.campaign} eyebrow="Monthly SIP for a goal"
            inputs={<>
                <Field label="Goal amount" money prefix="₹" value={target} min={1000000} max={100000000} step={500000} onChange={setTarget} />
                <Field label="Years to goal" suffix=" years" value={years} min={3} max={40} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
                <Field label="Expected return (per year)" suffix="%" value={rate} min={4} max={18} step={0.5} onChange={(v) => setRate(Math.round(v * 10) / 10)} />
            </>}
            label="Monthly SIP needed"
            figure={inr(g.monthlyNeeded)}
            words={`to reach ${inr(target)} in ${years} years`}
            rows={[
                { label: 'You invest in total', value: inr(g.invested) },
                { label: 'Growth (assumed return)', value: inr(g.gain), tone: 'money' },
                { label: 'Or start at, with 10% yearly step-up', value: inr(step) },
            ]}
            note="Assumed returns, not guaranteed. Mutual fund investments are subject to market risks." />
    );
}

/** Step-up SIP corpus vs a flat SIP. */
function StepUpSipCalc(p: P) {
    const [start, setStart] = useState(n(p.start, 10000));
    const [stepPct, setStepPct] = useState(n(p.step, 10));
    const [rate, setRate] = useState(n(p.rate, 12));
    const [years, setYears] = useState(n(p.years, 15));
    const s = stepUpSip(start, stepPct, rate, years);
    const flat = calculateSIP(start, rate, years);
    const last = s.yearly[s.yearly.length - 1];
    return (
        <Shell campaign={p.campaign} eyebrow="SIP raised once a year"
            inputs={<>
                <Field label="Starting monthly SIP" money prefix="₹" value={start} min={500} max={200000} step={500} onChange={setStart} />
                <Field label="Yearly step-up" suffix="%" value={stepPct} min={0} max={50} step={1} onChange={(v) => setStepPct(Math.round(v))} />
                <Field label="Expected return (per year)" suffix="%" value={rate} min={4} max={18} step={0.5} onChange={(v) => setRate(Math.round(v * 10) / 10)} />
                <Field label="Time period" suffix=" years" value={years} min={1} max={40} step={1} onChange={(v) => setYears(Math.max(1, Math.round(v)))} />
            </>}
            label="Corpus with step-up"
            figure={inr(s.futureValue)}
            words={`vs ${inr(flat.futureValue)} if the SIP never rises`}
            rows={[
                { label: 'You invest in total', value: inr(s.invested) },
                { label: 'Growth (assumed return)', value: inr(s.gain), tone: 'money' },
                { label: `Monthly SIP in year ${years}`, value: last ? inr(last.monthly) : inr(start) },
            ]}
            note="Same maths as the app's step-up SIP. Assumed returns, not guaranteed." />
    );
}

/** Sukanya Samriddhi maturity. */
function SsyCalc(p: P) {
    const [yearly, setYearly] = useState(n(p.yearly, 150000));
    const [age, setAge] = useState(n(p.age, 5));
    const rate = n(p.rate, 8.2);
    const r = ssyProjection(yearly, rate, age);
    return (
        <Shell campaign={p.campaign} eyebrow={`At ${rate}% (Oct–Dec 2026 rate)`}
            inputs={<>
                <Field label="Yearly deposit" money prefix="₹" value={yearly} min={250} max={150000} step={250} onChange={(v) => setYearly(Math.min(150000, Math.max(250, v)))} />
                <Field label="Girl's age when opened" suffix=" years" value={age} min={0} max={10} step={1} onChange={(v) => setAge(Math.min(10, Math.max(0, Math.round(v))))} />
            </>}
            label="Maturity value (21 years)"
            figure={inr(r.maturity)}
            words={`when she is ${r.maturityAge}`}
            rows={[
                { label: 'You deposit (15 years)', value: inr(r.invested) },
                { label: 'Interest earned', value: inr(r.interest), tone: 'money' },
                ...(r.at18 ? [{ label: 'Up to 50% for education at 18 (approx.)', value: inr(r.at18.balance * 0.5) }] : []),
            ]}
            note="Assumes the same deposit every year by 5 April and today's rate for all 21 years; the government resets the rate every quarter." />
    );
}

/** Credit card interest for a carried balance, minimum due and payoff time. */
function CcInterestCalc(p: P) {
    const [balance, setBalance] = useState(n(p.balance, 50000));
    const [monthlyRate, setMonthlyRate] = useState(n(p.monthlyRate, 3.5));
    const [days, setDays] = useState(n(p.days, 30));
    const [pay, setPay] = useState(n(p.payment, 5000));
    const apr = monthlyRate * 12;
    const cost = getTrueCost(balance, apr, days);
    const minDue = getMinimumDue(balance, apr);
    const months = getPayoffMonths(balance, apr, pay);
    const totalInt = getTotalInterest(balance, apr, pay);
    return (
        <Shell campaign={p.campaign} eyebrow="Interest on a carried balance"
            inputs={<>
                <Field label="Unpaid balance" money prefix="₹" value={balance} min={1000} max={1000000} step={1000} onChange={setBalance} />
                <Field label="Card interest rate (per month)" suffix="%" value={monthlyRate} min={1} max={4.5} step={0.05} onChange={(v) => setMonthlyRate(Math.round(v * 100) / 100)} hint={`${pct(apr)} a year. Your card's rate is in its MITC.`} />
                <Field label="Days the balance is carried" suffix=" days" value={days} min={1} max={60} step={1} onChange={(v) => setDays(Math.max(1, Math.round(v)))} />
                <Field label="You pay every month" money prefix="₹" value={pay} min={500} max={500000} step={500} onChange={setPay} />
            </>}
            label={`Interest + GST for ${days} days`}
            figure={inr(cost.total)}
            words={`${inr(cost.interest)} interest + ${inr(cost.gst)} GST (18%)`}
            rows={[
                { label: 'Typical minimum due', value: inr(minDue) },
                { label: `Time to clear at ${inr(pay)}/month`, value: months === Infinity ? 'Never (payment is below the interest)' : yearsMonths(months), tone: months === Infinity ? 'warn' : undefined },
                { label: 'Interest + GST paid till then', value: totalInt === Infinity ? '—' : inr(totalInt), tone: 'warn' },
            ]}
            note="Daily-balance method with 18% GST, as in the app. If you don't pay the full bill, interest can run from each purchase date; your card's MITC is final." />
    );
}

/** Gold loan eligibility per gram (RBI LTV tiers). */
function GoldLoanCalc(p: P) {
    const [grams, setGrams] = useState(n(p.grams, 50));
    const [purity, setPurity] = useState<GoldPurity>((p.purity as GoldPurity) || '22K');
    const [rate24, setRate24] = useState(n(p.rate24, 13420));
    const g = goldLoanEligibility(grams, rate24, purity);
    return (
        <Shell campaign={p.campaign} eyebrow="Loan against gold jewellery"
            inputs={<>
                <Field label="Gold weight (net)" suffix=" g" value={grams} min={1} max={1000} step={1} onChange={(v) => setGrams(Math.max(0, Math.round(v * 10) / 10))} />
                <Toggle label="Purity" value={purity} onChange={setPurity}
                    options={[{ id: '24K', label: '24K' }, { id: '22K', label: '22K' }, { id: '20K', label: '20K' }, { id: '18K', label: '18K' }]} />
                <Field label="24K gold rate (per gram)" money prefix="₹" value={rate24} min={5000} max={25000} step={10} onChange={setRate24}
                    hint={`IBJA 999 rate ₹${n(p.rate24, 13420).toLocaleString('en-IN')}/g on ${String(p.rateDate || '17 Nov 2026')}. Lenders may use a lower 30-day figure; see the rules below.`} />
            </>}
            label="Maximum loan"
            figure={inr(g.maxLoan)}
            words={`about ${inr(g.perGram)} per gram`}
            rows={[
                { label: 'Gold value', value: inr(g.value) },
                { label: 'LTV tier', value: `${g.ltv}%` },
            ]}
            note="RBI caps on the loan-to-value ratio; your lender may lend less. Stones and other materials are not counted." />
    );
}

/** Post Office Time Deposit: yearly interest and total, by tenure. */
function PoTdCalc(p: P) {
    const rates: Record<number, number> = { 1: n(p.r1, 6.9), 2: n(p.r2, 7.0), 3: n(p.r3, 7.1), 5: n(p.r5, 7.5) };
    const [amount, setAmount] = useState(n(p.amount, 100000));
    const [tenure, setTenure] = useState<'1' | '2' | '3' | '5'>((String(p.tenure || '5') as '1' | '2' | '3' | '5'));
    const yrs = Number(tenure);
    const t = poTd(amount, rates[yrs], yrs);
    return (
        <Shell campaign={p.campaign} eyebrow="Post Office Time Deposit, Oct–Dec 2026 rates"
            inputs={<>
                <Field label="Deposit" money prefix="₹" value={amount} min={1000} max={10000000} step={1000} onChange={(v) => setAmount(Math.max(1000, Math.round(v / 100) * 100))} />
                <Toggle label="Tenure" value={tenure} onChange={setTenure}
                    options={[{ id: '1', label: `1 yr · ${rates[1]}%` }, { id: '2', label: `2 yr · ${rates[2]}%` }, { id: '3', label: `3 yr · ${rates[3]}%` }, { id: '5', label: `5 yr · ${rates[5]}%` }]} />
            </>}
            label="Interest paid every year"
            figure={inr(t.yearlyInterest)}
            words={`${inr(t.interest)} over ${yrs} year${yrs === 1 ? '' : 's'}`}
            rows={[
                { label: 'Deposit back at maturity', value: inr(amount) },
                { label: 'Deposit + all interest', value: inr(t.total), tone: 'money' },
                { label: 'Effective yearly yield', value: pct(t.effectiveYield) },
            ]}
            note="Interest is compounded quarterly and paid yearly; the scheme pays no interest on interest left unwithdrawn. Interest is taxable." />
    );
}

export const CALCS: Record<CalcKey, ComponentType<P>> = {
    taxRegime: TaxRegimeCalc,
    incomeTax: IncomeTaxCalc,
    prepayment: PrepaymentCalc,
    goalSip: GoalSipCalc,
    stepUpSip: StepUpSipCalc,
    ssy: SsyCalc,
    ccInterest: CcInterestCalc,
    goldLoan: GoldLoanCalc,
    poTd: PoTdCalc,
};
