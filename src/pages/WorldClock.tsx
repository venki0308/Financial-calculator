import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Search, ChevronLeft, Sun, Sunrise, MapPin, Phone, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { getCountryMeta, getSunTimes } from '../data/countryData';

interface TimezoneInfo {
    id: string;
    city: string;
    country: string;
    iana: string;
}

const TIMEZONE_LIST: TimezoneInfo[] = (() => {
    try {
        return (Intl as any).supportedValuesOf('timeZone').map((iana: string) => {
            const parts = iana.split('/');
            const city = parts[parts.length - 1]?.replace(/_/g, ' ') || iana;
            const country = parts.length > 1 ? parts[0].replace(/_/g, ' ') : '';
            return { id: iana.toLowerCase(), city, country, iana };
        });
    } catch {
        return ['Asia/Kolkata', 'Europe/London', 'America/New_York', 'Asia/Dubai', 'Asia/Tokyo',
            'Asia/Singapore', 'Europe/Paris', 'America/Los_Angeles', 'Australia/Sydney', 'UTC'].map(iana => {
            const parts = iana.split('/');
            return { id: iana.toLowerCase(), city: parts[parts.length - 1].replace(/_/g, ' '), country: parts[0], iana };
        });
    }
})();

const POPULAR_ZONES = [
    'Asia/Kolkata', 'Europe/London', 'America/New_York', 'Asia/Dubai',
    'Asia/Tokyo', 'Asia/Singapore', 'Europe/Paris', 'America/Los_Angeles',
    'Australia/Sydney', 'Asia/Shanghai', 'Europe/Berlin', 'America/Chicago',
    'Africa/Lagos', 'America/Sao_Paulo', 'Asia/Seoul', 'Asia/Bangkok',
];

function getTimeData(iana: string, now: Date) {
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: iana, hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        }).formatToParts(now);

        const get = (type: string) => parts.find(p => p.type === type)?.value || '';
        const hour = parseInt(get('hour'));
        const minute = parseInt(get('minute'));
        const second = parseInt(get('second'));

        const displayParts = new Intl.DateTimeFormat('en-US', {
            timeZone: iana, hour: '2-digit', minute: '2-digit', hour12: true,
        }).formatToParts(now);
        const displayHour = displayParts.find(p => p.type === 'hour')?.value || '00';
        const displayMin = displayParts.find(p => p.type === 'minute')?.value || '00';
        const ampm = displayParts.find(p => p.type === 'dayPeriod')?.value || '';

        const offsetStr = new Intl.DateTimeFormat('en-US', {
            timeZone: iana, timeZoneName: 'shortOffset',
        }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || '';

        const jan = new Date(now.getFullYear(), 0, 1);
        const jul = new Date(now.getFullYear(), 6, 1);
        const janOff = new Date(jan.toLocaleString('en-US', { timeZone: iana })).getTimezoneOffset();
        const julOff = new Date(jul.toLocaleString('en-US', { timeZone: iana })).getTimezoneOffset();
        const isDST = janOff !== julOff;
        const currentlyDST = isDST && (new Date(now.toLocaleString('en-US', { timeZone: iana })).getTimezoneOffset() === Math.min(janOff, julOff));

        const weekday = get('weekday');
        const day = get('day');
        const month = get('month');

        return { hour, minute, second, displayHour, displayMin, ampm, offsetStr, isDST, currentlyDST, weekday, day, month };
    } catch {
        return { hour: 0, minute: 0, second: 0, displayHour: '00', displayMin: '00', ampm: 'AM', offsetStr: '', isDST: false, currentlyDST: false, weekday: '', day: '', month: '' };
    }
}

// Analog Clock Component
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
        <svg viewBox="0 0 100 100" className="w-24 h-24" style={{ filter: 'drop-shadow(0 4px 12px rgba(100,80,255,0.3))' }}>
            {/* Outer ring */}
            <circle cx={cx} cy={cy} r={r + 3} fill="#3730a3" opacity="0.3" />
            {/* Face */}
            <circle cx={cx} cy={cy} r={r} fill="white" />
            {/* Hour marks */}
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
            {/* Hour hand */}
            <line x1={cx} y1={cy} {...hand(hourAngle, 26)} stroke="#1e1b4b" strokeWidth={3} strokeLinecap="round" />
            {/* Minute hand */}
            <line x1={cx} y1={cy} {...hand(minAngle, 35)} stroke="#1e1b4b" strokeWidth={2} strokeLinecap="round" />
            {/* Second hand */}
            <line x1={cx} y1={cy} {...hand(secAngle, 38)} stroke="#ef4444" strokeWidth={1.5} strokeLinecap="round" />
            {/* Center dot */}
            <circle cx={cx} cy={cy} r={2.5} fill="#6366f1" />
        </svg>
    );
}

// Detail slide view for a city
function CityDetailView({ tz, now, onBack }: { tz: TimezoneInfo; now: Date; onBack: () => void }) {
    const td = getTimeData(tz.iana, now);
    const meta = getCountryMeta(tz.iana);
    const sun = getSunTimes(tz.iana, now);

    const isNight = td.ampm.toLowerCase() === 'pm' ? parseInt(td.displayHour) >= 8 : false;
    const isDark = td.hour < 6 || td.hour >= 20;

    return (
        <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 z-40 bg-white dark:bg-[#0F172A] overflow-y-auto"
            style={{ paddingBottom: '6rem' }}
        >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border">
                        <ChevronLeft size={18} className="text-slate-600 dark:text-slate-400" />
                    </button>
                    <div className="flex-1">
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">DETAILS</h2>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-7 h-7 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-sm">❤️</div>
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-sm">💙</div>
                    </div>
                </div>
            </div>

            <div className="px-4 pt-4 space-y-4">
                {/* TIME SECTION */}
                <div>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Time</p>
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-4 relative overflow-hidden shadow-xl">
                        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
                        <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full bg-black/10" />
                        <div className="relative">
                            <h3 className="text-white font-bold text-xl">{tz.city}</h3>
                            <p className="text-indigo-200 text-xs uppercase tracking-wider mb-4">{meta.countryName.toUpperCase()}</p>
                            <div className="flex items-center gap-4">
                                <AnalogClock hour={td.hour} minute={td.minute} second={td.second} />
                                <div className="flex-1">
                                    {/* Digital clock */}
                                    <div className="font-mono text-white text-4xl font-bold tracking-widest leading-none mb-1"
                                        style={{ fontFamily: 'monospace', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
                                        {td.displayHour}:{td.displayMin}
                                    </div>
                                    <p className="text-indigo-200 text-xs">{td.weekday}, {td.day} {td.month}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">{td.offsetStr}</span>
                                        {td.currentlyDST && (
                                            <span className="text-[10px] bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded-full font-bold">☀️ DST</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sunrise/Sunset */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Sunrise size={14} className="text-amber-500" />
                            <p className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase">Sunrise Time</p>
                        </div>
                        <p className="text-slate-900 dark:text-white font-bold text-lg">{sun.sunrise}</p>
                    </div>
                    <div className="rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Sun size={14} className="text-orange-500" />
                            <p className="text-orange-600 dark:text-orange-400 text-[10px] font-bold uppercase">Sunset Time</p>
                        </div>
                        <p className="text-slate-900 dark:text-white font-bold text-lg">{sun.sunset}</p>
                    </div>
                </div>

                {/* ECONOMIC INFO */}
                <div>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Economic Info</p>
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
                            <p className="text-white font-bold text-base">{meta.currencyName}</p>
                        </div>
                    </div>
                </div>

                {/* GEOGRAPHY */}
                <div>
                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-2">Geography</p>
                    <div className="rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 p-4 flex items-center gap-4 shadow-lg">
                        <div className="flex-shrink-0">
                            <div className="w-16 h-16 rounded-xl bg-white/20 flex flex-col items-center justify-center gap-1">
                                <span className="text-3xl">{meta.flag}</span>
                                <MapPin size={10} className="text-indigo-200" />
                            </div>
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-indigo-200 text-xs">Country Code :</span>
                                <span className="text-white font-bold">{meta.countryCode}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-indigo-200 text-xs">Region :</span>
                                <span className="text-white font-bold">{meta.region}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-indigo-200 text-xs">Phone code :</span>
                                <span className="text-white font-bold">{meta.phoneCode}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Timezone IANA */}
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Timezone Info</p>
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">IANA Name</span>
                            <span className="text-slate-900 dark:text-white font-mono text-xs">{tz.iana}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">UTC Offset</span>
                            <span className="text-slate-900 dark:text-white font-medium">{td.offsetStr}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">DST</span>
                            <span className={`font-medium ${td.isDST ? 'text-amber-500' : 'text-slate-500'}`}>
                                {td.isDST ? (td.currentlyDST ? 'Active' : 'Observing') : 'Not observed'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export default function WorldClock() {
    useEffect(() => { AnalyticsService.trackScreen('World_Clock'); }, []);
    const navigate = useNavigate();
    const [now, setNow] = useState(new Date());
    const [selected, setSelected] = useState<string[]>(['asia/kolkata', 'europe/london', 'america/new_york', 'asia/dubai']);
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [detailZone, setDetailZone] = useState<TimezoneInfo | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const activeZones = useMemo(() => {
        return selected.map(id => TIMEZONE_LIST.find(t => t.id === id)).filter(Boolean) as TimezoneInfo[];
    }, [selected]);

    const availableZones = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const filtered = TIMEZONE_LIST.filter(t =>
            !selected.includes(t.id) &&
            (query === '' ||
                t.city.toLowerCase().includes(query) ||
                t.country.toLowerCase().includes(query) ||
                t.iana.toLowerCase().includes(query))
        );
        if (!query) {
            // Show popular first when no search
            const popular = filtered.filter(t => POPULAR_ZONES.includes(t.iana));
            const rest = filtered.filter(t => !POPULAR_ZONES.includes(t.iana));
            return [...popular, ...rest];
        }
        return filtered;
    }, [selected, searchQuery]);

    const addZone = (id: string) => {
        setSelected(prev => [...prev, id]);
        setShowAddPanel(false);
        setSearchQuery('');
    };

    const removeZone = (id: string) => {
        setSelected(prev => prev.filter(p => p !== id));
    };

    return (
        <div ref={containerRef} className="min-h-dvh bg-slate-50 dark:bg-[#0F172A] animate-fade-in relative overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border">
                            <ArrowLeft size={18} className="text-slate-600 dark:text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">World Clock</h1>
                            <p className="text-slate-500 text-xs">Tap any city for details</p>
                        </div>
                    </div>
                    <button onClick={() => setShowAddPanel(true)}
                        className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30">
                        <Plus size={18} className="text-indigo-600 dark:text-indigo-400" />
                    </button>
                </div>
            </div>

            <DisclaimerBanner type="calculator" />

            {/* Clock Cards */}
            <div className="px-4 pt-3 pb-28 space-y-3">
                {activeZones.map((tz, i) => {
                    const td = getTimeData(tz.iana, now);
                    const meta = getCountryMeta(tz.iana);
                    const isDark = td.hour < 6 || td.hour >= 20;
                    return (
                        <motion.div key={tz.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="relative rounded-2xl overflow-hidden shadow-md cursor-pointer active:scale-[0.98] transition-transform"
                            onClick={() => setDetailZone(tz)}
                        >
                            {/* Gradient background */}
                            <div className={`absolute inset-0 ${isDark
                                ? 'bg-gradient-to-r from-indigo-900 to-violet-900'
                                : 'bg-gradient-to-r from-indigo-500 to-violet-600'}`} />
                            {/* Decorative circles */}
                            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/5" />
                            <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-black/10" />

                            <div className="relative p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <span className="text-3xl">{meta.flag}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-bold text-base">{tz.city}</h3>
                                            {td.currentlyDST && (
                                                <span className="text-[9px] bg-amber-400/30 text-amber-200 px-1.5 py-0.5 rounded-full font-bold">DST</span>
                                            )}
                                        </div>
                                        <p className="text-indigo-200 text-[11px]">{meta.countryName} · {td.offsetStr}</p>
                                        <p className="text-indigo-300 text-[10px]">{td.weekday}, {td.day} {td.month}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    <div className="font-mono text-white font-bold tracking-widest" style={{ fontSize: '1.5rem', textShadow: '0 0 20px rgba(255,255,255,0.4)' }}>
                                        {td.displayHour}:{td.displayMin}
                                    </div>
                                    <span className="text-indigo-200 text-xs uppercase">{td.ampm}</span>
                                    {selected.length > 1 && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeZone(tz.id); }}
                                            className="mt-1 p-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                                        >
                                            <X size={12} className="text-white/60" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {activeZones.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-4xl mb-3">🌍</p>
                        <p className="text-slate-500">No cities added. Tap + to add.</p>
                    </div>
                )}
            </div>

            {/* Add Zone Panel */}
            <AnimatePresence>
                {showAddPanel && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/50"
                        onClick={(e) => { if (e.target === e.currentTarget) { setShowAddPanel(false); setSearchQuery(''); } }}
                    >
                        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 26, stiffness: 200 }}
                            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1E293B] rounded-t-3xl p-6"
                            style={{ maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}
                        >
                            <div className="flex items-center justify-between mb-4 flex-shrink-0">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Time Zone</h3>
                                <button onClick={() => { setShowAddPanel(false); setSearchQuery(''); }}
                                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                                    <X size={18} className="text-slate-500" />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="mb-3 relative flex-shrink-0">
                                <Search size={16} className="absolute inset-y-0 my-auto left-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search city, country or timezone..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                    className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-11 pr-10 text-sm text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-colors"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 my-auto right-4 text-slate-400">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {!searchQuery && (
                                <p className="text-[10px] text-indigo-500 font-bold uppercase mb-2 flex-shrink-0">Popular Cities</p>
                            )}

                            {/* Zone list */}
                            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                                {availableZones.slice(0, 100).map(tz => {
                                    const meta = getCountryMeta(tz.iana);
                                    return (
                                        <button key={tz.id} onClick={() => addZone(tz.id)}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-indigo-400 transition-colors text-left">
                                            <span className="text-2xl flex-shrink-0">{meta.flag}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-slate-900 dark:text-white font-semibold text-sm truncate">{tz.city}</p>
                                                <p className="text-slate-400 text-xs truncate">{meta.countryName} · {tz.iana}</p>
                                            </div>
                                            <div className="flex-shrink-0">
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
                                                    <Plus size={14} className="text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                                {availableZones.length === 0 && (
                                    <p className="text-center text-slate-500 text-sm py-8">All matching time zones already added!</p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detail View Overlay */}
            <AnimatePresence>
                {detailZone && (
                    <CityDetailView tz={detailZone} now={now} onBack={() => setDetailZone(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
