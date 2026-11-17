/** /portfolio-rebalancing calculator: buy/sell amounts to reach a target mix (the app's calculatePRAG, src/utils/pragCalculations.ts). */
import { useState } from 'react';
import { Field } from '../../../Field';
import { Shell, Toggle, inr } from '../Shell';
import type { Row } from '../Shell';
import { calculatePRAG } from '../../../../utils/pragCalculations';

type Mode = 'full' | 'newInvestment';
const NAMES = { equity: 'Equity', debt: 'Debt', gold: 'Gold', cash: 'Cash' } as const;
type K = keyof typeof NAMES;

export default function RebalanceCalc(p: Record<string, unknown>) {
    const [equity, setEquity] = useState(Number(p.equity ?? 1400000));
    const [debt, setDebt] = useState(Number(p.debt ?? 400000));
    const [gold, setGold] = useState(Number(p.gold ?? 100000));
    const [cash, setCash] = useState(Number(p.cash ?? 100000));
    const [tEq, setTEq] = useState(Number(p.targetEquity ?? 60));
    const [tDebt, setTDebt] = useState(Number(p.targetDebt ?? 30));
    const [tGold, setTGold] = useState(Number(p.targetGold ?? 10));
    const [mode, setMode] = useState<Mode>('full');
    const [monthly, setMonthly] = useState(Number(p.monthly ?? 25000));
    const tCash = 100 - tEq - tDebt - tGold;
    const ok = tCash >= 0;
    const r = calculatePRAG({
        holdings: { equity, debt, gold, cash, realEstate: 0, international: 0 },
        targetAllocation: { equity: tEq, debt: tDebt, gold: tGold, cash: Math.max(0, tCash), realEstate: 0, international: 0 },
        rebalanceMode: mode,
        newMonthlyInvestment: mode === 'newInvestment' ? monthly : undefined,
    });
    const keys: K[] = ['equity', 'debt', 'gold', 'cash'];
    const acts = r.rebalancingActions.filter((a) => a.key in NAMES);
    const plan = r.newInvestmentPlan;
    const rows: Row[] = mode === 'full'
        ? acts.map((a) => ({ label: `${NAMES[a.key as K]} (${a.currentPercent}% → ${a.targetPercent}%)`, value: a.action === 'HOLD' ? 'Hold' : `${a.action === 'BUY' ? 'Buy' : 'Sell'} ${inr(a.amount)}`, tone: a.action === 'SELL' ? 'warn' : a.action === 'BUY' ? 'money' : undefined }))
        : keys.map((k) => ({ label: `${NAMES[k]} each month`, value: inr(plan?.allocationPerMonth[k] ?? 0) }));
    const sold = acts.filter((a) => a.action === 'SELL').reduce((s, a) => s + a.amount, 0);
    return (
        <Shell campaign={String(p.campaign)} eyebrow="Your holdings now, and the mix you want"
            inputs={<>
                <Field label="Equity (shares, equity funds)" money prefix="₹" value={equity} min={0} max={20000000} step={10000} onChange={setEquity} />
                <Field label="Debt (debt funds, FDs, PPF)" money prefix="₹" value={debt} min={0} max={20000000} step={10000} onChange={setDebt} />
                <Field label="Gold" money prefix="₹" value={gold} min={0} max={10000000} step={10000} onChange={setGold} />
                <Field label="Cash and liquid funds" money prefix="₹" value={cash} min={0} max={10000000} step={10000} onChange={setCash} />
                <Field label="Target equity" suffix="%" value={tEq} min={0} max={100} step={5} onChange={(v) => setTEq(Math.round(v))} />
                <Field label="Target debt" suffix="%" value={tDebt} min={0} max={100} step={5} onChange={(v) => setTDebt(Math.round(v))} />
                <Field label="Target gold" suffix="%" value={tGold} min={0} max={50} step={5} onChange={(v) => setTGold(Math.round(v))} hint={ok ? `Cash gets the rest: ${tCash}%.` : 'The three targets add up to more than 100%.'} />
                <Toggle label="How to rebalance" value={mode} onChange={setMode}
                    options={[{ id: 'full', label: 'Sell and buy now' }, { id: 'newInvestment', label: 'Only with new money' }]} />
                {mode === 'newInvestment' && <Field label="New money each month" money prefix="₹" value={monthly} min={1000} max={1000000} step={1000} onChange={setMonthly} />}
            </>}
            label={mode === 'full' ? 'Amount to move' : 'Months to get back on target'}
            figure={!ok ? '—' : mode === 'full' ? inr(sold) : String(plan?.monthsToRebalance ?? 0)}
            words={mode === 'full' ? `out of ${inr(r.totalPortfolioValue)} in all` : `investing ${inr(monthly)} a month, selling nothing`}
            rows={ok ? rows : [{ label: 'Targets', value: 'Must add up to 100% or less', tone: 'warn' }]}
            note="Same engine as the app's asset rebalancer. Selling can create capital gains tax; see the rules below." />
    );
}
