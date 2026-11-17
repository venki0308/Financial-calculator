import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { m } from 'framer-motion';
import { calcStore, computeResult, useCalc, formatINR } from './calc';
import type { CalcState, Result, Tab } from './calc';

const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'emi', label: 'EMI' },
    { id: 'sip', label: 'SIP' },
    { id: 'tax', label: 'Income tax' },
];

const digits = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0;
const plain = (v: number) => formatINR(v).replace('₹', '');

interface FieldProps {
    label: string;
    hint?: string;
    value: number;
    min: number;
    max: number;
    step: number;
    prefix?: string;
    suffix?: string;
    money?: boolean;
    onChange: (v: number) => void;
}

/** A slider plus a typeable value. Typing accepts any amount; the slider covers the usual range. */
function Field({ label, hint, value, min, max, step, prefix, suffix, money, onChange }: FieldProps) {
    const id = useId();
    const [draft, setDraft] = useState<string | null>(null);
    const shown = draft ?? (money ? plain(value) : String(value));
    const clampSet = (v: number, lo: number, hi: number) => onChange(Math.min(hi, Math.max(lo, v)));
    const valueText = money ? formatINR(value) : `${value}${suffix ? ' ' + suffix.trim() : ''}`;
    return (
        <div className="field">
            <div className="field-top">
                <label htmlFor={id}>{label}</label>
                <span className="field-val">
                    {prefix && <span aria-hidden="true" className="affix">{prefix}</span>}
                    <input
                        id={id}
                        className="num"
                        inputMode={step < 1 ? 'decimal' : 'numeric'}
                        value={shown}
                        size={Math.max(3, shown.length)}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => {
                            setDraft(e.target.value);
                            const v = digits(e.target.value);
                            if (e.target.value.trim() !== '') clampSet(v, 0, max * 100);
                        }}
                        onBlur={() => { setDraft(null); clampSet(value, min, max * 100); }}
                    />
                    {suffix && <span aria-hidden="true" className="affix">{suffix}</span>}
                </span>
            </div>
            <input
                type="range"
                className="range"
                aria-label={label}
                aria-valuetext={valueText}
                min={min}
                max={max}
                step={step}
                value={Math.min(max, Math.max(min, value))}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{ ['--fill' as string]: `${((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100}%` }}
            />
            {hint && <p className="field-hint">{hint}</p>}
        </div>
    );
}

function set<K extends keyof CalcState>(key: K, patch: Partial<CalcState[K]>) {
    calcStore.update((s) => ({ ...s, [key]: { ...(s[key] as object), ...patch } }));
}

/** Short fade-and-rise when the big figure changes; plain swap when motion is reduced (MotionConfig). */
function Figure({ value, className }: { value: number; className: string }) {
    const first = useRef(true);
    useEffect(() => { first.current = false; }, []);
    const text = formatINR(value);
    return (
        <span className={className} aria-live="polite">
            <m.span
                key={text}
                className="figure-inner"
                initial={first.current ? false : { opacity: 0.35, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
            >
                {text}
            </m.span>
        </span>
    );
}

export function ResultCard({ result, variant }: { result: Result; variant: 'full' | 'hero' }) {
    const total = Math.max(1, result.bar.a + result.bar.b);
    if (variant === 'hero') {
        return (
            <div className="hero-card">
                <p className="eyebrow">{result.label}</p>
                <Figure value={result.value} className="hero-figure serif num" />
                <p className="hero-caption">{result.caption}</p>
                <a className="hero-change" href="#try">Change the numbers</a>
            </div>
        );
    }
    return (
        <div className="calc-out">
            <p className="eyebrow">{result.label}</p>
            <Figure value={result.value} className="big serif num" />
            <p className="words">{result.words}</p>
            <div className="bar" role="img" aria-label={`${result.bar.aLabel} ${formatINR(result.bar.a)}, ${result.bar.bLabel} ${formatINR(result.bar.b)}`}>
                <span className="bar-a" style={{ width: `${(result.bar.a / total) * 100}%` }} />
                <span className="bar-b" style={{ width: `${(result.bar.b / total) * 100}%` }} />
            </div>
            <div className="bar-key" aria-hidden="true"><span><i className="dot-a" />{result.bar.aLabel}</span><span><i className="dot-b" />{result.bar.bLabel}</span></div>
            <dl className="rows">
                {result.rows.map((r) => (
                    <div className="row" key={r.label}>
                        <dt>{r.label}</dt>
                        <dd className={`serif num${r.tone ? ' tone-' + r.tone : ''}`}>{r.value}</dd>
                    </div>
                ))}
            </dl>
            <a className="btn btn-ghost" href={result.href} data-play="mini_calc" target="_blank" rel="noopener">
                {result.linkLabel} <span aria-hidden="true">→</span>
            </a>
            <p className="disc">{result.note}</p>
        </div>
    );
}

export function HeroResult() {
    const s = useCalc();
    return <ResultCard result={computeResult(s)} variant="hero" />;
}

export function MiniCalc() {
    const s = useCalc();
    const result = computeResult(s);
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const index = TABS.findIndex((t) => t.id === s.tab);
    const select = (i: number) => {
        const k = (i + TABS.length) % TABS.length;
        calcStore.update((st) => ({ ...st, tab: TABS[k].id }));
        return k;
    };
    const onKey = (e: KeyboardEvent) => {
        const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!delta && e.key !== 'Home' && e.key !== 'End') return;
        e.preventDefault();
        const next = e.key === 'Home' ? select(0) : e.key === 'End' ? select(TABS.length - 1) : select(index + delta);
        tabRefs.current[next]?.focus();
    };
    return (
        <div className="calc-wrap">
            <div className="tabs" role="tablist" aria-label="Calculator" onKeyDown={onKey}>
                <m.span className="tab-ind" aria-hidden="true" animate={{ x: `${index * 100}%` }} initial={false} transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
                {TABS.map((t, i) => (
                    <button
                        key={t.id}
                        ref={(el) => { tabRefs.current[i] = el; }}
                        id={`tab-${t.id}`}
                        role="tab"
                        type="button"
                        className="tab"
                        aria-selected={s.tab === t.id}
                        aria-controls="calc-panel"
                        tabIndex={s.tab === t.id ? 0 : -1}
                        onClick={() => select(i)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            <div className="calc" id="calc-panel" role="tabpanel" aria-labelledby={`tab-${s.tab}`}>
                <div className="calc-in">
                    {s.tab === 'emi' && (<>
                        <p className="eyebrow">Home, car or personal loan</p>
                        <Field label="Loan amount" money prefix="₹" value={s.emi.amount} min={100000} max={20000000} step={50000} onChange={(v) => set('emi', { amount: v })} />
                        <Field label="Interest rate (per year)" suffix="%" value={s.emi.rate} min={5} max={20} step={0.05} onChange={(v) => set('emi', { rate: Math.round(v * 100) / 100 })} />
                        <Field label="Tenure" suffix=" years" value={s.emi.years} min={1} max={30} step={1} onChange={(v) => set('emi', { years: Math.max(1, Math.round(v)) })} />
                    </>)}
                    {s.tab === 'sip' && (<>
                        <p className="eyebrow">Monthly mutual fund SIP</p>
                        <Field label="Monthly investment" money prefix="₹" value={s.sip.monthly} min={500} max={200000} step={500} onChange={(v) => set('sip', { monthly: v })} />
                        <Field label="Expected return (per year)" suffix="%" value={s.sip.rate} min={1} max={30} step={0.5} onChange={(v) => set('sip', { rate: Math.round(v * 10) / 10 })} />
                        <Field label="Time period" suffix=" years" value={s.sip.years} min={1} max={40} step={1} onChange={(v) => set('sip', { years: Math.max(1, Math.round(v)) })} />
                    </>)}
                    {s.tab === 'tax' && (<>
                        <p className="eyebrow">Salaried, FY 2026-27</p>
                        <Field label="Yearly salary (gross)" money prefix="₹" value={s.tax.salary} min={0} max={10000000} step={25000} onChange={(v) => set('tax', { salary: v })} />
                        <Field label="Old Regime deductions" money prefix="₹" value={s.tax.deductions} min={0} max={1000000} step={5000}
                            hint="80C, 80D, home-loan interest, HRA and similar. The standard deduction is added for you."
                            onChange={(v) => set('tax', { deductions: v })} />
                    </>)}
                </div>
                <ResultCard result={result} variant="full" />
            </div>
        </div>
    );
}
