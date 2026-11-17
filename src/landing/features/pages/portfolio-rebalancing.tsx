/**
 * /portfolio-rebalancing — primary query "portfolio rebalancing calculator" (SEO_PLAN.md §5b).
 * Buy/sell amounts, modes, weighted return/volatility: the app's calculatePRAG
 * (src/utils/pragCalculations.ts, the "Asset Rebalancer" screen PRAGCalculator.tsx). Age-based
 * mixes: suggestAllocation (src/constants/assetAllocation.ts). Tax: Income-tax Act, 2025 ss.72,
 * 76, 196, 198; 4% cess (Finance Act 2026) — seo/research/verified-facts-invest.md.
 */
import { calculatePRAG } from '../../../utils/pragCalculations';
import type { PRAGInputs } from '../../../utils/pragCalculations';
import { ASSET_CLASSES, suggestAllocation } from '../../../constants/assetAllocation';
import type { AssetKey } from '../../../constants/assetAllocation';
import { amt, inr, pct, taxText } from '../fmt';
import { DataTable, Rules, Scenarios, Section } from '../ui';
import type { FeatureDef } from '../types';

const ACT = { label: 'Income-tax Act, 2025 (ss. 72, 76, 196, 198)', url: 'https://egazette.gov.in/WriteReadData/2025/265620.pdf' };
const FA = { label: 'Finance Act, 2026 (cess)', url: 'https://egazette.gov.in/WriteReadData/2026/271439.pdf' };
const SEBI = { label: 'SEBI investor site', url: 'https://investor.sebi.gov.in/' };

const zero: Record<AssetKey, number> = { equity: 0, debt: 0, gold: 0, realEstate: 0, international: 0, cash: 0 };
const HOLD = { ...zero, equity: 1400000, debt: 400000, gold: 100000, cash: 100000 };
const TARGET = { ...zero, equity: 60, debt: 30, gold: 10 };
const run = (mode: PRAGInputs['rebalanceMode'], monthly?: number) =>
    calculatePRAG({ holdings: HOLD, targetAllocation: TARGET, rebalanceMode: mode, newMonthlyInvestment: monthly });
const full = run('full');
const band = run('partial');
const NEW_MONEY = 25000;
const fresh = run('newInvestment', NEW_MONEY);
const act = (r: typeof full, k: AssetKey) => r.rebalancingActions.find((a) => a.key === k)!;
const moved = full.rebalancingActions.filter((a) => a.action === 'SELL').reduce((s, a) => s + a.amount, 0);
const NAME: Record<string, string> = { equity: 'Equity', debt: 'Debt', gold: 'Gold', cash: 'Cash' };
const SHOWN: AssetKey[] = ['equity', 'debt', 'gold', 'cash'];
const word = (a: { action: string; amount: number }) => (a.action === 'HOLD' ? 'Hold' : `${a.action === 'BUY' ? 'Buy' : 'Sell'} ${inr(a.amount)}`);

/** Tax on selling ₹2 lakh of equity-fund units that carry a ₹60,000 gain (rates from ss.196, 198 plus 4% cess). */
const GAIN = 60000;
const LTCG_FREE = 125000;
const stcgTax = GAIN * 0.20 * 1.04;
const ltcgTax = Math.max(0, GAIN - LTCG_FREE) * 0.125 * 1.04;

function Body() {
    const ages = [25, 35, 45, 55, 65];
    const mix = (age: number, risk: 'conservative' | 'moderate') => {
        const m = suggestAllocation(age, risk, 'wealth', 15, 1000000);
        return `${m.equity} / ${m.debt} / ${m.gold} / ${m.international} / ${m.cash}`;
    };
    return (
        <>
            <Section title={`Rebalancing a ${amt(full.totalPortfolioValue)} portfolio`}>
                <p>
                    A year of strong stock markets has pushed equity to {act(full, 'equity').currentPercent}% of this portfolio against a
                    plan of {TARGET.equity}%. The app’s rebalancer compares each holding with its target share of the total and lists the
                    trades:
                </p>
                <DataTable
                    caption="Holdings now, target mix and the trades to get there"
                    head={['Asset', 'Holding now', 'Share now', 'Target share', 'Target value', 'Trade']}
                    rows={SHOWN.map((k) => { const a = act(full, k); return [NAME[k], inr(a.currentValue), `${a.currentPercent}%`, `${a.targetPercent}%`, inr(a.targetValue), word(a)]; })}
                    note="FinCalix asset rebalancer, “full” mode: every holding goes straight back to its target share."
                />
            </Section>

            <Section title="Three ways to rebalance, compared">
                <DataTable
                    caption="Same portfolio, the app’s three modes"
                    head={['Mode', 'What it does', 'Trades in this example']}
                    rows={[
                        ['Full', 'Sell what is over target, buy what is under', SHOWN.filter((k) => act(full, k).action !== 'HOLD').map((k) => `${NAME[k]}: ${word(act(full, k))}`).join('; ')],
                        ['Tolerance band', 'Trade only assets more than 5 percentage points off target', SHOWN.filter((k) => act(band, k).action !== 'HOLD').map((k) => `${NAME[k]}: ${word(act(band, k))}`).join('; ')],
                        ['New money only', `Sell nothing; direct ${inr(NEW_MONEY)} a month to what is under target`, `${fresh.newInvestmentPlan!.monthsToRebalance} months: ${SHOWN.filter((k) => fresh.newInvestmentPlan!.allocationPerMonth[k] > 0).map((k) => `${inr(fresh.newInvestmentPlan!.allocationPerMonth[k])} to ${NAME[k].toLowerCase()}`).join(', ')}`],
                    ]}
                />
                <p>
                    The new-money route avoids selling and therefore any capital gains tax, at the cost of staying off target for
                    {' '}{fresh.newInvestmentPlan!.monthsToRebalance} months. The tolerance band leaves small gaps alone — here gold at
                    {' '}{act(band, 'gold').currentPercent}% against {TARGET.gold}% is not touched.
                </p>
            </Section>

            <Section title="How the trades are worked out">
                <ol className="steps">
                    <li>Total the portfolio: {SHOWN.map((k) => inr(HOLD[k])).join(' + ')} = {inr(full.totalPortfolioValue)}.</li>
                    <li>Target value of each asset = total × target share. Equity: {inr(full.totalPortfolioValue)} × {TARGET.equity}% = {inr(act(full, 'equity').targetValue)}.</li>
                    <li>Trade = target value − holding. Equity: {inr(act(full, 'equity').targetValue)} − {inr(HOLD.equity)} = −{inr(act(full, 'equity').amount)}, so sell {inr(act(full, 'equity').amount)}.</li>
                    <li>Sales and purchases balance: {inr(moved)} sold, {inr(moved)} bought, total unchanged.</li>
                </ol>
                <p>
                    The app also weighs each asset by an assumed return and volatility ({ASSET_CLASSES.filter((a) => SHOWN.includes(a.key)).map((a) => `${a.fallbackLabel.toLowerCase()} ${a.expectedReturn}%`).join(', ')}).
                    On those assumptions the current mix would earn {pct(full.currentExpectedReturn)} a year at {pct(full.currentVolatility)} volatility,
                    and the target mix {pct(full.targetExpectedReturn)} at {pct(full.targetVolatility)}: rebalancing trades a little expected return for a steadier ride.
                </p>
            </Section>

            <Section title="Starting mixes by age (the app’s suggestion)">
                <DataTable
                    caption="Suggested equity / debt / gold / international / cash, % — wealth goal, 15-year horizon, ₹10 lakh portfolio"
                    head={['Age', 'Conservative', 'Moderate']}
                    rows={ages.map((a) => [String(a), mix(a, 'conservative'), mix(a, 'moderate')])}
                    note="The rebalancer’s auto-suggest starts equity at 100 minus your age, adjusts for risk appetite and goal, keeps 10% in gold and at least 5% in cash. It is a starting point, not advice."
                />
            </Section>

            <Section title="Tax when you sell to rebalance">
                <Scenarios items={[
                    { title: `Selling ${inr(200000)} of equity-fund units held over 12 months`, body: <>If those units carry a gain of {inr(GAIN)} and you have no other long-term gains this year, the gain is under the {inr(LTCG_FREE)} yearly exemption: tax {taxText(ltcgTax)}.</> },
                    { title: 'The same sale within 12 months of buying', body: <>The {inr(GAIN)} gain is short-term and taxed at 20%: {inr(GAIN * 0.2)}, plus 4% cess = {inr(stcgTax)}.</> },
                    { title: 'Selling a debt fund to buy equity', body: <>For debt-fund units bought on or after 1 April 2023, the gain is short-term however long you held them, and is taxed at your slab rate along with your other income.</> },
                ]} />
            </Section>

            <Rules checked="2026-11-17" items={[
                { text: 'A sale is taxed on the gain: sale value minus cost of the units sold.', source: ACT },
                { text: 'Equity-fund units: 20% on short-term gains (held 12 months or less); 12.5% on long-term gains above ₹1.25 lakh in a tax year.', source: ACT },
                { text: 'Units of a fund with more than 65% in debt, bought on or after 1 April 2023: gains are always short-term (section 76).', source: ACT },
                { text: 'Health and education cess of 4% applies on top of the tax.', source: FA },
                { text: 'Assumed returns and volatilities are the app’s planning assumptions, not forecasts; market investments can lose value.', source: SEBI },
            ]} />
        </>
    );
}

export const portfolioRebalancingPage: FeatureDef = {
    slug: 'portfolio-rebalancing',
    title: 'Portfolio Rebalancing Calculator: Buy and Sell Amounts',
    description: 'Bring an equity, debt, gold and cash mix back to target: buy/sell amounts, rebalancing with new money only, age-based mixes and the tax on selling.',
    h1: 'Portfolio rebalancing calculator: what to buy and sell',
    crumb: 'Portfolio rebalancing',
    category: 'investments',
    updated: '2026-11-17',
    analyticsTitle: 'Website - Portfolio Rebalancing',
    eyebrow: 'Asset allocation · rebalancing',
    answer: (
        <>
            <p>A {amt(full.totalPortfolioValue)} portfolio that has drifted to {act(full, 'equity').currentPercent}% equity needs {inr(act(full, 'equity').amount)} of equity and {inr(act(full, 'cash').amount)} of cash sold, and {inr(act(full, 'debt').amount)} of debt and {inr(act(full, 'gold').amount)} of gold bought, to get back to {TARGET.equity}/{TARGET.debt}/{TARGET.gold}.</p>
            <p>Without selling, {inr(NEW_MONEY)} a month of new money gets there in {fresh.newInvestmentPlan!.monthsToRebalance} months. Selling fund units can trigger capital gains tax under the Income-tax Act, 2025.</p>
        </>
    ),
    sources: [ACT, SEBI],
    calc: { key: 'portfolio-rebalancing', props: { equity: HOLD.equity, debt: HOLD.debt, gold: HOLD.gold, cash: HOLD.cash, targetEquity: TARGET.equity, targetDebt: TARGET.debt, targetGold: TARGET.gold, monthly: NEW_MONEY } },
    Body,
    faqs: [
        { q: 'How do I rebalance my portfolio?', a: `Work out each asset’s target value (total × target %), then sell what is above it and buy what is below. In the example, ${amt(full.totalPortfolioValue)} at ${TARGET.equity}% equity means holding ${inr(act(full, 'equity').targetValue)} in equity, so ${inr(act(full, 'equity').amount)} is sold.` },
        { q: 'Can I rebalance without selling?', a: `Yes, by sending new investments only to the assets below target. ${inr(NEW_MONEY)} a month brings the example back on target in ${fresh.newInvestmentPlan!.monthsToRebalance} months with no sale and no capital gains tax.` },
        { q: 'How often should I rebalance?', a: 'There is no official rule; it is your own choice. You can rebalance on a fixed date or only when an asset drifts too far — the app’s tolerance mode acts at 5 percentage points.' },
        { q: 'What is asset allocation?', a: 'How your money is split between asset types such as equity, debt, gold and cash. Equity usually moves more than debt or cash, so the split shapes how much the whole portfolio can rise or fall.' },
        { q: 'What asset allocation suits my age?', a: `The app’s auto-suggest starts with equity at 100 minus your age, then adjusts for risk appetite and goal. At 35 with a moderate profile it suggests ${suggestAllocation(35, 'moderate', 'wealth', 15, 1000000).equity}% equity.` },
        { q: 'Is there tax on rebalancing?', a: `Only when you sell at a gain. A ${inr(GAIN)} short-term gain on equity-fund units costs ${inr(stcgTax)} including cess; the same gain held over 12 months is within the ${inr(LTCG_FREE)} yearly long-term exemption if you have no other such gains.` },
    ],
    related: [
        { href: '/stp', label: 'STP calculator', note: 'Shift money between funds in steps' },
        { href: '/capital-gains', label: 'Capital gains calculator', note: 'Tax on the units you sell' },
        { href: '/sip', label: 'SIP calculator', note: 'Monthly investing into the target mix' },
        { href: '/cagr', label: 'CAGR calculator', note: 'Yearly growth of each holding' },
        { href: '/goal-planner', label: 'Goal planner', note: 'Match the mix to a goal date' },
    ],
    disclaimer: 'invest',
};
