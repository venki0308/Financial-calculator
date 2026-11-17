/**
 * A slider plus a typeable value, shared by the home page's mini-calculator and the
 * calculators on the feature pages. Typing accepts any amount; the slider covers the
 * usual range. No animation library here, so a feature page's calculator stays small.
 */
import { useId, useState } from 'react';
import { formatINR } from '../utils/calculations';

const digits = (s: string) => Number(s.replace(/[^\d.]/g, '')) || 0;
const plain = (v: number) => formatINR(v).replace('₹', '');

export interface FieldProps {
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

export function Field({ label, hint, value, min, max, step, prefix, suffix, money, onChange }: FieldProps) {
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
