import { useState, useRef } from 'react';

interface NumberInputProps {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    prefix?: string;
    suffix?: string;
    helperText?: string;
    step?: number;
}

export default function NumberInput({ label, value, onChange, min, max, prefix, suffix, helperText, step = 1 }: NumberInputProps) {
    const [focused, setFocused] = useState(false);
    const [rawValue, setRawValue] = useState(value.toString());
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFocus = () => {
        setFocused(true);
        setRawValue(value.toString());
    };

    const handleBlur = () => {
        setFocused(false);
        let v = parseFloat(rawValue) || min;
        v = Math.max(min, Math.min(max, v));
        setRawValue(v.toString());
        onChange(v);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRawValue(e.target.value);
    };

    const displayValue = focused ? rawValue : formatDisplay(value);

    return (
        <div
            className={`p-4 rounded-2xl border transition-all duration-200 cursor-text ${focused
                ? 'bg-brand-green/5 border-brand-green/40 dark:bg-brand-green/5'
                : 'bg-dark-card border-dark-border dark:bg-dark-card dark:border-dark-border'
                }`}
            onClick={() => inputRef.current?.focus()}
        >
            <label className="block text-xs font-medium text-slate-400 mb-2">{label}</label>
            <div className="flex items-center gap-1">
                {prefix && !focused && <span className="text-slate-300 text-lg font-semibold">{prefix}</span>}
                <input
                    ref={inputRef}
                    type={focused ? 'number' : 'text'}
                    inputMode="decimal"
                    value={displayValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    step={step}
                    className="flex-1 bg-transparent text-white text-lg font-semibold outline-none w-full"
                    readOnly={!focused}
                />
                {suffix && !focused && <span className="text-slate-400 text-lg font-medium">{suffix}</span>}
            </div>
            {helperText && <p className="text-[11px] text-slate-500 mt-1.5">{helperText}</p>}
        </div>
    );
}

function formatDisplay(value: number): string {
    return value.toLocaleString('en-IN');
}
