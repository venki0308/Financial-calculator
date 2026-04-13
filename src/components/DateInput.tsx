/**
 * DateInput — cross-platform date picker.
 *
 * Native Android: opens a custom in-app calendar modal that is fully
 * theme-aware (light + dark) and supports years from 1500 to current year.
 *
 * Web/PWA: falls back to <input type="date">.
 */

import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { useSettingsStore } from '../store/useSettingsStore';
import { useAppColors } from '../theme/useAppColors';

/* ────────────────────────── constants ────────────────────────── */

const START_YEAR = 1500;
const END_YEAR  = new Date().getFullYear();
const YEARS     = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => END_YEAR - i);

const MONTH_KEYS = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december',
];
const DAY_HEADER_KEYS = ['sun','mon','tue','wed','thu','fri','sat'];

/* ────────────────────────── helpers ──────────────────────────── */

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }

function formatDisplay(s: string, t: (key: string) => string): string {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return t('dateInput.selectDate');
    const [y, m, d] = s.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay(); // 0 = Sun
}

/* ────────────────────────── props ────────────────────────────── */

interface Props {
    label?: string;
    value: string;          // YYYY-MM-DD (empty = no selection)
    onChange: (v: string) => void;
    className?: string;
    max?: string;           // YYYY-MM-DD
    min?: string;           // YYYY-MM-DD
    placeholder?: string;
}

/* ────────────────────────── component ────────────────────────── */

export default function DateInput({ label, value, onChange, className = '', max, min, placeholder }: Props) {
    const isDark = useSettingsStore(s => s.darkMode);

    /* ── Web fallback ──────────────────────────────────────────── */
    if (!Capacitor.isNativePlatform()) {
        return (
            <div className="space-y-2">
                {label && <label className="block text-xs font-medium text-slate-500 dark:text-muted-foreground">{label}</label>}
                <input
                    type="date"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    max={max}
                    min={min}
                    className={className}
                />
            </div>
        );
    }

    /* ── Native (Android) — custom calendar ────────────────────── */
    return (
        <NativeCalendarInput
            label={label}
            value={value}
            onChange={onChange}
            className={className}
            max={max}
            min={min}
            placeholder={placeholder}
            isDark={isDark}
        />
    );
}

/* ==================================================================
   NativeCalendarInput — renders the trigger button + the full-screen
   calendar modal.  Extracted as its own component so hooks are
   always called unconditionally.
   ================================================================== */

interface NativeProps extends Props { isDark: boolean; }

function NativeCalendarInput({ label, value, onChange, className, max, min, placeholder, isDark }: NativeProps) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    // Determine initial month/year when modal opens
    const initial = useMemo(() => {
        if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [y, m] = value.split('-').map(Number);
            return { year: y, month: m - 1 };
        }
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    }, [value]);

    return (
        <div className="space-y-2">
            {label && <label className="block text-xs font-medium text-slate-500 dark:text-muted-foreground">{label}</label>}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={className}
                style={{ textAlign: 'left', width: '100%' }}
            >
                {value ? formatDisplay(value, t) : (placeholder ?? t('dateInput.selectDate'))}
            </button>

            {open && (
                <CalendarModal
                    isDark={isDark}
                    selected={value}
                    initialYear={initial.year}
                    initialMonth={initial.month}
                    max={max}
                    min={min}
                    onSelect={(v) => { onChange(v); setOpen(false); }}
                    onClose={() => setOpen(false)}
                />
            )}
        </div>
    );
}

/* ==================================================================
   CalendarModal — the full-screen calendar picker
   ================================================================== */

interface ModalProps {
    isDark: boolean;
    selected: string;
    initialYear: number;
    initialMonth: number;
    max?: string;
    min?: string;
    onSelect: (v: string) => void;
    onClose: () => void;
}

function CalendarModal({ isDark, selected, initialYear, initialMonth, max, min, onSelect, onClose }: ModalProps) {
    const { t } = useTranslation();
    const [year, setYear]   = useState(initialYear);
    const [month, setMonth] = useState(initialMonth);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const c = useAppColors();

    /* ── theme colors ──────────────────────────────────────────── */
    const bg          = c.card;
    const surface     = c.bg;
    const textPrimary = c.text;
    const textMuted   = c.textMuted;
    const border      = c.border;
    const accent      = '#14b8a6';   // teal-500 — selected highlight
    const todayRing   = isDark ? '#6366f1' : '#818cf8'; // indigo

    /* ── derive max / min Date objects ──────────────────────────── */
    const maxDate = max ? new Date(max) : null;
    const minDate = min ? new Date(min) : null;

    const isDisabled = useCallback((d: number) => {
        const check = new Date(year, month, d);
        if (maxDate && check > maxDate) return true;
        if (minDate && check < minDate) return true;
        return false;
    }, [year, month, max, min]);

    /* ── grid data ─────────────────────────────────────────────── */
    const totalDays = daysInMonth(year, month);
    const startDay  = firstDayOfMonth(year, month);

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= totalDays; d++) cells.push(d);

    const todayStr = (() => {
        const n = new Date();
        return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
    })();

    /* ── navigation ────────────────────────────────────────────── */
    const prevMonth = () => {
        if (month === 0) { setMonth(11); setYear(y => y - 1); }
        else setMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (month === 11) { setMonth(0); setYear(y => y + 1); }
        else setMonth(m => m + 1);
    };

    /* ── year picker ──────────────────────────────────────────── */
    if (showYearPicker) {
        return (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 10001,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.6)',
            }} onClick={onClose}>
                <div onClick={e => e.stopPropagation()} style={{
                    width: '88%', maxWidth: 360, maxHeight: '70vh',
                    borderRadius: 20, background: bg,
                    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                    {/* header */}
                    <div style={{
                        padding: '16px 20px', borderBottom: `1px solid ${border}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: textPrimary }}>{t('dateInput.selectYear')}</span>
                        <button onClick={() => setShowYearPicker(false)}
                            style={{ color: textMuted, fontSize: 22, background: 'none', border: 'none', lineHeight: 1 }}>✕</button>
                    </div>
                    {/* scrollable list */}
                    <div style={{ overflowY: 'auto', flex: 1, padding: '8px 12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                            {YEARS.map(y => {
                                const isCurrent = y === year;
                                return (
                                    <button key={y} onClick={() => { setYear(y); setShowYearPicker(false); }}
                                        style={{
                                            padding: '10px 0', borderRadius: 12, fontSize: 14, fontWeight: isCurrent ? 700 : 500,
                                            border: isCurrent ? `2px solid ${accent}` : `1px solid ${border}`,
                                            background: isCurrent ? (isDark ? 'rgba(20,184,166,0.15)' : 'rgba(20,184,166,0.1)') : 'transparent',
                                            color: isCurrent ? accent : textPrimary,
                                            cursor: 'pointer',
                                        }}>
                                        {y}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── main calendar ────────────────────────────────────────── */
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10001,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)',
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                width: '90%', maxWidth: 370, borderRadius: 20,
                background: bg,
                boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                overflow: 'hidden',
            }}>
                {/* ── header: month / year + nav ───────────────── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 16px 10px',
                }}>
                    <button onClick={prevMonth} style={{
                        width: 36, height: 36, borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: surface, border: `1px solid ${border}`,
                        color: textPrimary, fontSize: 18, cursor: 'pointer',
                    }}>‹</button>

                    <button onClick={() => setShowYearPicker(true)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                    }}>
                        <span style={{ fontWeight: 700, fontSize: 17, color: textPrimary }}>
                            {t(`dateInput.months.${MONTH_KEYS[month]}`)}
                        </span>
                        <span style={{ fontSize: 13, color: accent, fontWeight: 600 }}>
                            {year} ▾
                        </span>
                    </button>

                    <button onClick={nextMonth} style={{
                        width: 36, height: 36, borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: surface, border: `1px solid ${border}`,
                        color: textPrimary, fontSize: 18, cursor: 'pointer',
                    }}>›</button>
                </div>

                {/* ── day headers ──────────────────────────────── */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                    padding: '0 12px', marginBottom: 4,
                }}>
                    {DAY_HEADER_KEYS.map((key: string, i: number) => (
                        <div key={i} style={{
                            textAlign: 'center', fontSize: 12, fontWeight: 700,
                            color: textMuted, padding: '6px 0',
                            textTransform: 'uppercase', letterSpacing: 0.5,
                        }}>{t(`dateInput.days.${key}`)}</div>
                    ))}
                </div>

                {/* ── day grid ─────────────────────────────────── */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                    padding: '0 12px 12px', gap: 2,
                }}>
                    {cells.map((day, idx) => {
                        if (day === null) return <div key={`e-${idx}`} />;

                        const dateStr  = `${year}-${pad(month + 1)}-${pad(day)}`;
                        const isSel    = dateStr === selected;
                        const isToday  = dateStr === todayStr;
                        const disabled = isDisabled(day);

                        let cellBg = 'transparent';
                        let cellColor  = textPrimary;
                        let cellBorder = 'none';
                        let fontW: number = 500;

                        if (isSel) {
                            cellBg    = accent;
                            cellColor = '#ffffff';
                            fontW     = 700;
                        } else if (isToday) {
                            cellBorder = `2px solid ${todayRing}`;
                            cellColor  = todayRing;
                            fontW      = 700;
                        }

                        if (disabled) {
                            cellColor = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)';
                        }

                        return (
                            <button key={dateStr} disabled={disabled}
                                onClick={() => onSelect(dateStr)}
                                style={{
                                    width: '100%', aspectRatio: '1', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 14, fontWeight: fontW,
                                    background: cellBg, color: cellColor,
                                    border: cellBorder,
                                    cursor: disabled ? 'default' : 'pointer',
                                    transition: 'background 0.15s, color 0.15s',
                                }}>
                                {day}
                            </button>
                        );
                    })}
                </div>

                {/* ── footer actions ───────────────────────────── */}
                <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: 8,
                    padding: '8px 16px 16px', borderTop: `1px solid ${border}`,
                }}>
                    <button onClick={onClose} style={{
                        padding: '8px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                        background: surface, color: textPrimary, border: `1px solid ${border}`,
                        cursor: 'pointer',
                    }}>{t('dateInput.cancel')}</button>
                    <button onClick={() => {
                        const now = new Date();
                        onSelect(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
                    }} style={{
                        padding: '8px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                        background: accent, color: '#ffffff', border: 'none',
                        cursor: 'pointer',
                    }}>{t('dateInput.today')}</button>
                </div>
            </div>
        </div>
    );
}
