import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator } from 'lucide-react';

/**
 * Atal Pension Yojana — monthly contribution lookup.
 *
 * APY contribution is determined by entry age and the chosen guaranteed
 * monthly pension at age 60 (₹1,000 / ₹2,000 / ₹3,000 / ₹4,000 / ₹5,000).
 * The official PFRDA chart specifies a fixed contribution per (age, pension)
 * cell. We embed the canonical chart here so users can pick their pension
 * tier and instantly see what to deposit each month.
 *
 * Source: https://www.npscra.proteantech.in/scheme-details/apy/
 * Verified Q1 FY 2026-27 (Apr-Jun 2026).
 */

// CONTRIBUTION CHART — monthly amount in ₹ for each (entry-age, pension) pair.
// Rows = entry age (18..40); columns = guaranteed pension (1k..5k).
// Indexed lookup: TABLE[age - 18][pensionTierIndex]
const TABLE: Record<number, [number, number, number, number, number]> = {
    18: [42, 84, 126, 168, 210],
    19: [46, 92, 138, 183, 228],
    20: [50, 100, 150, 198, 248],
    21: [54, 108, 162, 215, 269],
    22: [59, 117, 177, 234, 292],
    23: [64, 127, 192, 254, 318],
    24: [70, 139, 208, 277, 346],
    25: [76, 151, 226, 301, 376],
    26: [82, 164, 246, 327, 409],
    27: [90, 178, 268, 356, 446],
    28: [97, 194, 292, 388, 485],
    29: [106, 212, 318, 423, 529],
    30: [116, 231, 347, 462, 577],
    31: [126, 252, 379, 504, 630],
    32: [138, 276, 414, 551, 689],
    33: [151, 302, 453, 602, 752],
    34: [165, 330, 495, 659, 824],
    35: [181, 362, 543, 722, 902],
    36: [198, 396, 594, 792, 990],
    37: [218, 436, 654, 870, 1087],
    38: [240, 480, 720, 957, 1196],
    39: [264, 528, 792, 1054, 1318],
    40: [291, 582, 873, 1164, 1454],
};

const PENSIONS = [1000, 2000, 3000, 4000, 5000] as const;

export default function APYContributionCalculator() {
    const { t } = useTranslation();
    const [age, setAge] = useState(30);
    const [pensionIdx, setPensionIdx] = useState(2); // ₹3,000 default

    const monthlyContribution = useMemo(() => {
        const row = TABLE[Math.max(18, Math.min(40, age))];
        return row?.[pensionIdx] ?? 0;
    }, [age, pensionIdx]);

    const yearsToContribute = 60 - age;
    const totalDeposited = monthlyContribution * 12 * Math.max(1, yearsToContribute);
    const annualPension = PENSIONS[pensionIdx] * 12;

    return (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-violet-500/5 to-indigo-500/5 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-3">
                <Calculator size={16} className="text-violet-500" />
                <h3 className="text-sm font-bold text-foreground">
                    {t('schemes.apyCalcTitle', 'APY contribution calculator')}
                </h3>
            </div>
            <p className="text-[11px] text-muted-foreground mb-4">
                {t('schemes.apyCalcSubtitle', 'Pick your age and the pension you want at 60. The chart shows the exact monthly deposit (PFRDA fixed table).')}
            </p>

            {/* Age slider */}
            <div className="mb-4">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 flex justify-between">
                    <span>{t('schemes.apyEntryAge', 'Your age now')}</span>
                    <span className="text-violet-500 font-black">{age}</span>
                </label>
                <input
                    type="range"
                    min={18}
                    max={40}
                    step={1}
                    value={age}
                    onChange={e => setAge(Number(e.target.value))}
                    className="w-full"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                    <span>18</span>
                    <span>40</span>
                </div>
            </div>

            {/* Pension picker */}
            <div className="mb-4">
                <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 block">
                    {t('schemes.apyPensionGoal', 'Monthly pension at 60')}
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                    {PENSIONS.map((p, i) => (
                        <button
                            key={p}
                            onClick={() => setPensionIdx(i)}
                            className={`py-2 rounded-lg text-[10px] font-bold transition-all ${pensionIdx === i ? 'bg-violet-600 text-white shadow' : 'bg-white dark:bg-card border border-border text-muted-foreground'}`}
                        >
                            ₹{(p / 1000).toFixed(0)}K
                        </button>
                    ))}
                </div>
            </div>

            {/* Result */}
            <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-white dark:bg-card border border-violet-500/20">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground mb-0.5">
                        {t('schemes.apyMonthlyContrib', 'Monthly contribution')}
                    </p>
                    <p className="text-base font-black text-violet-500">
                        ₹{monthlyContribution.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                        {t('schemes.apyForYears', 'for {{years}} years', { years: yearsToContribute })}
                    </p>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-card border border-emerald-500/20">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground mb-0.5">
                        {t('schemes.apyAnnualPension', 'Annual pension at 60')}
                    </p>
                    <p className="text-base font-black text-emerald-500">
                        ₹{annualPension.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                        {t('schemes.apyTotalDeposited', 'You deposit ~{{total}}', { total: '₹' + (totalDeposited / 1000).toFixed(0) + 'K' })}
                    </p>
                </div>
            </div>

            <p className="text-[9px] text-muted-foreground mt-3 leading-snug">
                {t('schemes.apyNote', 'Per PFRDA chart. Govt co-contributes 50% (max ₹1,000/yr) for 5 years for non-tax-payer subscribers who joined before Mar 2016. Income tax payers ineligible since 1 Oct 2022.')}
            </p>
        </div>
    );
}
