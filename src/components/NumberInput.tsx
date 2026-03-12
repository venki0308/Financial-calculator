import { useState, useRef, useEffect } from 'react';

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

    // Sync rawValue when value prop changes externally (e.g., slider or reset)
    useEffect(() => {
        if (!focused) {
            setRawValue(value.toString());
        }
    }, [value, focused]);

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
        const newRaw = e.target.value;
        setRawValue(newRaw);

        // Real-time update: parse and send to parent on every keystroke
        const parsed = parseFloat(newRaw);
        if (!isNaN(parsed) && parsed >= min && parsed <= max) {
            onChange(parsed);
        }
    };

    const displayValue = focused ? rawValue : formatDisplay(value);

    return (
        <div
            className={`p-4 rounded-2xl border transition-all duration-200 cursor-text ${focused
                ? 'bg-brand-green/5 border-brand-green/40'
                : 'bg-white border-slate-200 dark:bg-card dark:border-border shadow-sm dark:shadow-none'
                }`}
            onClick={() => inputRef.current?.focus()}
        >
            <label className="block text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-2">{label}</label>
            <div className="flex items-center gap-1">
                {prefix && !focused && <span className="text-slate-600 dark:text-slate-300 text-lg font-semibold">{prefix}</span>}
                <input
                    ref={inputRef}
                    type={focused ? 'number' : 'text'}
                    inputMode="decimal"
                    value={displayValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    step={step}
                    className="flex-1 bg-transparent text-slate-900 dark:text-foreground text-lg font-semibold outline-none w-full"
                    readOnly={!focused}
                />
                {suffix && !focused && <span className="text-muted-foreground dark:text-muted-foreground text-lg font-medium">{suffix}</span>}
            </div>
            {helperText && <p className="text-[11px] text-muted-foreground mt-1.5">{helperText}</p>}
        </div>
    );
}

function formatDisplay(value: number): string {
    return value.toLocaleString('en-IN');
}
