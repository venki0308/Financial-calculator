import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, Star, Clock, Cake, Info, Activity, Wind, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';
import DateInput from '../components/DateInput';
import { useTrackCalculator } from '../hooks/useTrackCalculator';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { parseLocalDate } from '../utils/dateUtils';


function getGeneration(year: number) {
    if (year >= 2013) return { nameKey: 'age.genAlpha', emoji: '👶', color: 'text-pink-500' };
    if (year >= 1997) return { nameKey: 'age.genZ', emoji: '📱', color: 'text-blue-500' };
    if (year >= 1981) return { nameKey: 'age.millennial', emoji: '🌐', color: 'text-violet-500' };
    if (year >= 1965) return { nameKey: 'age.genX', emoji: '📻', color: 'text-amber-500' };
    if (year >= 1946) return { nameKey: 'age.babyBoomer', emoji: '📺', color: 'text-emerald-500' };
    return { nameKey: 'age.silentGeneration', emoji: '📖', color: 'text-muted-foreground' };
}

function calculateAge(birthDate: Date, today: Date) {
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
        months--;
        const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += prevMonth.getDate();
    }
    if (months < 0) {
        years--;
        months += 12;
    }

    const diffMs = today.getTime() - birthDate.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));

    return { years, months, days, totalDays, totalWeeks, totalHours };
}

function getNextBirthday(birthDate: Date, today: Date) {
    let nextBday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (nextBday <= today) nextBday.setFullYear(today.getFullYear() + 1);
    const diffMs = nextBday.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return { date: nextBday, daysLeft };
}

export default function AgeCalculator() {
    useEffect(() => { AnalyticsService.trackScreen('Age_Calculator'); }, []);
    useTrackCalculator();
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [birthDate, setBirthDate] = useState('');
    const today = new Date();

    // Three modes on one page: classic DOB→age, reverse (age→birth year),
    // and a plain year-to-year gap ("1990 to 2026").
    const [mode, setMode] = useState<'dob' | 'fromAge' | 'years'>('dob');

    // From Age mode
    const [ageYearsIn, setAgeYearsIn] = useState('');
    const [ageMonthsIn, setAgeMonthsIn] = useState('');

    // Year → Year mode
    const [fromYear, setFromYear] = useState('1990');
    const [toYear, setToYear] = useState(String(today.getFullYear()));

    // Reverse: given "I am Y years (and optionally M months) old today",
    // find the birth date / birth-year window.
    const fromAgeResult = useMemo(() => {
        const y = parseInt(ageYearsIn, 10);
        if (!Number.isFinite(y) || y < 0 || y > 125) return null;
        const m = parseInt(ageMonthsIn, 10);
        const hasMonths = Number.isFinite(m) && m >= 0 && m <= 11;

        if (hasMonths) {
            // Exact-ish DOB: today − Y years − M months.
            const exact = new Date(today.getFullYear() - y, today.getMonth() - m, today.getDate());
            return {
                kind: 'exact' as const,
                exact,
                year: exact.getFullYear(),
                gen: getGeneration(exact.getFullYear()),
            };
        }
        // Window: everyone aged Y today was born between
        // (today − (Y+1) years + 1 day) and (today − Y years).
        const latest = new Date(today.getFullYear() - y, today.getMonth(), today.getDate());
        const earliest = new Date(today.getFullYear() - y - 1, today.getMonth(), today.getDate() + 1);
        return {
            kind: 'window' as const,
            earliest,
            latest,
            years: earliest.getFullYear() === latest.getFullYear()
                ? String(latest.getFullYear())
                : `${earliest.getFullYear()} / ${latest.getFullYear()}`,
            gen: getGeneration(latest.getFullYear()),
        };
    }, [ageYearsIn, ageMonthsIn]);

    // Year → Year gap, order-agnostic (2026→1990 works too).
    const yearsResult = useMemo(() => {
        const a = parseInt(fromYear, 10);
        const b = parseInt(toYear, 10);
        if (!Number.isFinite(a) || !Number.isFinite(b) || a < 1000 || b < 1000 || a > 3000 || b > 3000) return null;
        const lo = Math.min(a, b), hi = Math.max(a, b);
        const diff = hi - lo;
        return {
            lo, hi, diff,
            months: diff * 12,
            weeks: Math.round(diff * 365.25 / 7),
            days: Math.round(diff * 365.25),
            gen: getGeneration(lo),
        };
    }, [fromYear, toYear]);

    const result = useMemo(() => {
        if (!birthDate) return null;
        // Parse YYYY-MM-DD as local time — new Date('YYYY-MM-DD') parses as UTC and can shift the day
        const bd = /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? parseLocalDate(birthDate) : new Date(birthDate);
        if (isNaN(bd.getTime()) || bd > today) return null;

        const age = calculateAge(bd, today);
        const gen = getGeneration(bd.getFullYear());
        const nextBday = getNextBirthday(bd, today);
        const dayOfWeek = bd.toLocaleDateString(i18n.language, { weekday: 'long' });

        const heartbeats = age.totalDays * 103680; // ~72 bpm
        const breaths = age.totalDays * 23040; // ~16 bpm
        const sleepYears = (age.totalDays * 8) / 24 / 365.25;
        const metrics = { heartbeats, breaths, sleepYears };

        return { age, gen, nextBday, dayOfWeek, metrics, birthYear: bd.getFullYear() };
    }, [birthDate]);

    return (
        <div className="min-h-dvh bg-white dark:bg-background animate-fade-in">
            <div className="sticky top-0 z-10 bg-white dark:bg-[#0F172A]  px-4 pt-14 pb-3 border-b border-slate-200 dark:border-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                        <ArrowLeft size={18} className="text-slate-600 dark:text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-foreground">{t('age.title')}</h1>
                        <p className="text-muted-foreground text-xs">{t('age.subtitle')}</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-28">
                {/* Mode tabs */}
                <div className="grid grid-cols-3 gap-2 mt-3 mb-4">
                    {([
                        { key: 'dob' as const, label: t('age.modeDob', 'Date of Birth') },
                        { key: 'fromAge' as const, label: t('age.modeFromAge', 'From Age') },
                        { key: 'years' as const, label: t('age.modeYears', 'Year → Year') },
                    ]).map(m => (
                        <button key={m.key} onClick={() => setMode(m.key)}
                            className={`py-2.5 rounded-xl text-xs font-bold border transition-colors ${mode === m.key
                                ? 'bg-violet-600 border-violet-600 text-white'
                                : 'bg-white dark:bg-card border-slate-200 dark:border-border text-muted-foreground'}`}>
                            {m.label}
                        </button>
                    ))}
                </div>

                {/* Date Input */}
                {mode === 'dob' && (
                <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border mb-4 shadow-sm dark:shadow-none">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('age.dateOfBirth')}</label>
                    <DateInput
                        value={birthDate}
                        onChange={setBirthDate}
                        max={today.toISOString().slice(0, 10)}
                        className="w-full py-3 px-4 rounded-xl bg-slate-50 dark:bg-card border-border border border-border text-slate-900 dark:text-foreground text-lg font-semibold" />
                </div>
                )}

                {/* From Age mode — reverse lookup */}
                {mode === 'fromAge' && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm dark:shadow-none">
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('age.enterYourAge', 'Enter your age')}</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <input type="number" inputMode="numeric" min={0} max={125} value={ageYearsIn}
                                        onChange={e => setAgeYearsIn(e.target.value)}
                                        placeholder="36"
                                        className="w-full py-3 px-4 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-lg font-semibold focus:outline-none" />
                                    <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">{t('age.years')}</p>
                                </div>
                                <div>
                                    <input type="number" inputMode="numeric" min={0} max={11} value={ageMonthsIn}
                                        onChange={e => setAgeMonthsIn(e.target.value)}
                                        placeholder={t('age.optional', 'optional')}
                                        className="w-full py-3 px-4 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-lg font-semibold focus:outline-none" />
                                    <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">{t('age.monthsOptional', 'Months (0-11)')}</p>
                                </div>
                            </div>
                        </div>

                        {fromAgeResult && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-center shadow-lg">
                                    <p className="text-violet-200 text-xs mb-1">{t('age.birthYear', 'Birth year')}</p>
                                    <p className="text-4xl font-bold">
                                        {fromAgeResult.kind === 'exact' ? fromAgeResult.year : fromAgeResult.years}
                                    </p>
                                    <p className="text-violet-200 text-sm mt-2 leading-relaxed">
                                        {fromAgeResult.kind === 'exact'
                                            ? t('age.bornAround', 'Born around {{date}}', { date: fromAgeResult.exact.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }) })
                                            : t('age.bornBetween', 'Born between {{from}} and {{to}}', {
                                                from: fromAgeResult.earliest.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }),
                                                to: fromAgeResult.latest.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }),
                                            })}
                                    </p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm dark:shadow-none text-center">
                                    <span className="text-3xl">{fromAgeResult.gen.emoji}</span>
                                    <p className={`text-lg font-bold mt-1 ${fromAgeResult.gen.color}`}>{t(fromAgeResult.gen.nameKey)}</p>
                                    <p className="text-muted-foreground text-[10px] uppercase font-bold">{t('age.generation')}</p>
                                </div>
                                {fromAgeResult.kind === 'window' && (
                                    <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                                        {t('age.addMonthsHint', 'Add the months for a more precise date — with only years, anyone this age today falls in this one-year window.')}
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </div>
                )}

                {/* Year → Year mode — "1990 to 2026" gap */}
                {mode === 'years' && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm dark:shadow-none">
                            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{t('age.yearRange', 'From year → to year')}</label>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" inputMode="numeric" min={1000} max={3000} value={fromYear}
                                    onChange={e => setFromYear(e.target.value)}
                                    placeholder="1990"
                                    className="w-full py-3 px-4 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-lg font-semibold text-center focus:outline-none" />
                                <input type="number" inputMode="numeric" min={1000} max={3000} value={toYear}
                                    onChange={e => setToYear(e.target.value)}
                                    placeholder="2026"
                                    className="w-full py-3 px-4 rounded-xl bg-slate-50 dark:bg-background border border-slate-200 dark:border-border text-slate-900 dark:text-foreground text-lg font-semibold text-center focus:outline-none" />
                            </div>
                        </div>

                        {yearsResult && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-center shadow-lg">
                                    <p className="text-violet-200 text-xs mb-1">{yearsResult.lo} → {yearsResult.hi}</p>
                                    <p className="text-4xl font-bold">{yearsResult.diff} <span className="text-xl font-medium text-violet-200">{t('age.years')}</span></p>
                                    <p className="text-violet-200 text-sm mt-1">
                                        {t('age.bornInTurns', 'Born in {{lo}}? You turn {{diff}} in {{hi}}.', { lo: yearsResult.lo, diff: yearsResult.diff, hi: yearsResult.hi })}
                                    </p>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: t('age.totalMonths', 'Months'), value: yearsResult.months.toLocaleString() },
                                        { label: t('age.totalWeeks'), value: yearsResult.weeks.toLocaleString() },
                                        { label: t('age.totalDays'), value: yearsResult.days.toLocaleString() },
                                    ].map(item => (
                                        <div key={item.label} className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm dark:shadow-none text-center">
                                            <p className="text-lg font-bold text-slate-800 dark:text-foreground">{item.value}</p>
                                            <p className="text-muted-foreground text-[10px] uppercase font-bold">{item.label}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm dark:shadow-none text-center">
                                    <span className="text-3xl">{yearsResult.gen.emoji}</span>
                                    <p className={`text-lg font-bold mt-1 ${yearsResult.gen.color}`}>{t(yearsResult.gen.nameKey)}</p>
                                    <p className="text-muted-foreground text-[10px] uppercase font-bold">{t('age.generationOfYear', '{{year}} generation', { year: yearsResult.lo })}</p>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                                    {t('age.yearGapNote', 'Whole-year gap, January to January. Months/weeks/days use the average year length (365.25 days).')}
                                </p>
                            </motion.div>
                        )}
                    </div>
                )}

                {mode === 'dob' && result && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* Primary Age */}
                        <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-center shadow-lg">
                            <p className="text-violet-200 text-xs mb-1">{t('age.yourAge')}</p>
                            <p className="text-4xl font-bold">{result.age.years} <span className="text-xl font-medium text-violet-200">{t('age.years')}</span></p>
                            <p className="text-violet-200 text-sm mt-1">{t('age.monthsAndDays', { months: result.age.months, days: result.age.days })}</p>
                        </div>

                        {/* Detailed Breakdown */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: t('age.totalDays'), value: result.age.totalDays.toLocaleString(), icon: <Calendar size={16} />, color: 'text-blue-500' },
                                { label: t('age.totalWeeks'), value: result.age.totalWeeks.toLocaleString(), icon: <Clock size={16} />, color: 'text-emerald-500' },
                                { label: t('age.totalHours'), value: result.age.totalHours.toLocaleString(), icon: <Star size={16} />, color: 'text-amber-500' },
                                { label: t('age.bornOn'), value: result.dayOfWeek, icon: <Info size={16} />, color: 'text-violet-500' },
                            ].map(item => (
                                <div key={item.label} className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm dark:shadow-none text-center">
                                    <div className={`mb-2 ${item.color}`}>{item.icon}</div>
                                    <p className="text-lg font-bold text-slate-800 dark:text-foreground">{item.value}</p>
                                    <p className="text-muted-foreground text-[10px] uppercase font-bold">{item.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Generation */}
                        <div className="grid grid-cols-1 gap-3">
                            <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border shadow-sm dark:shadow-none text-center">
                                <span className="text-3xl">{result.gen.emoji}</span>
                                <p className={`text-lg font-bold mt-1 ${result.gen.color}`}>{t(result.gen.nameKey)}</p>
                                <p className="text-muted-foreground text-[10px] uppercase font-bold">{t('age.generation')}</p>
                            </div>
                        </div>

                        {/* Fun Facts */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-center">
                                <div className="text-rose-500 mb-1 flex justify-center"><Activity size={20} /></div>
                                <p className="text-lg font-bold text-slate-800 dark:text-foreground">{result.metrics.heartbeats.toLocaleString()}</p>
                                <p className="text-rose-600 dark:text-rose-400 text-[10px] uppercase font-bold mt-1">{t('age.totalHeartbeats')}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 text-center">
                                <div className="text-sky-500 mb-1 flex justify-center"><Wind size={20} /></div>
                                <p className="text-lg font-bold text-slate-800 dark:text-foreground">{result.metrics.breaths.toLocaleString()}</p>
                                <p className="text-sky-600 dark:text-sky-400 text-[10px] uppercase font-bold mt-1">{t('age.totalBreaths')}</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-center col-span-2">
                                <div className="text-indigo-500 mb-1 flex justify-center"><Moon size={20} /></div>
                                <p className="text-lg font-bold text-slate-800 dark:text-foreground">{result.metrics.sleepYears.toFixed(1)} <span className="text-sm font-medium">{t('age.years')}</span></p>
                                <p className="text-indigo-600 dark:text-indigo-400 text-[10px] uppercase font-bold mt-1">{t('age.timeSpentSleeping')}</p>
                            </div>
                        </div>

                        {/* Next Birthday */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/10 border border-pink-200 dark:border-pink-500/30 text-center">
                            <Cake size={24} className="text-pink-500 mx-auto mb-2" />
                            <p className="text-pink-700 dark:text-pink-300 text-sm font-bold">
                                {t('age.nextBirthdayIn')} <span className="text-pink-600 dark:text-pink-400 text-xl">{result.nextBday.daysLeft}</span> {t('age.days')}
                            </p>
                            <p className="text-pink-500 text-xs mt-1">
                                {result.nextBday.date.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-pink-500 text-xs mt-0.5">{t('age.youllTurn', { age: result.age.years + 1 })}</p>
                        </div>
                    </motion.div>
                )}

                
                
            </div>

            <DisclaimerComponent module="time" />
        </div>
    );
}
