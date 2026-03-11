import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Plus, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import DisclaimerBanner from '../components/DisclaimerBanner';

interface TimezoneInfo {
    id: string;
    city: string;
    country: string;
    iana: string;
    offset: string;
}

const TIMEZONE_LIST: TimezoneInfo[] = [
    { id: 'ist', city: 'Mumbai', country: 'India', iana: 'Asia/Kolkata', offset: 'IST (UTC+5:30)' },
    { id: 'gmt', city: 'London', country: 'UK', iana: 'Europe/London', offset: 'GMT/BST' },
    { id: 'utc', city: 'UTC', country: 'Coordinated', iana: 'UTC', offset: 'UTC (UTC+0)' },
    { id: 'est', city: 'New York', country: 'USA', iana: 'America/New_York', offset: 'EST/EDT' },
    { id: 'pst', city: 'Los Angeles', country: 'USA', iana: 'America/Los_Angeles', offset: 'PST/PDT' },
    { id: 'cst', city: 'Chicago', country: 'USA', iana: 'America/Chicago', offset: 'CST/CDT' },
    { id: 'gst', city: 'Dubai', country: 'UAE', iana: 'Asia/Dubai', offset: 'GST (UTC+4)' },
    { id: 'jst', city: 'Tokyo', country: 'Japan', iana: 'Asia/Tokyo', offset: 'JST (UTC+9)' },
    { id: 'aest', city: 'Sydney', country: 'Australia', iana: 'Australia/Sydney', offset: 'AEST/AEDT' },
    { id: 'sgt', city: 'Singapore', country: 'Singapore', iana: 'Asia/Singapore', offset: 'SGT (UTC+8)' },
    { id: 'cet', city: 'Berlin', country: 'Germany', iana: 'Europe/Berlin', offset: 'CET/CEST' },
    { id: 'hkt', city: 'Hong Kong', country: 'China', iana: 'Asia/Hong_Kong', offset: 'HKT (UTC+8)' },
];

function getTimeInZone(iana: string, now: Date) {
    try {
        const options: Intl.DateTimeFormatOptions = {
            timeZone: iana, hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: true, weekday: 'short', day: 'numeric', month: 'short',
        };
        const formatted = new Intl.DateTimeFormat('en-US', options).format(now);
        const offsetStr = new Intl.DateTimeFormat('en-US', {
            timeZone: iana, timeZoneName: 'shortOffset',
        }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value || '';

        // Check DST
        const jan = new Date(now.getFullYear(), 0, 1);
        const jul = new Date(now.getFullYear(), 6, 1);
        const janOff = new Date(jan.toLocaleString('en-US', { timeZone: iana })).getTimezoneOffset();
        const julOff = new Date(jul.toLocaleString('en-US', { timeZone: iana })).getTimezoneOffset();
        const isDST = janOff !== julOff;
        const currentlyDST = isDST && (new Date(now.toLocaleString('en-US', { timeZone: iana })).getTimezoneOffset() === Math.min(janOff, julOff));

        return { formatted, offsetStr, isDST, currentlyDST };
    } catch {
        return { formatted: '--:--:--', offsetStr: '', isDST: false, currentlyDST: false };
    }
}

export default function WorldClock() {
    useEffect(() => { AnalyticsService.trackScreen('World_Clock'); }, []);
    const navigate = useNavigate();
    const [now, setNow] = useState(new Date());
    const [selected, setSelected] = useState<string[]>(['ist', 'gmt', 'est', 'gst']);
    const [showAddPanel, setShowAddPanel] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    const activeZones = useMemo(() => {
        return selected.map(id => TIMEZONE_LIST.find(t => t.id === id)!).filter(Boolean);
    }, [selected]);

    const availableZones = useMemo(() => {
        return TIMEZONE_LIST.filter(t => !selected.includes(t.id));
    }, [selected]);

    const addZone = (id: string) => {
        setSelected(prev => [...prev, id]);
        setShowAddPanel(false);
    };

    const removeZone = (id: string) => {
        setSelected(prev => prev.filter(p => p !== id));
    };

    // Compute IST offset for comparison
    const istOffset = useMemo(() => {
        try {
            const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            return ist;
        } catch { return now; }
    }, [now]);

    return (
        <div className="min-h-dvh bg-white dark:bg-[#0F172A] animate-fade-in">
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border">
                            <ArrowLeft size={18} className="text-slate-600 dark:text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-white">World Clock</h1>
                            <p className="text-slate-500 text-xs">Compare time across cities</p>
                        </div>
                    </div>
                    <button onClick={() => setShowAddPanel(true)}
                        className="p-2 rounded-xl bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/30">
                        <Plus size={18} className="text-violet-600 dark:text-violet-400" />
                    </button>
                </div>
            </div>

            <DisclaimerBanner type="calculator" />

            <div className="px-4 pb-28">
                {/* Time Cards */}
                <div className="space-y-3">
                    {activeZones.map((tz, i) => {
                        const timeInfo = getTimeInZone(tz.iana, now);
                        return (
                            <motion.div key={tz.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border shadow-sm dark:shadow-none">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Globe size={14} className="text-violet-500" />
                                            <span className="text-slate-900 dark:text-white font-bold text-sm">{tz.city}</span>
                                            <span className="text-slate-400 text-xs">({tz.country})</span>
                                        </div>
                                        <p className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
                                            {timeInfo.formatted}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-500 font-medium">{timeInfo.offsetStr}</span>
                                            {timeInfo.isDST && (
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${timeInfo.currentlyDST
                                                    ? 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                    }`}>
                                                    {timeInfo.currentlyDST ? '☀️ DST Active' : 'DST Observing'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {selected.length > 1 && (
                                        <button onClick={() => removeZone(tz.id)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                                            <X size={14} className="text-slate-400" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Add Zone Panel */}
                <AnimatePresence>
                    {showAddPanel && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/50">
                            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                                className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#1E293B] rounded-t-3xl p-6 max-h-[60vh] overflow-y-auto">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Time Zone</h3>
                                    <button onClick={() => setShowAddPanel(false)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                                        <X size={18} className="text-slate-500" />
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {availableZones.map(tz => (
                                        <button key={tz.id} onClick={() => addZone(tz.id)}
                                            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            <div>
                                                <p className="text-slate-800 dark:text-white font-semibold text-sm">{tz.city} ({tz.country})</p>
                                                <p className="text-slate-500 text-xs">{tz.offset}</p>
                                            </div>
                                            <Plus size={16} className="text-violet-500" />
                                        </button>
                                    ))}
                                    {availableZones.length === 0 && (
                                        <p className="text-center text-slate-500 text-sm py-8">All time zones added!</p>
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
