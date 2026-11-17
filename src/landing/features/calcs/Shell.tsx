/**
 * Layout shared by the feature-page calculators: inputs on the left, the result on the right,
 * then the Google Play badge ("Save, track and get reminders in the app"). Deliberately free of
 * the header/animation code so each calculator chunk stays small.
 */
import type { ReactNode } from 'react';
import badgeUrl from '../../assets/google-play-badge-en.png';
import { playUrl } from '../../play';
import { formatINR } from '../../../utils/calculations';

export const inr = (n: number) => formatINR(Math.round(n));

export interface Row { label: string; value: string; tone?: 'money' | 'warn' }

export function Shell({ eyebrow, inputs, label, figure, words, rows, note, campaign, children }: {
    eyebrow: string;
    inputs: ReactNode;
    label: string;
    figure: string;
    words?: string;
    rows: Row[];
    note?: string;
    campaign: string;
    children?: ReactNode;
}) {
    return (
        <div className="calc fcalc">
            <div className="calc-in">
                <p className="eyebrow">{eyebrow}</p>
                {inputs}
            </div>
            <div className="calc-out">
                <p className="eyebrow">{label}</p>
                <p className="big serif num" aria-live="polite">{figure}</p>
                {words && <p className="words">{words}</p>}
                <dl className="rows">
                    {rows.map((r) => (
                        <div className="row" key={r.label}>
                            <dt>{r.label}</dt>
                            <dd className={`serif num${r.tone ? ' tone-' + r.tone : ''}`}>{r.value}</dd>
                        </div>
                    ))}
                </dl>
                {children}
                <div className="fcalc-app">
                    <p>Save, track and get reminders in the app</p>
                    <a className="play play-sm" href={playUrl('mini_calc', campaign)} data-play="mini_calc" target="_blank" rel="noopener">
                        <img src={badgeUrl} width={646} height={250} alt="Get it on Google Play" />
                    </a>
                </div>
                {note && <p className="disc">{note}</p>}
            </div>
        </div>
    );
}

/** Two-option toggle (e.g. reduce EMI / reduce tenure). */
export function Toggle<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void }) {
    return (
        <fieldset className="field ftoggle">
            <legend>{label}</legend>
            <div className="chips">
                {options.map((o) => (
                    <button key={o.id} type="button" className="chip" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.label}</button>
                ))}
            </div>
        </fieldset>
    );
}
