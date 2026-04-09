import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, X, Search, ChevronLeft, Sun, Sunrise, MapPin, DollarSign, Globe, ArrowRightLeft, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import BottomSheet from '../components/BottomSheet';
import DisclaimerComponent from '../components/DisclaimerComponent';

import { getCountryMeta, getSunTimes } from '../data/countryData';
import { WORLD_TIMEZONES, POPULAR_IANA, TimezoneInfo } from '../data/timezones';
import { getWorldClockExtras } from '../data/worldClockCurrencies';

// ── Display helpers ─────────────────────────────────────────────────
// Intl.DateTimeFormat returns offsets prefixed with "GMT" (e.g.
// "GMT+5:30", "GMT-4"). The modern global standard is UTC, so we
// normalise everything we display to "UTC+5:30", "UTC-4", "UTC+0".
// `GMT` and `UTC` denote the same instant — UTC is just the
// preferred label per IERS / ISO 8601.
function formatUtcOffset(intlOffset: string | undefined | null): string {
    if (!intlOffset) return 'UTC+0';
    if (intlOffset === 'UTC' || intlOffset === 'GMT') return 'UTC+0';
    return intlOffset.replace(/^GMT/, 'UTC').replace(/^UTC$/, 'UTC+0');
}

// When Intl returns a real timezone abbreviation (BST, EDT, IST,
// JST, AEDT…) we want to display it as a badge. But for many zones
// browsers fall back to a synthetic "GMT+5:30" string — useless as
// a badge. Detect that and return null so the caller can render the
// UTC offset (or nothing) instead.
function realTzAbbreviation(abbr: string | undefined | null): string | null {
    if (!abbr) return null;
    if (/^GMT[+\-]/i.test(abbr)) return null;
    if (/^UTC[+\-]/i.test(abbr)) return null;
    if (abbr === 'GMT' || abbr === 'UTC') return null;
    return abbr;
}

// User's device timezone, e.g. "Asia/Kolkata", "Europe/London".
// Used as the reference for "ahead of / behind" labels so a user
// in London sees "5h 30m ahead of BST" rather than always "ahead of IST".
function getDeviceTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

// Short device-zone label for behind/ahead chips.
//   "Asia/Kolkata" → "IST"
//   "Europe/London" (DST) → "BST"
//   "Africa/Libreville" → "WAT"
// Falls back to the city portion of the IANA name when no real
// abbreviation is available.
function getDeviceZoneLabel(now: Date): string {
    const tz = getDeviceTimezone();
    try {
        const abbr = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
            .formatToParts(now).find(p => p.type === 'timeZoneName')?.value;
        const real = realTzAbbreviation(abbr || '');
        if (real) return real;
    } catch { /* fall through */ }
    return tz.split('/').pop()?.replace(/_/g, ' ') || 'UTC';
}

/**
 * Convert an ISO 3166-1 alpha-2 country code to its flag emoji.
 * Uses Unicode Regional Indicator Symbols — works offline, no network call.
 * Note: Windows desktop browsers do NOT render flag emojis natively, so we
 * use FlagImage below (with this emoji as fallback) for cross-platform display.
 */
const countryCodeToFlag = (code: string): string => {
    if (!code || code.length !== 2) return '🏳️';
    const A = 0x1F1E6; // Regional Indicator A
    const offset = 'A'.charCodeAt(0);
    return String.fromCodePoint(
        A + code.toUpperCase().charCodeAt(0) - offset,
        A + code.toUpperCase().charCodeAt(1) - offset,
    );
};

/**
 * FlagImage — renders a country flag as an image (works on Windows web,
 * macOS, iOS, Android). Falls back to emoji if image fails (offline or blocked).
 * Source: flagcdn.com — free public CDN, ~1KB per flag, aggressively cached.
 */
const FlagImage = memo(function FlagImage({ code, size = 'sm', className = '' }: { code: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
    const [errored, setErrored] = useState(false);
    if (!code || code.length !== 2) {
        return <Globe size={14} className="text-slate-400" />;
    }
    if (errored) {
        // Network/CDN failure → fall back to emoji (renders on Android, macOS, iOS)
        return (
            <span className={`leading-none ${size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-lg'}`} aria-label={code}>
                {countryCodeToFlag(code)}
            </span>
        );
    }
    // flagcdn.com 2x retina sizes for crisp rendering
    const dimensions = size === 'lg' ? { w: 64, h: 48, src: '64x48' } : size === 'md' ? { w: 36, h: 27, src: '40x30' } : { w: 32, h: 24, src: '32x24' };
    return (
        <img
            src={`https://flagcdn.com/${dimensions.src}/${code.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/${dimensions.w * 2}x${dimensions.h * 2}/${code.toLowerCase()}.png 2x`}
            width={dimensions.w}
            height={dimensions.h}
            alt={code}
            loading="lazy"
            decoding="async"
            onError={() => setErrored(true)}
            className={`object-cover ${className}`}
        />
    );
});

// --- Shared Live Time Hook ---
class TimeTicker {
    listeners = new Set<(d: Date) => void>();
    interval: any;
    now = new Date();
    start() {
        if (!this.interval) {
            this.interval = setInterval(() => {
                this.now = new Date();
                this.listeners.forEach(l => l(this.now));
            }, 1000);
        }
    }
    stop() {
        if (this.listeners.size === 0 && this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    subscribe(listener: (d: Date) => void) {
        this.listeners.add(listener);
        this.start();
        return () => {
            this.listeners.delete(listener);
            this.stop();
        };
    }
}
const globalTicker = new TimeTicker();

function useSharedTime() {
    const [now, setNow] = useState(globalTicker.now);
    useEffect(() => globalTicker.subscribe(setNow), []);
    return now;
}

// ────────────────────────────────────────────────────────────────────────────
// TZ Picker BottomSheet
// ────────────────────────────────────────────────────────────────────────────

/**
 * Normalise a string for case- and accent-insensitive search.
 *
 *   "São Paulo" → "sao paulo"
 *   "Brasília"  → "brasilia"
 *   "ZIMBABWE"  → "zimbabwe"
 *
 * Uses Unicode NFD decomposition to strip combining marks (diacritics),
 * then lowercases and trims. This is critical for matching cities with
 * accented characters (São Paulo, Brasília, Zürich, México) when users
 * type plain ASCII queries on a regular keyboard.
 */
function normalizeForSearch(s: string): string {
    return (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

/**
 * Test if a TimezoneInfo entry matches a (normalised) query string.
 * Single source of truth for both the Compare picker and the main Add panel.
 */
function tzMatches(tz: TimezoneInfo, normalisedQuery: string): boolean {
    if (!normalisedQuery) return true;
    return (
        normalizeForSearch(tz.city).includes(normalisedQuery) ||
        normalizeForSearch(tz.country).includes(normalisedQuery) ||
        normalizeForSearch(tz.iana).includes(normalisedQuery) ||
        normalizeForSearch(tz.searchTerms || '').includes(normalisedQuery)
    );
}

function filterZones(q: string) {
    const nq = normalizeForSearch(q);
    if (!nq) {
        const pop = POPULAR_IANA.map(i => WORLD_TIMEZONES.find(t => t.iana === i)).filter(Boolean) as TimezoneInfo[];
        const rest = WORLD_TIMEZONES.filter(t => !POPULAR_IANA.includes(t.iana));
        return [...pop, ...rest];
    }
    return WORLD_TIMEZONES.filter(t => tzMatches(t, nq));
}

function getZoneLabel(iana: string) {
    const tz = WORLD_TIMEZONES.find(t => t.iana === iana);
    return tz ? `${tz.city} (${tz.country})` : iana;
}

const TZPickerSheet = memo(({
    isOpen, onClose, label, value, onChange, search, setSearch
}: {
    isOpen: boolean; onClose: () => void; label: string; value: string; onChange: (v: string) => void;
    search: string; setSearch: (s: string) => void;
}) => {
    const { t } = useTranslation();
    return (
        <BottomSheet isOpen={isOpen} onClose={() => { onClose(); setSearch(''); }} title={t('worldClock.select', { label })}>
            <div className="px-4 mb-3 flex-shrink-0">
                <div className="relative">
                    <Search size={14} className="absolute inset-y-0 my-auto left-3 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={t('worldClock.searchCityOrCountry')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-input border border-border rounded-xl py-2.5 pl-9 pr-8 text-sm text-foreground outline-none focus:border-primary"
                    />
                </div>
            </div>
            <div className="overflow-y-auto px-4 pb-6 space-y-1.5" style={{ maxHeight: '60vh' }}>
                {filterZones(search).map(tz => (
                    <button
                        key={tz.iana}
                        onClick={() => { onChange(tz.iana); onClose(); setSearch(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                            value === tz.iana ? 'bg-primary/10 border border-primary/30' : 'bg-background border border-border hover:border-primary/40'
                        }`}
                    >
                        <div className="flex-1 min-w-0">
                            <p className="text-foreground font-semibold text-sm truncate">{tz.city}</p>
                            <p className="text-muted-foreground text-[11px] font-medium">{tz.country} · {tz.iana}</p>
                        </div>
                        {value === tz.iana && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                    </button>
                ))}
            </div>
        </BottomSheet>
    );
});

// ────────────────────────────────────────────────────────────────────────────
// anchorToTimezone — bisection-based UTC anchoring (immune to DST gaps/folds)
// Returns the UTC Date whose wall-clock reading in `iana` equals `targetH:targetM`
// ────────────────────────────────────────────────────────────────────────────
function anchorToTimezone(baseUTC: number, iana: string, targetH: number, targetM: number): Date {
    // We scan ±15h around the rough candidate to find exact match
    const targetTotalMin = targetH * 60 + targetM;
    let low = baseUTC - 15 * 3600000;
    let high = baseUTC + 15 * 3600000;

    const wallMin = (utcMs: number) => {
        const p = new Intl.DateTimeFormat('en-US', {
            timeZone: iana, hour: '2-digit', minute: '2-digit', hour12: false,
        }).formatToParts(new Date(utcMs));
        const h = parseInt(p.find(x => x.type === 'hour')?.value || '0');
        const m = parseInt(p.find(x => x.type === 'minute')?.value || '0');
        // handle midnight 24:00 edge
        return (h === 24 ? 0 : h) * 60 + m;
    };

    // Binary search with 60s precision
    for (let i = 0; i < 30; i++) {
        const mid = Math.floor((low + high) / 2);
        const wm = wallMin(mid);
        // Use signed distance on circular clock (mod 1440)
        const diff = ((wm - targetTotalMin) + 720) % 1440 - 720;
        if (Math.abs(diff) <= 1) return new Date(mid - (diff * 60000));
        if (diff > 0) high = mid;
        else low = mid;
    }
    return new Date(Math.floor((low + high) / 2));
}

// ────────────────────────────────────────────────────────────────────────────
// DST detection helper (pure Intl, no manual offsets stored)
// ────────────────────────────────────────────────────────────────────────────
function getDSTStatus(iana: string, refDate: Date) {
    const year = refDate.getFullYear();
    const getOff = (d: Date) => {
        try {
            const tzStr = d.toLocaleString('en-US', { timeZone: iana });
            const utcStr = d.toLocaleString('en-US', { timeZone: 'UTC' });
            return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 60000;
        } catch { return 0; }
    };
    const janOff = getOff(new Date(year, 0, 15));
    const julOff = getOff(new Date(year, 6, 15));
    const isDSTZone = janOff !== julOff;
    const curOff = getOff(refDate);
    const currentlyDST = isDSTZone && curOff === Math.max(janOff, julOff);
    const abbr = new Intl.DateTimeFormat('en-US', { timeZone: iana, timeZoneName: 'short' })
        .formatToParts(refDate).find(p => p.type === 'timeZoneName')?.value || '';
    const offset = new Intl.DateTimeFormat('en-US', { timeZone: iana, timeZoneName: 'shortOffset' })
        .formatToParts(refDate).find(p => p.type === 'timeZoneName')?.value || 'UTC';
    const nextDST = isDSTZone ? getNextDST(iana, refDate) : null;
    return { isDSTZone, currentlyDST, abbr, offset, nextDST };
}

// ────────────────────────────────────────────────────────────────────────────
// CompareView — Multi-target, DST-aware, scenario-simulation time engine
// ────────────────────────────────────────────────────────────────────────────

const DEFAULT_TARGETS = ['America/New_York', 'Europe/London', 'Asia/Dubai', 'Australia/Sydney'];

interface TargetResult {
    iana: string;
    time: string;
    date: string;
    weekday: string;
    dayCross: string;
    dst: ReturnType<typeof getDSTStatus>;
}

function CompareView() {
    const { t } = useTranslation();
    // ── Persisted state ──────────────────────────────────────────────────────
    const loadSaved = (): { src: string; targets: string[] } => {
        try {
            const s = localStorage.getItem('fincalix_comparev2');
            if (s) return JSON.parse(s);
        } catch {}
        return { src: 'Asia/Kolkata', targets: DEFAULT_TARGETS.slice(0, 2) };
    };
    const saved = loadSaved();

    const [srcTZ, setSrcTZ] = useState<string>(saved.src);
    const [targetTZs, setTargetTZs] = useState<string[]>(saved.targets);
    const [inputHour, setInputHour] = useState(9);
    const [inputMin, setInputMin] = useState(0);
    const [useLive, setUseLive] = useState(false);
    const [showScenario, setShowScenario] = useState(false);

    // Pickers
    const [showSrcPicker, setShowSrcPicker] = useState(false);
    const [showTgtPicker, setShowTgtPicker] = useState(false);
    const [editingTargetIdx, setEditingTargetIdx] = useState<number | null>(null);
    const [searchSrc, setSearchSrc] = useState('');
    const [searchTgt, setSearchTgt] = useState('');

    const liveNow = useSharedTime();
    const staticNow = useRef(new Date());
    const now = useLive ? liveNow : staticNow.current;

    // Persist
    useEffect(() => {
        localStorage.setItem('fincalix_comparev2', JSON.stringify({ src: srcTZ, targets: targetTZs }));
    }, [srcTZ, targetTZs]);

    // ── Core computation ─────────────────────────────────────────────────────
    const { srcResult, targetResults, refDate } = useMemo(() => {
        try {
            let ref: Date;
            if (useLive) {
                ref = now;
            } else {
                // Get today's date in source timezone
                const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: srcTZ })
                    .format(now).split('-');
                // Build rough UTC candidate
                const roughUTC = Date.UTC(+y, +m - 1, +d, inputHour, inputMin, 0);
                // Bisection-anchored: find exact UTC ms where srcTZ wall clock = inputHour:inputMin
                ref = anchorToTimezone(roughUTC, srcTZ, inputHour, inputMin);
            }

            const fmtTime = (iana: string) =>
                new Intl.DateTimeFormat('en-US', {
                    timeZone: iana, hour: '2-digit', minute: '2-digit', hour12: true,
                }).format(ref).replace(/\s/g, ' ').toLowerCase();

            const fmtDate = (iana: string) =>
                new Intl.DateTimeFormat('en-US', {
                    timeZone: iana, day: 'numeric', month: 'short', year: 'numeric',
                }).format(ref);

            const fmtWeekday = (iana: string) =>
                new Intl.DateTimeFormat('en-US', { timeZone: iana, weekday: 'short' }).format(ref);

            const srcDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: srcTZ }).format(ref);

            const srcDst = getDSTStatus(srcTZ, ref);

            const srcRes = {
                iana: srcTZ,
                time: fmtTime(srcTZ),
                date: fmtDate(srcTZ),
                weekday: fmtWeekday(srcTZ),
                dst: srcDst,
            };

            const tgtResults: TargetResult[] = targetTZs.map(iana => {
                const tgtDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: iana }).format(ref);
                const dayDiff = Math.round(
                    (new Date(tgtDateStr).getTime() - new Date(srcDateStr).getTime()) / 86400000
                );
                let dayCross = t('worldClock.sameDay');
                if (dayDiff > 0) dayCross = `+${dayDiff} ${t('worldClock.day')}`;
                else if (dayDiff < 0) dayCross = `${dayDiff} ${t('worldClock.day')}`;

                return {
                    iana,
                    time: fmtTime(iana),
                    date: fmtDate(iana),
                    weekday: fmtWeekday(iana),
                    dayCross,
                    dst: getDSTStatus(iana, ref),
                };
            });

            return { srcResult: srcRes, targetResults: tgtResults, refDate: ref };
        } catch {
            return { srcResult: null, targetResults: [], refDate: now };
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [srcTZ, targetTZs, inputHour, inputMin, useLive, useLive ? now : null]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const addTarget = (iana: string) => {
        if (targetTZs.includes(iana) || iana === srcTZ) return;
        if (editingTargetIdx !== null) {
            // Replace existing
            setTargetTZs(prev => prev.map((t, i) => i === editingTargetIdx ? iana : t));
            setEditingTargetIdx(null);
        } else {
            setTargetTZs(prev => [...prev, iana]);
        }
        setShowTgtPicker(false);
        setSearchTgt('');
    };

    const removeTarget = (idx: number) => {
        setTargetTZs(prev => prev.filter((_, i) => i !== idx));
    };

    const swap = () => {
        if (targetTZs.length === 1) {
            setSrcTZ(targetTZs[0]);
            setTargetTZs([srcTZ]);
        }
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="px-4 pt-4 pb-28 space-y-4">

            {/* ── Source Zone Picker ─────────────────────────────────────── */}
            <div className="rounded-[22px] bg-card border border-border p-4">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('worldClock.sourceTimezone')}</p>
                <button
                    onClick={() => setShowSrcPicker(true)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-500/8 border border-indigo-500/20 text-left active:scale-[0.98] transition-transform"
                >
                    <div className="p-2 rounded-full bg-indigo-500/15 text-indigo-500 flex-shrink-0">
                        <Globe size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{getZoneLabel(srcTZ)}</p>
                        {srcResult && (
                            <p className="text-[11px] text-muted-foreground font-medium">
                                {srcResult.dst.offset}
                                {srcResult.dst.currentlyDST && <span className="ml-1.5 text-amber-500 font-bold">· {t('worldClock.dstActive')}</span>}
                            </p>
                        )}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t('worldClock.change')}</span>
                </button>
            </div>

            {/* ── Time Input + Mode Toggle ───────────────────────────────── */}
            <div className="rounded-[22px] bg-card border border-border p-4">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={11} /> {t('worldClock.inputTime')}
                    </p>
                    <div className="flex bg-muted p-1 rounded-xl">
                        <button
                            onClick={() => setUseLive(false)}
                            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${!useLive ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}
                        >
                            {t('worldClock.manual')}
                        </button>
                        <button
                            onClick={() => setUseLive(true)}
                            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${useLive ? 'bg-primary shadow text-primary-foreground' : 'text-muted-foreground'}`}
                        >
                            🔴 {t('worldClock.live')}
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="popLayout">
                    {useLive ? (
                        <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="text-center py-3">
                            {srcResult && (
                                <div>
                                    <p className="text-4xl font-black font-mono text-foreground tracking-tight">{srcResult.time}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{srcResult.weekday}, {srcResult.date}</p>
                                </div>
                            )}
                            <p className="text-[10px] text-primary font-semibold mt-2 animate-pulse">⬤ {t('worldClock.syncingWithSystemClock')}</p>
                        </motion.div>
                    ) : (
                        <motion.div key="manual" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                            {/* Large time display */}
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <div className="flex-1 flex flex-col items-center bg-muted/40 rounded-2xl p-3 border border-border">
                                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-1">{t('worldClock.hour')}</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setInputHour(h => (h - 1 + 24) % 24)}
                                            className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold text-lg hover:bg-muted/70 transition-colors">−</button>
                                        <input
                                            type="number"
                                            value={String(inputHour).padStart(2, '0')}
                                            onChange={e => setInputHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                                            className="w-16 text-center bg-transparent text-3xl font-mono text-foreground font-black outline-none"
                                        />
                                        <button onClick={() => setInputHour(h => (h + 1) % 24)}
                                            className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold text-lg hover:bg-muted/70 transition-colors">+</button>
                                    </div>
                                </div>
                                <span className="text-3xl font-black text-muted-foreground">:</span>
                                <div className="flex-1 flex flex-col items-center bg-muted/40 rounded-2xl p-3 border border-border">
                                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-1">{t('worldClock.minute')}</span>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => setInputMin(m => (m - 1 + 60) % 60)}
                                            className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold text-lg hover:bg-muted/70 transition-colors">−</button>
                                        <input
                                            type="number"
                                            value={String(inputMin).padStart(2, '0')}
                                            onChange={e => setInputMin(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                            className="w-16 text-center bg-transparent text-3xl font-mono text-foreground font-black outline-none"
                                        />
                                        <button onClick={() => setInputMin(m => (m + 1) % 60)}
                                            className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-bold text-lg hover:bg-muted/70 transition-colors">+</button>
                                    </div>
                                </div>
                            </div>
                            {/* AM/PM chip */}
                            <div className="flex justify-center gap-3 text-[11px] font-bold text-muted-foreground">
                                <span>{t('worldClock.twelveHr')}: <span className="text-foreground">{inputHour === 0 ? '12' : inputHour > 12 ? inputHour - 12 : inputHour}:{String(inputMin).padStart(2, '0')} {inputHour < 12 ? 'AM' : 'PM'}</span></span>
                                <span className="opacity-40">|</span>
                                <span>{t('worldClock.twentyFourHr')}: <span className="text-foreground">{String(inputHour).padStart(2, '0')}:{String(inputMin).padStart(2, '0')}</span></span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Source Result Card ─────────────────────────────────────── */}
            {srcResult && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="rounded-[24px] bg-gradient-to-br from-[#4F46E5] to-[#4338CA] p-5 shadow-lg shadow-indigo-500/20 border border-white/10">
                        <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-widest bg-white/15 text-white px-2.5 py-1 rounded-full">{t('worldClock.source')}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${srcResult.dst.currentlyDST ? 'bg-amber-400/30 text-amber-200' : 'bg-white/10 text-indigo-200'}`}>
                                    {srcResult.dst.currentlyDST
                                        ? '☀️ ' + (realTzAbbreviation(srcResult.dst.abbr) || t('worldClock.dstActive'))
                                        : '📍 ' + (realTzAbbreviation(srcResult.dst.abbr) || t('worldClock.standardTimeShort', 'Standard'))}
                                </span>
                            </div>
                            <span className="text-indigo-200 text-[11px] font-bold flex-shrink-0">{formatUtcOffset(srcResult.dst.offset)}</span>
                        </div>
                        <p className="text-white font-black text-[40px] leading-none font-mono mt-3 mb-1 tracking-tight">{srcResult.time}</p>
                        <p className="text-indigo-200 text-xs font-medium">{srcResult.weekday}, {srcResult.date}</p>
                        <p className="text-indigo-300 text-[10px] font-medium mt-1 truncate">{getZoneLabel(srcTZ)}</p>
                        {srcResult.dst.nextDST && (
                            <div className="mt-3 pt-3 border-t border-white/10">
                                <p className="text-[10px] text-amber-300 font-bold">
                                    🕐 {t('worldClock.nextDst')}: {t('worldClock.clocksGo', { direction: srcResult.dst.nextDST.type })} {t('worldClock.on')} {new Intl.DateTimeFormat('en-US', { timeZone: srcTZ, month: 'short', day: 'numeric', hour: 'numeric', hour12: true }).format(srcResult.dst.nextDST.date)}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Swap & Add controls */}
            <div className="flex items-center gap-2">
                {targetTZs.length === 1 && (
                    <button onClick={swap}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted border border-border text-muted-foreground text-[11px] font-semibold hover:border-primary/40 transition-colors">
                        <ArrowRightLeft size={12} /> {t('worldClock.swap')}
                    </button>
                )}
                <div className="flex-1" />
                {targetTZs.length < 6 && (
                    <button onClick={() => { setEditingTargetIdx(null); setShowTgtPicker(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/25 text-primary text-[11px] font-bold transition-colors active:scale-95">
                        <Plus size={13} /> {t('worldClock.addTarget')}
                    </button>
                )}
            </div>

            {/* ── Target Cards ──────────────────────────────────────────── */}
            <div className="space-y-3">
                <AnimatePresence>
                    {targetResults.map((res, idx) => (
                        <motion.div
                            key={res.iana}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: idx * 0.05 }}
                            className="rounded-[22px] bg-gradient-to-br from-emerald-600 to-teal-700 border border-white/10 shadow-lg shadow-emerald-500/15 overflow-hidden"
                        >
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[10px] font-black uppercase tracking-widest bg-white/15 text-white px-2.5 py-1 rounded-full">
                                            {t('worldClock.target')} {targetTZs.length > 1 ? idx + 1 : ''}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${res.dst.currentlyDST ? 'bg-amber-400/30 text-amber-200' : 'bg-white/10 text-emerald-200'}`}>
                                            {res.dst.currentlyDST
                                                ? '☀️ ' + (realTzAbbreviation(res.dst.abbr) || t('worldClock.dstActive'))
                                                : '📍 ' + (realTzAbbreviation(res.dst.abbr) || t('worldClock.standardTimeShort', 'Standard'))}
                                        </span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${res.dayCross === t('worldClock.sameDay') ? 'bg-white/10 text-emerald-200' : 'bg-amber-400/25 text-amber-200'}`}>
                                            {res.dayCross}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        <span className="text-emerald-200 text-[11px] font-bold">{formatUtcOffset(res.dst.offset)}</span>
                                        <button
                                            onClick={() => { setEditingTargetIdx(idx); setShowTgtPicker(true); }}
                                            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                                        >
                                            <Search size={10} className="text-white" />
                                        </button>
                                        {targetTZs.length > 1 && (
                                            <button onClick={() => removeTarget(idx)}
                                                className="p-1 rounded-lg bg-white/10 hover:bg-red-500/40 transition-colors">
                                                <X size={10} className="text-white" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-white font-black text-[40px] leading-none font-mono mt-3 mb-1 tracking-tight">{res.time}</p>
                                <p className="text-emerald-200 text-xs font-medium">{res.weekday}, {res.date}</p>
                                <p className="text-emerald-300 text-[10px] font-medium mt-1 truncate">{getZoneLabel(res.iana)}</p>
                            </div>
                            {res.dst.nextDST && (
                                <div className="bg-amber-500/20 border-t border-amber-500/20 px-5 py-2">
                                    <p className="text-[10px] text-amber-300 font-bold">
                                        🕐 {t('worldClock.nextDstChange')}: {t('worldClock.clocksGo', { direction: res.dst.nextDST.type })} {t('worldClock.on')} {new Intl.DateTimeFormat('en-US', { timeZone: res.iana, month: 'short', day: 'numeric', hour: 'numeric', hour12: true }).format(res.dst.nextDST.date)}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* ── Scenario Panel Toggle ─────────────────────────────────── */}
            <button
                onClick={() => setShowScenario(s => !s)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-colors ${showScenario ? 'bg-violet-500/10 border-violet-500/30 text-violet-500' : 'bg-card border-border text-muted-foreground'}`}
            >
                <div className="flex items-center gap-2">
                    <span className="text-base">📅</span>
                    <div className="text-left">
                        <p className="text-sm font-bold">{t('worldClock.whatIfScheduler')}</p>
                        <p className="text-[10px] font-medium opacity-70">{t('worldClock.seeHowTimeLands')}</p>
                    </div>
                </div>
                <span className="text-[11px] font-bold uppercase">{showScenario ? t('worldClock.hide') + ' ▲' : t('worldClock.show') + ' ▼'}</span>
            </button>

            <AnimatePresence>
                {showScenario && srcResult && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="rounded-[22px] bg-card border border-border overflow-hidden">
                            {/* Header */}
                            <div className="bg-violet-500/10 border-b border-violet-500/15 px-4 py-3">
                                <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                                    📅 {t('worldClock.ifYouScheduleAt', { time: srcResult.time, zone: getZoneLabel(srcTZ) })}
                                </p>
                            </div>
                            {/* Rows */}
                            <div className="divide-y divide-border">
                                {targetResults.map((res) => (
                                    <div key={res.iana} className="flex items-center justify-between px-4 py-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{getZoneLabel(res.iana)}</p>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <span className="text-[10px] text-muted-foreground font-medium">{res.weekday}, {res.date}</span>
                                                {res.dst.currentlyDST && (
                                                    <span className="text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-bold">{t('worldClock.dst')}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-3">
                                            <p className="font-mono font-black text-foreground text-base">{res.time}</p>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${res.dayCross === t('worldClock.sameDay')
                                                ? 'text-muted-foreground'
                                                : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'}`}>
                                                {res.dayCross}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center mt-2 px-4">
                            ✅ {t('worldClock.poweredByIana')}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Engine note ───────────────────────────────────────────── */}
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-muted-foreground text-[10px] leading-relaxed">
                    🌐 {t('worldClock.engineNote')}
                </p>
            </div>

            {/* Pickers */}
            <TZPickerSheet isOpen={showSrcPicker} onClose={() => setShowSrcPicker(false)} label={t('worldClock.sourceTimezone')}
                value={srcTZ} onChange={v => { setSrcTZ(v); setShowSrcPicker(false); setSearchSrc(''); }}
                search={searchSrc} setSearch={setSearchSrc} />
            <TZPickerSheet isOpen={showTgtPicker} onClose={() => { setShowTgtPicker(false); setEditingTargetIdx(null); }} label={t('worldClock.targetTimezone')}
                value={editingTargetIdx !== null ? targetTZs[editingTargetIdx] : ''}
                onChange={addTarget}
                search={searchTgt} setSearch={setSearchTgt} />
        </div>
    );
}

interface SavedClock {
    id: string;
    cityName: string;
    countryName: string;
    timezone: string;
    addedAt: string;
    isPinned?: boolean;
}

const DEFAULT_CLOCKS: SavedClock[] = [
    {
        id: 'clock_ist_default',
        cityName: 'Kolkata / Mumbai / Delhi',
        countryName: 'India',
        timezone: 'Asia/Kolkata',
        addedAt: new Date().toISOString(),
        isPinned: true
    },
    {
        id: 'clock_lon_default',
        cityName: 'London',
        countryName: 'United Kingdom',
        timezone: 'Europe/London',
        addedAt: new Date().toISOString()
    },
    {
        id: 'clock_nyc_default',
        cityName: 'New York (EST)',
        countryName: 'United States',
        timezone: 'America/New_York',
        addedAt: new Date().toISOString()
    },
    {
        id: 'clock_dxb_default',
        cityName: 'Dubai / Abu Dhabi',
        countryName: 'UAE',
        timezone: 'Asia/Dubai',
        addedAt: new Date().toISOString()
    }
];

interface DSTTransition {
    date: Date;
    isStarting: boolean;
    type: 'forward' | 'backward';
}

const dstCache = new Map<string, { t: number, res: DSTTransition | null }>();

function getNextDST(iana: string, now: Date): DSTTransition | null {
    try {
        const year = now.getFullYear();
        const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 0).getTime()) / 86400000);
        const key = `${iana}_${year}_${dayOfYear}`;
        if (dstCache.has(key)) return dstCache.get(key)!.res;

        const getOff = (t: number) => {
            try {
                const d = new Date(t);
                const tzStr = d.toLocaleString('en-US', { timeZone: iana });
                const utcStr = d.toLocaleString('en-US', { timeZone: 'UTC' });
                return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 60000;
            } catch { return 0; }
        };

        const jan1 = Date.UTC(year, 0, 1, 12, 0, 0);
        const jul1 = Date.UTC(year, 6, 1, 12, 0, 0);
        
        const janOff = getOff(jan1);
        const julOff = getOff(jul1);

        if (janOff === julOff) {
            dstCache.set(key, { t: Date.now(), res: null });
            return null;
        }

        const dstOff = Math.max(janOff, julOff);
        const nowP = now.getTime();
        const currentOff = getOff(nowP);

        // Scan every day for the next 365 days
        for (let i = 1; i <= 365; i++) {
            const t = nowP + i * 86400000;
            const off = getOff(t);
            if (off !== currentOff) {
                // Found transition date between t - 86400000 and t.
                // Binary search to find exact minute
                let low = t - 86400000;
                let high = t;
                while (high - low > 60000) {
                    const mid = Math.floor((low + high) / 2);
                    if (getOff(mid) === currentOff) {
                        low = mid;
                    } else {
                        high = mid;
                    }
                }
                const transDate = new Date(high);
                const isStarting = (off === dstOff);
                const res: DSTTransition = {
                    date: transDate,
                    isStarting, 
                    type: isStarting ? 'forward' : 'backward'
                };
                dstCache.set(key, { t: Date.now(), res });
                return res;
            }
        }
        dstCache.set(key, { t: Date.now(), res: null });
        return null;
    } catch { return null; }
}

function getTimeData(iana: string, now: Date) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: iana, hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }).formatToParts(now);

        const get = (type: string) => parts.find(p => p.type === type)?.value || '';
        const hour = parseInt(get('hour')) || 0;
        const minute = parseInt(get('minute')) || 0;
        const second = parseInt(get('second')) || 0;

        const displayParts = new Intl.DateTimeFormat('en-IN', {
            timeZone: iana, hour: '2-digit', minute: '2-digit', hour12: true,
        }).formatToParts(now);
        const displayHour = displayParts.find(p => p.type === 'hour')?.value || '12';
        const displayMin = displayParts.find(p => p.type === 'minute')?.value || '00';
        const ampm = displayParts.find(p => p.type === 'dayPeriod')?.value?.toUpperCase() || 'AM';

        const offsetStr = new Intl.DateTimeFormat('en-US', {
            timeZone: iana, timeZoneName: 'shortOffset',
        }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || 'UTC';

        const jan = new Date(now.getFullYear(), 0, 1);
        const jul = new Date(now.getFullYear(), 6, 1);
        const getOff = (d: Date, targetIana: string) => {
            try {
                const tzStr = d.toLocaleString('en-US', { timeZone: targetIana });
                const utcStr = d.toLocaleString('en-US', { timeZone: 'UTC' });
                return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 60000;
            } catch { return 0; }
        };
        const janOff = getOff(jan, iana);
        const julOff = getOff(jul, iana);
        const isDST = janOff !== julOff;
        const currentOff = getOff(now, iana);
        // Usually, the higher offset (more positive) is the summer/DST time.
        const currentlyDST = isDST && currentOff === Math.max(janOff, julOff);

        const weekday = new Intl.DateTimeFormat('en-IN', { timeZone: iana, weekday: 'short' }).format(now);
        const day = get('day');
        const month = new Intl.DateTimeFormat('en-IN', { timeZone: iana, month: 'short' }).format(now);

        // Diff vs the user's device timezone (not hardcoded IST). A user
        // in London should see "5h 30m ahead of BST" for India, not the
        // old "ahead of IST" which only made sense for Indian users.
        const deviceTZ = getDeviceTimezone();
        const deviceOff = getOff(now, deviceTZ);
        const diffMins = currentOff - deviceOff;

        // Real timezone abbreviation (BST/EDT/JST/IST…) when the host
        // browser supports it; null when it falls back to "GMT+5:30".
        const tzAbbrShort = new Intl.DateTimeFormat('en-US', { timeZone: iana, timeZoneName: 'short' })
            .formatToParts(now).find(p => p.type === 'timeZoneName')?.value;
        const tzAbbr = realTzAbbreviation(tzAbbrShort || '');

        const nextDST = getNextDST(iana, now);

        return { hour, minute, second, displayHour, displayMin, ampm, offsetStr, isDST, currentlyDST, weekday, day, month, diffMins, nextDST, tzAbbr };
    } catch {
        return { hour: 0, minute: 0, second: 0, displayHour: '12', displayMin: '00', ampm: 'AM', offsetStr: 'UTC', isDST: false, currentlyDST: false, weekday: '', day: '', month: '', diffMins: 0, nextDST: null, tzAbbr: null };
    }
}

function AnalogClock({ hour, minute, second }: { hour: number; minute: number; second: number }) {
    const cx = 50; const cy = 50; const r = 42;
    const hourAngle = ((hour % 12) + minute / 60) * 30 - 90;
    const minAngle = (minute + second / 60) * 6 - 90;
    const secAngle = second * 6 - 90;
    const toRad = (a: number) => (a * Math.PI) / 180;
    const hand = (angle: number, len: number) => ({
        x2: cx + len * Math.cos(toRad(angle)),
        y2: cy + len * Math.sin(toRad(angle)),
    });

    return (
        <svg viewBox="0 0 100 100" className="w-24 h-24 flex-shrink-0" style={{ filter: 'drop-shadow(0 4px 12px rgba(100,80,255,0.3))' }}>
            <circle cx={cx} cy={cy} r={r + 3} fill="#3730a3" opacity="0.3" />
            <circle cx={cx} cy={cy} r={r} fill="white" />
            {Array.from({ length: 12 }).map((_, i) => {
                const a = toRad(i * 30 - 90);
                return (
                    <line key={i}
                        x1={cx + (r - 6) * Math.cos(a)} y1={cy + (r - 6) * Math.sin(a)}
                        x2={cx + r * Math.cos(a)} y2={cy + r * Math.sin(a)}
                        stroke="#6366f1" strokeWidth={i % 3 === 0 ? 2 : 1}
                    />
                );
            })}
            <line x1={cx} y1={cy} {...hand(hourAngle, 26)} stroke="#1e1b4b" strokeWidth={3} strokeLinecap="round" />
            <line x1={cx} y1={cy} {...hand(minAngle, 35)} stroke="#1e1b4b" strokeWidth={2} strokeLinecap="round" />
            <line x1={cx} y1={cy} {...hand(secAngle, 38)} stroke="#ef4444" strokeWidth={1.5} strokeLinecap="round" />
            <circle cx={cx} cy={cy} r={2.5} fill="#6366f1" />
        </svg>
    );
}

function CityDetailView({ clock, onBack }: { clock: SavedClock; onBack: () => void }) {
    const { t } = useTranslation();
    const now = useSharedTime();
    const td = getTimeData(clock.timezone, now);
    const meta = getCountryMeta(clock.timezone);
    const sun = getSunTimes(clock.timezone, now);
    const extras = getWorldClockExtras(meta.countryCode);
    const offsetLabel = formatUtcOffset(td.offsetStr);
    const deviceLabel = getDeviceZoneLabel(now);
    const absMins = Math.abs(td.diffMins);
    const diffText =
        td.diffMins === 0
            ? t('worldClock.sameTime', 'Same time')
            : `${Math.floor(absMins / 60)}h${absMins % 60 > 0 ? ` ${absMins % 60}m` : ''} ${td.diffMins < 0 ? t('worldClock.behindRef', 'behind') : t('worldClock.aheadRef', 'ahead of')} ${deviceLabel}`;
    // Real DST abbreviation if available, else "DST"
    const dstChipLabel = td.tzAbbr || (td.currentlyDST ? 'DST' : '');

    return (
        <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-40 bg-background overflow-y-auto pb-24"
        >
            <div className="sticky top-0 z-10 bg-background  px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-xl bg-card border border-border text-muted-foreground">
                        <ChevronLeft size={18} />
                    </button>
                    <h2 className="text-base font-bold text-foreground">{t('worldClock.details')}</h2>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-4">
                {/* TIME */}
                <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">{t('worldClock.time')}</p>
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-4 relative overflow-hidden shadow-xl">
                        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
                        <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-black/10" />
                        <div className="relative">
                            <h3 className="text-foreground font-bold text-xl">{clock.cityName}</h3>
                            <p className="text-indigo-200 text-xs uppercase tracking-wider mb-4">{clock.countryName.toUpperCase()}</p>
                            <div className="flex items-center gap-4">
                                <AnalogClock hour={td.hour} minute={td.minute} second={td.second} />
                                <div className="flex-1">
                                    <div className="font-mono text-foreground font-bold tracking-widest leading-none mb-1 text-4xl" style={{ textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
                                        {td.displayHour}:{td.displayMin}
                                    </div>
                                    <p className="text-indigo-200 text-xs">{td.weekday}, {td.day} {td.month}</p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] bg-white/20 text-foreground px-2 py-0.5 rounded-full font-medium">{offsetLabel}</span>
                                        <span className="text-[10px] bg-white/20 text-foreground px-2 py-0.5 rounded-full font-medium">{diffText}</span>
                                        {td.currentlyDST && dstChipLabel && (
                                            <span className="text-[10px] bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded-full font-bold">☀️ {dstChipLabel}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sunrise/Sunset */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Sunrise size={14} className="text-amber-500" />
                            <p className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase">{t('worldClock.sunrise')}</p>
                        </div>
                        <p className="text-foreground font-bold text-lg">{sun.sunrise}</p>
                    </div>
                    <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Sun size={14} className="text-orange-500" />
                            <p className="text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase">{t('worldClock.sunset')}</p>
                        </div>
                        <p className="text-foreground font-bold text-lg">{sun.sunset}</p>
                    </div>
                </div>

                {/* Economic Info — currency card with symbol + name + ISO code,
                    plus a graceful fallback when no data is available. */}
                <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">{t('worldClock.economicInfo')}</p>
                    <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 p-4 flex items-center gap-4 shadow-lg">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex flex-col items-center justify-center">
                                <span className="text-[9px] text-indigo-200 font-semibold uppercase">{t('worldClock.currency')}</span>
                                <span className="text-yellow-300 font-bold text-xl leading-none">{meta.currencySymbol || '—'}</span>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                <div className="flex items-center gap-2">
                                    <DollarSign size={12} className="text-indigo-200" />
                                    <span className="text-[10px] text-indigo-200 uppercase font-bold">{t('worldClock.currency')}</span>
                                </div>
                                {extras?.currencyCode && (
                                    <span className="text-[10px] font-black text-yellow-300 bg-white/15 px-2 py-0.5 rounded-md tracking-wider">
                                        {extras.currencyCode}
                                    </span>
                                )}
                            </div>
                            {meta.currencyName ? (
                                <p className="text-foreground font-bold text-base truncate">{meta.currencyName}</p>
                            ) : (
                                <p className="text-indigo-200 italic text-xs">
                                    {t('worldClock.currencyUnavailable', 'Currency data unavailable')}
                                    {meta.countryCode ? ` (${meta.countryCode})` : ''}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Languages — primary spoken language(s) for the country.
                    Hidden when we have no language data (e.g. unknown
                    timezone), so the section never renders blank. */}
                {extras?.languages && (
                    <div className="rounded-2xl bg-card border border-border p-4">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                            🌐 {t('worldClock.language', 'Language')}
                        </p>
                        <p className="text-foreground font-bold text-sm">{extras.languages}</p>
                    </div>
                )}

                {/* Geography */}
                <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">{t('worldClock.geography')}</p>
                    <div className="rounded-2xl bg-card p-4 flex items-center gap-4 shadow-lg border border-border">
                        <div className="flex-shrink-0">
                            <div className="w-16 h-16 rounded-xl bg-muted flex flex-col items-center justify-center gap-1.5 overflow-hidden">
                                <FlagImage code={meta.countryCode} size="lg" className="rounded-sm shadow-sm" />
                                <MapPin size={10} className="text-muted-foreground" />
                            </div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground text-xs">{t('worldClock.country')} :</span>
                                <span className="text-foreground font-bold">{clock.countryName}</span>
                            </div>
                            {extras?.capital && (
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground text-xs">{t('worldClock.capital', 'Capital')} :</span>
                                    <span className="text-foreground font-bold">{extras.capital}</span>
                                </div>
                            )}
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground text-xs">{t('worldClock.countryCode')} :</span>
                                <span className="text-foreground font-bold">{meta.countryCode || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground text-xs">{t('worldClock.region')} :</span>
                                <span className="text-foreground font-bold">{meta.region}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground text-xs">{t('worldClock.phoneCode')} :</span>
                                <span className="text-foreground font-bold">{meta.phoneCode || '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timezone Info */}
                <div className="rounded-2xl bg-card border border-border p-4">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">{t('worldClock.timezoneInfo')}</p>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('worldClock.ianaName')}</span>
                            <span className="text-foreground font-mono text-xs">{clock.timezone}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('worldClock.utcOffset')}</span>
                            <span className="text-foreground font-medium">{offsetLabel}</span>
                        </div>
                        {td.tzAbbr && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('worldClock.tzAbbreviation', 'Abbreviation')}</span>
                                <span className="text-foreground font-medium font-mono">{td.tzAbbr}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('worldClock.dst')}</span>
                            <span className={`font-medium ${td.isDST ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                {td.isDST ? (td.currentlyDST ? t('worldClock.active') : t('worldClock.observing')) : t('worldClock.notObserved')}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Upcoming DST Change */}
                {td.nextDST && (
                    <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={14} className="text-amber-600" />
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{t('worldClock.upcomingClockChange')}</p>
                        </div>
                        <p className="text-foreground text-sm font-semibold mb-1">
                            {t('worldClock.clocksGo', { direction: td.nextDST.type })} {t('worldClock.oneHour')}
                        </p>
                        <p className="text-muted-foreground text-sm">
                            {new Intl.DateTimeFormat('en-IN', { 
                                timeZone: clock.timezone, 
                                weekday: 'short', 
                                month: 'long', 
                                day: 'numeric', 
                                year: 'numeric', 
                                hour: 'numeric', 
                                minute: 'numeric', 
                                hour12: true 
                            }).format(td.nextDST.date)}
                        </p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

const LiveClockCard = memo(function LiveClockCard({ clock, index, onDetail, onRemove }: { clock: SavedClock; index: number; onDetail: () => void; onRemove: () => void }) {
    const { t } = useTranslation();
    const now = useSharedTime();
    const td = getTimeData(clock.timezone, now);
    const meta = getCountryMeta(clock.timezone);

    // Day / dawn-dusk / night classification, used for the left
    // border accent. Standard ranges from World Clock Master and
    // similar apps:
    //   06:00–07:59 → dawn  (orange)
    //   08:00–17:59 → day   (bright green)
    //   18:00–19:59 → dusk  (orange)
    //   else        → night (dark navy)
    const isDawnDusk = (td.hour >= 6 && td.hour < 8) || (td.hour >= 18 && td.hour < 20);
    const isDayTime = td.hour >= 8 && td.hour < 18;
    const isDark = !isDayTime && !isDawnDusk;
    const accentColor = isDawnDusk ? '#f59e0b' : isDayTime ? '#10b981' : '#3730a3';

    // UTC offset (normalised from Intl's "GMT+5:30" → "UTC+5:30")
    // and a real timezone abbreviation badge when the OS provides
    // one — BST/EDT/IST/JST/AEDT etc. When on DST the badge is
    // amber, on standard time it's a quiet grey "Standard" pill.
    const offsetLabel = formatUtcOffset(td.offsetStr);
    const dstBadge: { text: string; tone: 'amber' | 'grey' } | null = td.currentlyDST
        ? { text: td.tzAbbr || 'DST', tone: 'amber' }
        : (td.isDST ? { text: td.tzAbbr || t('worldClock.standardTimeShort', 'Standard'), tone: 'grey' } : null);

    // "Behind / ahead" reference is the user's device timezone, not
    // hardcoded IST. A user in London now sees "5h 30m ahead of BST"
    // for India instead of always "ahead of IST".
    const deviceLabel = getDeviceZoneLabel(now);
    const absMins = Math.abs(td.diffMins);
    const diffText =
        td.diffMins === 0
            ? t('worldClock.sameTime', 'Same time')
            : `${Math.floor(absMins / 60)}h${absMins % 60 > 0 ? ` ${absMins % 60}m` : ''} ${td.diffMins < 0 ? t('worldClock.behindRef', 'behind') : t('worldClock.aheadRef', 'ahead of')} ${deviceLabel}`;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="relative rounded-2xl overflow-hidden shadow-md cursor-pointer active:scale-[0.98] transition-transform select-none border border-border bg-card"
            onClick={onDetail}
        >
            {/* Day / dawn-dusk / night accent strip on the left edge. */}
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accentColor }} />
            <div className={`absolute inset-0 opacity-10 ${isDark ? 'bg-indigo-900' : 'bg-primary'}`} />
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-primary/5" />
            <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-black/5" />

            <div className="relative p-4 pl-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-[36px] h-[24px] flex-shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-[2px] overflow-hidden">
                        {meta.countryCode ? (
                            <FlagImage code={meta.countryCode} size="md" />
                        ) : (
                            <Globe size={16} className="text-slate-400" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-foreground font-bold text-base">{clock.cityName}</h3>
                            {dstBadge && (
                                <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                        dstBadge.tone === 'amber'
                                            ? 'bg-amber-500/20 text-amber-500'
                                            : 'bg-slate-500/15 text-slate-500'
                                    }`}
                                    title={td.currentlyDST ? t('worldClock.dstActive') : t('worldClock.standardTime')}
                                >
                                    {dstBadge.text}
                                </span>
                            )}
                        </div>
                        <p className="text-muted-foreground text-[11px]">{clock.countryName} · {offsetLabel}</p>
                        <p className="text-muted-foreground text-[10px]">{td.weekday}, {td.day} {td.month} · {diffText}</p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <div className="font-mono text-foreground font-bold text-2xl" style={{ letterSpacing: '0.02em' }}>
                        {td.displayHour}:{td.displayMin}
                    </div>
                    <span className="text-muted-foreground text-xs uppercase">{td.ampm}</span>
                    {!clock.isPinned && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            className="mt-1 p-1 rounded-lg bg-card border border-border hover:bg-muted transition-colors"
                        >
                            <X size={12} className="text-muted-foreground" />
                        </button>
                    )}
                </div>
            </div>

            {td.nextDST && (td.nextDST.date.getTime() - now.getTime()) < 5 * 86400000 && (
                <div className="bg-amber-500/10 border-t border-amber-500/20 px-4 py-1.5 flex flex-row items-center justify-between">
                     <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase flex items-center gap-1.5">
                         <Clock size={10} /> 
                         {t('worldClock.dstChangeIn', { days: Math.max(0, Math.ceil((td.nextDST.date.getTime() - now.getTime()) / 86400000)) })}
                     </span>
                     <span className="text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase bg-amber-500/20 px-1.5 py-0.5 rounded-sm">
                         {td.nextDST.type === 'forward' ? t('worldClock.plusOneHr') : t('worldClock.minusOneHr')}
                     </span>
                </div>
            )}
        </motion.div>
    );
});

// Lightweight time getter for the Add panel — skips DST iteration entirely
// getTimeData is too heavy (calls getNextDST which iterates 365 days × ~100 timezones = ~73K locale calls)
function getAddPanelTimeData(iana: string, now: Date) {
    try {
        const parts = new Intl.DateTimeFormat('en-IN', {
            timeZone: iana, hour: '2-digit', minute: '2-digit', hour12: true,
        }).formatToParts(now);
        const displayHour = parts.find(p => p.type === 'hour')?.value || '12';
        const displayMin = parts.find(p => p.type === 'minute')?.value || '00';
        const ampm = parts.find(p => p.type === 'dayPeriod')?.value?.toUpperCase() || 'AM';
        const offsetStr = new Intl.DateTimeFormat('en-US', {
            timeZone: iana, timeZoneName: 'shortOffset',
        }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || 'UTC';
        return { displayHour, displayMin, ampm, offsetStr };
    } catch {
        return { displayHour: '12', displayMin: '00', ampm: 'AM', offsetStr: 'UTC' };
    }
}

const LiveAddZoneItem = memo(function LiveAddZoneItem({ tz, onAdd }: { tz: TimezoneInfo; onAdd: () => void }) {
    const now = useSharedTime();
    const meta = getCountryMeta(tz.iana);
    const td = getAddPanelTimeData(tz.iana, now);
    
    return (
        <button onClick={onAdd}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-background border border-border hover:border-primary/50 transition-colors text-left group">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-[32px] h-[22px] flex-shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                    {meta.countryCode ? (
                        <FlagImage code={meta.countryCode} size="sm" />
                    ) : (
                        <Globe size={14} className="text-slate-400" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold text-sm truncate group-hover:text-primary transition-colors">{tz.city}</p>
                    <p className="text-muted-foreground text-xs truncate">{tz.country}</p>
                </div>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0 text-right">
                <div className="hidden sm:block">
                    <p className="text-foreground font-mono text-sm font-medium">{td.displayHour}:{td.displayMin} {td.ampm}</p>
                    <p className="text-muted-foreground text-[10px]">{td.offsetStr}</p>
                </div>
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus size={14} className="text-primary" />
                </div>
            </div>
        </button>
    );
});

export default function WorldClock() {
    const { t } = useTranslation();
    useEffect(() => { AnalyticsService.trackScreen('World_Clock'); }, []);
    const navigate = useNavigate();
    const [view, setView] = useState<'clocks' | 'compare'>('clocks');
    const [clocks, setClocks] = useState<SavedClock[]>([]);
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [detailClock, setDetailClock] = useState<SavedClock | null>(null);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Mount logic - Read from LocalStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem('fincalix_world_clocks');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setClocks(parsed);
                    return;
                }
            }
        } catch {}
        setClocks(DEFAULT_CLOCKS);
    }, []);

    // Mount logic - Read from LocalStorage
    const activeClocks = useMemo(() => {
        let clocksCopy = [...clocks];
        
        // Failsafe pin IST if lost somehow
        const hasPinned = clocksCopy.some(c => c.isPinned);
        if (!hasPinned && clocksCopy.length > 0) {
            const fallbackIST = clocksCopy.findIndex(c => c.timezone === 'Asia/Kolkata');
            if (fallbackIST >= 0) {
                clocksCopy[fallbackIST] = { ...clocksCopy[fallbackIST], isPinned: true };
            }
        }

        let sorted = clocksCopy.filter(c => c.timezone !== 'Asia/Kolkata' && c.timezone !== 'Asia/Karachi')
            .sort((a, b) => a.cityName.localeCompare(b.cityName));

        const istClock = clocksCopy.find(c => c.timezone === 'Asia/Kolkata');
        const karachiClock = clocksCopy.find(c => c.timezone === 'Asia/Karachi');

        if (istClock) sorted.unshift(istClock);
        if (karachiClock) sorted.push(karachiClock);

        return sorted;
    }, [clocks]);

    // Enhanced search — uses the shared `normalizeForSearch` + `tzMatches`
    // helpers (defined at the top of this file) so the Add panel and the
    // Compare picker behave identically. Diacritic-stripping means a query
    // like "sao paulo" matches "São Paulo / Brasília" and "zimba" matches
    // both "Zimbabwe" and the searchTerms field "zimbabwe harare zw".
    //
    // Search activates as soon as the user types ANY character (was 2 before),
    // so single-letter and partial matches surface immediately.
    const availableZones = useMemo(() => {
        const nq = normalizeForSearch(searchQuery);
        const excludeIanas = clocks.map(c => c.timezone);
        const notSelected = WORLD_TIMEZONES.filter(t => !excludeIanas.includes(t.iana));

        if (!nq) {
            // No query — show popular first, then everything else
            const popular = POPULAR_IANA.map(iana => notSelected.find(t => t.iana === iana)).filter(Boolean) as TimezoneInfo[];
            const popularIanas = popular.map(t => t.iana);
            const rest = notSelected.filter(t => !popularIanas.includes(t.iana));
            return [...popular, ...rest];
        }

        // Active query — match across city, country, iana, searchTerms,
        // AND the live UTC offset string (so "+5" or "GMT+5" finds India).
        const searchDate = new Date();
        return notSelected.filter(t => {
            if (tzMatches(t, nq)) return true;
            // Offset fallback
            try {
                const offsetStr = new Intl.DateTimeFormat('en-US', {
                    timeZone: t.iana, timeZoneName: 'shortOffset',
                }).formatToParts(searchDate).find(p => p.type === 'timeZoneName')?.value || '';
                return offsetStr.toLowerCase().includes(nq);
            } catch {
                return false;
            }
        });
    }, [clocks, searchQuery]);

    /** True when the user has typed something in the Add panel search box. */
    const isSearchingZones = searchQuery.trim().length > 0;

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const addZone = (tz: TimezoneInfo) => {
        const newClock: SavedClock = {
            id: `clock_${Date.now()}`,
            cityName: tz.city.split(' / ')[0], // Get primary city name
            countryName: tz.country,
            timezone: tz.iana,
            addedAt: new Date().toISOString()
        };
        const nextClocks = [...clocks, newClock];
        localStorage.setItem('fincalix_world_clocks', JSON.stringify(nextClocks));
        setClocks(nextClocks);
        setShowAddPanel(false);
        setSearchQuery('');
        showToast(t('worldClock.cityAdded', { city: newClock.cityName }));
    };

    const removeZone = (clockId: string) => {
        const nextClocks = clocks.filter(c => c.id !== clockId);
        localStorage.setItem('fincalix_world_clocks', JSON.stringify(nextClocks));
        setClocks(nextClocks);
    };

    return (
        <div className="min-h-dvh bg-background animate-fade-in relative overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background px-4 pt-14 pb-3 border-b border-border">
                {/* Title row */}
                <div className="flex items-center gap-3 mb-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border text-muted-foreground">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-foreground">{t('worldClock.title')}</h1>
                        <p className="text-muted-foreground text-xs">
                            {view === 'compare' ? t('worldClock.timezoneConverter') : t('worldClock.citiesCount', { count: activeClocks.length })}
                        </p>
                    </div>
                </div>
                {/* Full-width action row */}
                <div className="flex gap-2">
                    <button
                        onClick={() => { setView('clocks'); setShowAddPanel(true); }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-card border border-border text-foreground text-xs font-semibold transition-colors active:scale-[0.98]"
                    >
                        <Plus size={14} />
                        {t('worldClock.add')}
                    </button>
                    <button
                        onClick={() => setView(v => v === 'compare' ? 'clocks' : 'compare')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-colors active:scale-[0.98] ${
                            view === 'compare'
                                ? 'bg-primary/80 text-primary-foreground border border-primary/80'
                                : 'bg-primary text-primary-foreground border border-primary'
                        }`}
                    >
                        <ArrowRightLeft size={14} />
                        {t('worldClock.compare')}
                    </button>
                </div>
            </div>


            {/* Compare View or Clock Cards */}
            {view === 'compare' ? (
                <CompareView />
            ) : (
            <div className="px-4 pt-3 pb-28 space-y-4">
                {activeClocks.map((clock, i) => (
                    <LiveClockCard 
                        key={clock.id} 
                        clock={clock} 
                        index={i} 
                        onDetail={() => setDetailClock(clock)} 
                        onRemove={() => removeZone(clock.id)} 
                    />
                ))}

                {activeClocks.length === 0 && (
                    <div className="text-center py-16">
                        <Globe size={40} className="text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">{t('worldClock.noCitiesAdded')}</p>
                    </div>
                )}
            </div>
            )}

            {/* Success Toast */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-32 left-4 right-4 z-[99999] flex justify-center pointer-events-none">
                        <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-semibold">
                            <Globe size={16} />
                            {toastMessage}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Zone Bottom Sheet */}
            {/* z-[10000] sits ABOVE the global bottom nav (z-[9999] in Layout.tsx)
                so the bottom of the search list isn't covered by the nav bar. */}
            <AnimatePresence>
                {showAddPanel && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] bg-black/50 "
                        onClick={(e) => { if (e.target === e.currentTarget) { setShowAddPanel(false); setSearchQuery(''); } }}
                    >
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 26, stiffness: 200 }}
                            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl flex flex-col border-t border-border z-[10000]"
                            style={{ maxHeight: '85vh' }}
                        >
                            <div className="flex items-center justify-between p-6 pb-3 flex-shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">{t('worldClock.addTimezone')}</h3>
                                    <p className="text-muted-foreground text-xs">
                                        {isSearchingZones
                                            ? t('worldClock.matchesFound', { count: availableZones.length })
                                            : t('worldClock.countriesAvailable', { count: WORLD_TIMEZONES.length })}
                                    </p>
                                </div>
                                <button onClick={() => { setShowAddPanel(false); setSearchQuery(''); }}
                                    className="p-2 rounded-xl bg-muted text-muted-foreground">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="px-6 mb-3 flex-shrink-0">
                                <div className="relative">
                                    <Search size={16} className="absolute inset-y-0 my-auto left-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder={t('worldClock.searchPlaceholder')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        autoFocus
                                        className="w-full bg-input border border-border rounded-xl py-3 pl-11 pr-10 text-sm text-foreground outline-none focus:border-primary transition-colors"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 my-auto right-4 text-muted-foreground">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {!searchQuery && (
                                <p className="px-6 text-[10px] text-primary font-bold uppercase mb-2 flex-shrink-0">
                                    🌟 {t('worldClock.popularCities')}
                                </p>
                            )}

                            {/* Bottom padding accounts for Android gesture-nav inset so
                                the LAST result is always tappable, never clipped by safe-area. */}
                            <div
                                className="overflow-y-auto flex-1 px-6 space-y-2"
                                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
                            >
                                {availableZones.map(tz => (
                                    <LiveAddZoneItem key={tz.iana} tz={tz} onAdd={() => addZone(tz)} />
                                ))}

                                {availableZones.length === 0 && (
                                    <div className="text-center py-8">
                                        <Globe size={32} className="text-muted-foreground mx-auto mb-2 opacity-50" />
                                        <p className="text-muted-foreground text-sm font-medium">{t('worldClock.noMatchingCities')}</p>
                                        <p className="text-muted-foreground/70 text-xs mt-1">{t('worldClock.searchHint')}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detail View */}
            <AnimatePresence>
                {detailClock && (
                    <CityDetailView clock={detailClock} onBack={() => setDetailClock(null)} />
                )}
            </AnimatePresence>

            <DisclaimerComponent module="time" />
        </div>
    );
}
