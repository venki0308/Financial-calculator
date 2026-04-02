/**
 * DateInput — cross-platform date picker.
 *
 * Native Android: opens the system Material DatePickerDialog via
 * @capacitor-community/date-picker — fully opaque native dialog,
 * no WebView content visible through any scrim.
 *
 * Web/PWA: falls back to <input type="date">.
 */

import { Capacitor } from '@capacitor/core';
import { DatePicker } from '@capacitor-community/date-picker';
import { useSettingsStore } from '../store/useSettingsStore';

interface Props {
    value: string;        // YYYY-MM-DD (empty string = no selection)
    onChange: (v: string) => void;
    className?: string;
    max?: string;         // YYYY-MM-DD
    min?: string;         // YYYY-MM-DD
    placeholder?: string;
}

function formatDisplay(s: string): string {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return 'Select date';
    const [y, m, d] = s.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DateInput({ value, onChange, className = '', max, min, placeholder }: Props) {
    const darkMode = useSettingsStore(s => s.darkMode);

    // ── Web fallback ──────────────────────────────────────────────────────────
    if (!Capacitor.isNativePlatform()) {
        return (
            <input
                type="date"
                value={value}
                onChange={e => onChange(e.target.value)}
                max={max}
                min={min}
                className={className}
            />
        );
    }

    // ── Native Android — Capacitor Material DatePicker ────────────────────────
    const openPicker = async () => {
        try {
            // Build a safe initial date: clamp to min/max if the current value is out of range
            let initialDate = value ? new Date(value) : new Date();
            if (max) {
                const maxD = new Date(max);
                if (initialDate > maxD) initialDate = maxD;
            }
            if (min) {
                const minD = new Date(min);
                if (initialDate < minD) initialDate = minD;
            }

            const result = await DatePicker.present({
                mode: 'date',
                date: initialDate.toISOString(),
                min: min ? new Date(min).toISOString() : undefined,
                max: max ? new Date(max).toISOString() : undefined,
                theme: darkMode ? 'dark' : 'light',
                android: {
                    format: "yyyy-MM-dd",   // returned value will be YYYY-MM-DD
                },
            });

            if (result?.value) {
                onChange(result.value);
            }
        } catch {
            // User cancelled — do nothing
        }
    };

    return (
        <button
            type="button"
            onClick={openPicker}
            className={className}
            style={{ textAlign: 'left' }}
        >
            {value ? formatDisplay(value) : (placeholder ?? 'Select date')}
        </button>
    );
}
