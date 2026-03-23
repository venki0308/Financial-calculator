import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Search, ChevronLeft, Sun, Sunrise, MapPin, DollarSign, Globe, ArrowRightLeft, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import BottomSheet from '../components/BottomSheet';

import { getCountryMeta, getSunTimes } from '../data/countryData';
import { WORLD_TIMEZONES, POPULAR_IANA, TimezoneInfo } from '../data/timezones';

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
function filterZones(q: string) {
    const lq = q.toLowerCase().trim();
    if (!lq || lq.length < 1) {
        const pop = POPULAR_IANA.map(i => WORLD_TIMEZONES.find(t => t.iana === i)).filter(Boolean) as TimezoneInfo[];
        const rest = WORLD_TIMEZONES.filter(t => !POPULAR_IANA.includes(t.iana));
        return [...pop, ...rest];
    }
    return WORLD_TIMEZONES.filter(t =>
        t.city.toLowerCase().includes(lq) ||
        t.country.toLowerCase().includes(lq) ||
        t.iana.toLowerCase().includes(lq)
    );
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
    return (
        <BottomSheet isOpen={isOpen} onClose={() => { onClose(); setSearch(''); }} title={`Select ${label}`}>
            <div className="px-4 mb-3 flex-shrink-0">
                <div className="relative">
                    <Search size={14} className="absolute inset-y-0 my-auto left-3 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search city or country…"
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
// CompareView – Convert a user-entered time from Zone A to Zone B
// ────────────────────────────────────────────────────────────────────────────
function CompareView() {
    // Load/save last used TZ pair
    const loadSaved = () => {
        try {
            const s = localStorage.getItem('fincalix_compare_tz');
            if (s) return JSON.parse(s) as { a: string; b: string };
        } catch {}
        return { a: 'Asia/Kolkata', b: 'America/New_York' };
    };

    const [tzA, setTzA] = useState<string>(loadSaved().a);
    const [tzB, setTzB] = useState<string>(loadSaved().b);
    const [inputHour, setInputHour] = useState(9);
    const [inputMin, setInputMin] = useState(0);
    const [searchA, setSearchA] = useState('');
    const [searchB, setSearchB] = useState('');
    const [showPickerA, setShowPickerA] = useState(false);
    const [showPickerB, setShowPickerB] = useState(false);
    const [useLive, setUseLive] = useState(false);

    // Only subscribe to live ticker when useLive is ON — prevents 1s re-renders during zone picking
    const liveNow = useSharedTime();
    const staticNow = useRef(new Date());
    const now = useLive ? liveNow : staticNow.current;

    useEffect(() => {
        localStorage.setItem('fincalix_compare_tz', JSON.stringify({ a: tzA, b: tzB }));
    }, [tzA, tzB]);

    const result = useMemo(() => {
        try {
            let refDate: Date;
            if (useLive) {
                refDate = now;
            } else {
                // Build a base Date at today's date but user-entered H:M in tzA
                const todayInA = new Intl.DateTimeFormat('en-US', {
                    timeZone: tzA, year: 'numeric', month: '2-digit', day: '2-digit'
                }).format(now);
                const [m, d, y] = todayInA.split('/');
                refDate = new Date(`${y}-${m}-${d}T${String(inputHour).padStart(2, '0')}:${String(inputMin).padStart(2, '0')}:00`);
                // Compute exact offset ms of tzA vs UTC
                const tzStr = now.toLocaleString('en-US', { timeZone: tzA });
                const utcStr = now.toLocaleString('en-US', { timeZone: 'UTC' });
                const tzAOffset = new Date(tzStr).getTime() - new Date(utcStr).getTime();
                const utcEquiv = new Date(refDate.getTime() - tzAOffset);
                refDate = utcEquiv;
            }

            const fmtTime = (iana: string) => new Intl.DateTimeFormat('en-US', {
                timeZone: iana, hour: '2-digit', minute: '2-digit', hour12: true
            }).format(refDate).toLowerCase();

            const fmtDay = (iana: string) => new Intl.DateTimeFormat('en-US', {
                timeZone: iana, weekday: 'short', day: 'numeric', month: 'short'
            }).format(refDate);

            const fmtOffset = (iana: string) => {
                return new Intl.DateTimeFormat('en-US', {
                    timeZone: iana, timeZoneName: 'shortOffset'
                }).formatToParts(refDate).find(p => p.type === 'timeZoneName')?.value || 'UTC';
            };

            // Day-cross comparison
            const dateA = new Intl.DateTimeFormat('en-CA', { timeZone: tzA }).format(refDate);
            const dateB = new Intl.DateTimeFormat('en-CA', { timeZone: tzB }).format(refDate);
            const diff = (new Date(dateB).getTime() - new Date(dateA).getTime()) / 86400000;
            let dayCross = '';
            if (diff > 0) dayCross = '+1 Day';
            else if (diff < 0) dayCross = '-1 Day';

            return {
                timeA: fmtTime(tzA),
                timeB: fmtTime(tzB),
                dayA: fmtDay(tzA),
                dayB: fmtDay(tzB),
                offsetA: fmtOffset(tzA),
                offsetB: fmtOffset(tzB),
                dayCross,
            };
        } catch {
            return null;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tzA, tzB, inputHour, inputMin, useLive, useLive ? now : null]);

    return (
        <div className="px-4 pt-6 pb-28 space-y-6">
            {/* Zone Pickers styling redesign */}
            <div className="p-5 rounded-[24px] bg-card border border-border flex flex-col gap-4 relative">
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 px-1 tracking-wider">Source Timezone</p>
                    <button
                        onClick={() => setShowPickerA(true)}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-muted/30 border border-border text-left transition-colors active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-3 truncate min-w-0">
                            <div className="p-1.5 rounded-full bg-indigo-500/10 text-indigo-500 flex-shrink-0">
                                <Globe size={16} />
                            </div>
                            <span className="text-sm font-semibold text-foreground truncate">{getZoneLabel(tzA)}</span>
                        </div>
                    </button>
                </div>

                <div className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 z-10 p-1.5 bg-card rounded-full shadow-sm border border-border"> 
                    <button
                        onClick={() => { const tmp = tzA; setTzA(tzB); setTzB(tmp); }}
                        className="p-2.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                        <ArrowRightLeft size={16} />
                    </button>
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2 px-1 tracking-wider text-right">Target Timezone</p>
                    <button
                        onClick={() => setShowPickerB(true)}
                        className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-muted/30 border border-border text-left transition-colors active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-3 truncate min-w-0">
                            <div className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-500 flex-shrink-0">
                                <Globe size={16} />
                            </div>
                            <span className="text-sm font-semibold text-foreground truncate">{getZoneLabel(tzB)}</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Time Input Section */}
            <div className="p-5 rounded-[24px] bg-card border border-border relative">
                <div className="flex items-center justify-between mb-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Clock size={12} /> Compare Style
                    </p>
                    <div className="flex bg-muted p-1 rounded-xl">
                        <button 
                            onClick={() => setUseLive(false)} 
                            className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${!useLive ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                        >
                            Manual
                        </button>
                        <button 
                            onClick={() => setUseLive(true)} 
                            className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${useLive ? 'bg-primary shadow-sm text-primary-foreground' : 'text-muted-foreground'}`}
                        >
                            Live Time
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="popLayout">
                    {!useLive && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-background border border-border rounded-[20px] p-4 flex flex-col items-center">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Hour (0-23)</span>
                                    <input
                                        type="number"
                                        value={String(inputHour)}
                                        onChange={e => setInputHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                                        className="w-full text-center bg-transparent text-4xl font-mono text-foreground font-black outline-none"
                                    />
                                </div>
                                <span className="text-2xl font-black text-muted-foreground pb-2">:</span>
                                <div className="flex-1 bg-background border border-border rounded-[20px] p-4 flex flex-col items-center">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Min (0-59)</span>
                                    <input
                                        type="number"
                                        value={String(inputMin)}
                                        onChange={e => setInputMin(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                        className="w-full text-center bg-transparent text-4xl font-mono text-foreground font-black outline-none"
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Result */}
            {result && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative pb-4"
                >
                    {/* Source Result */}
                    <div className="p-6 rounded-[28px] bg-gradient-to-br from-[#4F46E5] to-[#4338CA] shadow-lg shadow-indigo-500/20 relative z-10 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-white text-[10px] uppercase font-black tracking-widest bg-black/20 px-2.5 py-1 rounded-full border border-white/5">Source</p>
                            <p className="text-indigo-200 text-[11px] uppercase font-bold">{result.offsetA}</p>
                        </div>
                        <p className="text-white font-black text-4xl tracking-tight my-3 font-mono drop-shadow-sm truncate">{result.timeA}</p>
                        <p className="text-indigo-100 text-sm font-medium opacity-90">{result.dayA}</p>
                    </div>

                    {/* Connector */}
                    <div className="flex justify-center -my-3.5 relative z-20">
                        <div className="bg-card border border-border shadow-sm rounded-full px-4 py-1.5 flex items-center gap-2">
                            <Globe size={12} className={result.dayCross ? "text-amber-500" : "text-muted-foreground"} />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                {result.dayCross ? <span className="text-amber-500">{result.dayCross}</span> : 'Same Day'}
                            </span>
                        </div>
                    </div>

                    {/* Target Result */}
                    <div className="p-6 rounded-[28px] bg-gradient-to-br from-[#059669] to-[#047857] shadow-lg shadow-emerald-500/20 relative z-10 border border-white/10">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-white text-[10px] uppercase font-black tracking-widest bg-black/20 px-2.5 py-1 rounded-full border border-white/5">Target</p>
                            <p className="text-emerald-200 text-[11px] uppercase font-bold">{result.offsetB}</p>
                        </div>
                        <p className="text-white font-black text-4xl tracking-tight my-3 font-mono drop-shadow-sm truncate">{result.timeB}</p>
                        <p className="text-emerald-100 text-sm font-medium opacity-90">{result.dayB}</p>
                    </div>
                </motion.div>
            )}

            <TZPickerSheet isOpen={showPickerA} onClose={() => setShowPickerA(false)} label="Source Zone" value={tzA} onChange={setTzA} search={searchA} setSearch={setSearchA} />
            <TZPickerSheet isOpen={showPickerB} onClose={() => setShowPickerB(false)} label="Target Zone" value={tzB} onChange={setTzB} search={searchB} setSearch={setSearchB} />

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 mt-6">
                <p className="text-muted-foreground text-[10px] leading-relaxed">
                    📡 Conversion uses Intl.DateTimeFormat UTC offsets. DST transitions are accounted for automatically.
                </p>
            </div>
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

        // Diff to IST
        const istOff = getOff(now, 'Asia/Kolkata');
        const diffMins = currentOff - istOff;
        let diffStr = 'Same as IST';
        if (diffMins !== 0) {
            const h = Math.floor(Math.abs(diffMins) / 60);
            const m = Math.abs(diffMins) % 60;
            const dir = diffMins < 0 ? "behind" : "ahead of";
            diffStr = `${h}h${m > 0 ? ` ${m}m` : ''} ${dir} IST`;
        }
        
        const nextDST = getNextDST(iana, now);

        return { hour, minute, second, displayHour, displayMin, ampm, offsetStr, isDST, currentlyDST, weekday, day, month, diffStr, nextDST };
    } catch {
        return { hour: 0, minute: 0, second: 0, displayHour: '12', displayMin: '00', ampm: 'AM', offsetStr: 'UTC', isDST: false, currentlyDST: false, weekday: '', day: '', month: '', diffStr: 'Same as IST', nextDST: null };
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
    const now = useSharedTime();
    const td = getTimeData(clock.timezone, now);
    const meta = getCountryMeta(clock.timezone);
    const sun = getSunTimes(clock.timezone, now);

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
                    <h2 className="text-base font-bold text-foreground">DETAILS</h2>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-4">
                {/* TIME */}
                <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Time</p>
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
                                        <span className="text-[10px] bg-white/20 text-foreground px-2 py-0.5 rounded-full font-medium">{td.offsetStr}</span>
                                        <span className="text-[10px] bg-white/20 text-foreground px-2 py-0.5 rounded-full font-medium">{td.diffStr}</span>
                                        {td.currentlyDST && <span className="text-[10px] bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded-full font-bold">☀️ DST</span>}
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
                            <p className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase">Sunrise</p>
                        </div>
                        <p className="text-foreground font-bold text-lg">{sun.sunrise}</p>
                    </div>
                    <div className="rounded-2xl bg-orange-500/10 border border-orange-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Sun size={14} className="text-orange-500" />
                            <p className="text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase">Sunset</p>
                        </div>
                        <p className="text-foreground font-bold text-lg">{sun.sunset}</p>
                    </div>
                </div>

                {/* Economic Info */}
                <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Economic Info</p>
                    <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 p-4 flex items-center gap-4 shadow-lg">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-white/20 flex flex-col items-center justify-center">
                                <span className="text-[9px] text-indigo-200 font-semibold uppercase">Currency</span>
                                <span className="text-yellow-300 font-bold text-xl leading-none">{meta.currencySymbol}</span>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <DollarSign size={12} className="text-indigo-200" />
                                <span className="text-[10px] text-indigo-200 uppercase font-bold">Currency</span>
                            </div>
                            <p className="text-foreground font-bold text-base">{meta.currencyName}</p>
                        </div>
                    </div>
                </div>

                {/* Geography */}
                <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Geography</p>
                    <div className="rounded-2xl bg-card p-4 flex items-center gap-4 shadow-lg border border-border">
                        <div className="flex-shrink-0">
                            <div className="w-16 h-16 rounded-xl bg-muted flex flex-col items-center justify-center gap-2">
                                <img 
                                    src={`https://flagcdn.com/w40/${meta.countryCode.toLowerCase()}.png`} 
                                    alt={meta.countryCode}
                                    className="w-8 h-auto shadow-[0_0_10px_rgba(0,0,0,0.2)] rounded-sm"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <MapPin size={10} className="text-muted-foreground" />
                            </div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground text-xs">Country :</span>
                                <span className="text-foreground font-bold">{clock.countryName}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground text-xs">Country Code :</span>
                                <span className="text-foreground font-bold">{meta.countryCode}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground text-xs">Region :</span>
                                <span className="text-foreground font-bold">{meta.region}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground text-xs">Phone Code :</span>
                                <span className="text-foreground font-bold">{meta.phoneCode}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timezone Info */}
                <div className="rounded-2xl bg-card border border-border p-4">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Timezone Info</p>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">IANA Name</span>
                            <span className="text-foreground font-mono text-xs">{clock.timezone}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">UTC Offset</span>
                            <span className="text-foreground font-medium">{td.offsetStr}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">DST</span>
                            <span className={`font-medium ${td.isDST ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                {td.isDST ? (td.currentlyDST ? 'Active' : 'Observing') : 'Not observed'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Upcoming DST Change */}
                {td.nextDST && (
                    <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={14} className="text-amber-600" />
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Upcoming Clock Change</p>
                        </div>
                        <p className="text-foreground text-sm font-semibold mb-1">
                            Clocks go <span className="text-amber-600 font-bold">{td.nextDST.type}</span> 1 hour
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
    const now = useSharedTime();
    const td = getTimeData(clock.timezone, now);
    const meta = getCountryMeta(clock.timezone);
    const isDark = td.hour < 6 || td.hour >= 20;

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="relative rounded-2xl overflow-hidden shadow-md cursor-pointer active:scale-[0.98] transition-transform select-none border border-border bg-card"
            onClick={onDetail}
        >
            <div className={`absolute inset-0 opacity-10 ${isDark ? 'bg-indigo-900' : 'bg-primary'}`} />
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-primary/5" />
            <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-black/5" />

            <div className="relative p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-[36px] h-[24px] flex-shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-[2px] overflow-hidden">
                        {meta.countryCode ? (
                            <img 
                                src={`https://flagcdn.com/w40/${meta.countryCode.toLowerCase()}.png`} 
                                alt={meta.countryCode}
                                className="w-full h-auto object-cover"
                                onError={(e) => { 
                                    e.currentTarget.style.display = 'none'; 
                                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                    if (e.currentTarget.parentElement) {
                                        e.currentTarget.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
                                    }
                                }}
                            />
                        ) : (
                            <Globe size={16} className="text-slate-400" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-foreground font-bold text-base">{clock.cityName}</h3>
                            {td.currentlyDST && (
                                <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded-full font-bold">DST</span>
                            )}
                        </div>
                        <p className="text-muted-foreground text-[11px]">{clock.countryName} · {td.offsetStr}</p>
                        <p className="text-muted-foreground text-[10px]">{td.weekday}, {td.day} {td.month} · {td.diffStr}</p>
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
                         DST Change in {Math.max(0, Math.ceil((td.nextDST.date.getTime() - now.getTime()) / 86400000))} Days
                     </span>
                     <span className="text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase bg-amber-500/20 px-1.5 py-0.5 rounded-sm">
                         {td.nextDST.type === 'forward' ? '+1 Hr' : '-1 Hr'}
                     </span>
                </div>
            )}
        </motion.div>
    );
});

const LiveAddZoneItem = memo(function LiveAddZoneItem({ tz, onAdd }: { tz: TimezoneInfo; onAdd: () => void }) {
    const now = useSharedTime();
    const meta = getCountryMeta(tz.iana);
    const td = getTimeData(tz.iana, now);
    
    return (
        <button onClick={onAdd}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-background border border-border hover:border-primary/50 transition-colors text-left group">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-[32px] h-[22px] flex-shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                    {meta.countryCode ? (
                        <img 
                            src={`https://flagcdn.com/w40/${meta.countryCode.toLowerCase()}.png`} 
                            alt={meta.countryCode}
                            className="w-full h-auto object-cover"
                            onError={(e) => { 
                                e.currentTarget.style.display = 'none'; 
                                e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                if (e.currentTarget.parentElement) {
                                    e.currentTarget.parentElement.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
                                }
                            }}
                        />
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

    // Enhanced Search logic
    const availableZones = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        const excludeIanas = clocks.map(c => c.timezone);
        const notSelected = WORLD_TIMEZONES.filter(t => !excludeIanas.includes(t.iana));

        if (!q || q.length < 2) {
            // Show popular first, keeping the order of POPULAR_IANA to ensure Karachi is at the bottom
            const popular = POPULAR_IANA.map(iana => notSelected.find(t => t.iana === iana)).filter(Boolean) as TimezoneInfo[];
            const popularIanas = popular.map(t => t.iana);
            const rest = notSelected.filter(t => !popularIanas.includes(t.iana));
            return [...popular, ...rest];
        }

        const searchDate = new Date();
        // Calculate offsets on the fly for search strings
        const filtered = notSelected.filter(t => {
            let offsetStr = 'UTC';
            try {
                offsetStr = new Intl.DateTimeFormat('en-US', {
                    timeZone: t.iana, timeZoneName: 'shortOffset',
                }).formatToParts(searchDate).find(p => p.type === 'timeZoneName')?.value || 'UTC';
            } catch (e) {
                // Ignore invalid timezones
            }
            
            return (
                t.searchTerms.includes(q) ||
                t.city.toLowerCase().includes(q) ||
                t.country.toLowerCase().includes(q) ||
                t.iana.toLowerCase().includes(q) ||
                offsetStr.toLowerCase().includes(q)
            );
        });

        return filtered;
    }, [clocks, searchQuery]);

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
        showToast(`${newClock.cityName} added to World Clock`);
    };

    const removeZone = (clockId: string) => {
        const nextClocks = clocks.filter(c => c.id !== clockId);
        localStorage.setItem('fincalix_world_clocks', JSON.stringify(nextClocks));
        setClocks(nextClocks);
    };

    return (
        <div className="min-h-dvh bg-background animate-fade-in relative overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background  px-4 pt-14 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border text-muted-foreground">
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">World Clock</h1>
                            <p className="text-muted-foreground text-xs">
                                {view === 'compare' ? 'Time zone converter' : `${activeClocks.length} cities · Tap for details`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {view === 'clocks' && (
                            <button onClick={() => setShowAddPanel(true)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                                <Plus size={16} />
                                <span className="text-xs font-medium">Add</span>
                            </button>
                        )}
                        <button
                            onClick={() => setView(v => v === 'compare' ? 'clocks' : 'compare')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                                view === 'compare'
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-card border-border text-muted-foreground'
                            }`}
                        >
                            <ArrowRightLeft size={14} />
                            Compare
                        </button>
                    </div>
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
                        <p className="text-muted-foreground">No cities added. Tap Add to begin.</p>
                    </div>
                )}
            </div>
            )}

            {/* Success Toast */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} 
                    className="fixed bottom-24 left-4 right-4 z-[60] flex justify-center pointer-events-none">
                        <div className="bg-foreground text-background px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-sm font-medium">
                            <Globe size={14} className="text-primary" />
                            {toastMessage}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Add Zone Bottom Sheet */}
            <AnimatePresence>
                {showAddPanel && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50 "
                        onClick={(e) => { if (e.target === e.currentTarget) { setShowAddPanel(false); setSearchQuery(''); } }}
                    >
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 26, stiffness: 200 }}
                            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl flex flex-col border-t border-border"
                            style={{ maxHeight: '85vh' }}
                        >
                            <div className="flex items-center justify-between p-6 pb-3 flex-shrink-0">
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">Add Time Zone</h3>
                                    <p className="text-muted-foreground text-xs">{WORLD_TIMEZONES.length} countries available</p>
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
                                        placeholder="Search India, New York, UTC+5..."
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
                                    🌟 Popular Cities
                                </p>
                            )}

                            <div className="overflow-y-auto flex-1 px-6 pb-6 space-y-2">
                                {availableZones.map(tz => (
                                    <LiveAddZoneItem key={tz.iana} tz={tz} onAdd={() => addZone(tz)} />
                                ))}

                                {availableZones.length === 0 && (
                                    <div className="text-center py-8">
                                        <Globe size={32} className="text-muted-foreground mx-auto mb-2 opacity-50" />
                                        <p className="text-muted-foreground text-sm font-medium">No matching cities found</p>
                                        <p className="text-muted-foreground/70 text-xs mt-1">Try "India", "Japan" or "+5:30"</p>
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
        </div>
    );
}
