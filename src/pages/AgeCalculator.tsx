import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Star, Clock, Cake, Info, Activity, Wind, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { AnalyticsService } from '../lib/analytics';


import { triggerCalcNotification } from '../services/calcNotifications';


function getGeneration(year: number) {
    if (year >= 2013) return { name: 'Gen Alpha', emoji: '👶', color: 'text-pink-500' };
    if (year >= 1997) return { name: 'Gen Z', emoji: '📱', color: 'text-blue-500' };
    if (year >= 1981) return { name: 'Millennial', emoji: '🌐', color: 'text-violet-500' };
    if (year >= 1965) return { name: 'Gen X', emoji: '📻', color: 'text-amber-500' };
    if (year >= 1946) return { name: 'Baby Boomer', emoji: '📺', color: 'text-emerald-500' };
    return { name: 'Silent Generation', emoji: '📖', color: 'text-muted-foreground' };
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
    const navigate = useNavigate();
    const [birthDate, setBirthDate] = useState('');
    const today = new Date();

    const result = useMemo(() => {
        if (!birthDate) return null;
        const bd = new Date(birthDate);
        if (isNaN(bd.getTime()) || bd > today) return null;

        const age = calculateAge(bd, today);
        const gen = getGeneration(bd.getFullYear());
        const nextBday = getNextBirthday(bd, today);
        const dayOfWeek = bd.toLocaleDateString('en-US', { weekday: 'long' });

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
                        <h1 className="text-lg font-bold text-slate-900 dark:text-foreground">Age Calculator</h1>
                        <p className="text-muted-foreground text-xs">Know your exact age & generation</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-28">
                {/* Date Input */}
                <div className="p-4 rounded-2xl bg-white dark:bg-card border border-slate-200 dark:border-border mb-4 shadow-sm dark:shadow-none">
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Date of Birth</label>
                    <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                        max={today.toISOString().slice(0, 10)}
                        className="w-full py-3 px-4 rounded-xl bg-slate-50 dark:bg-card border-border border border-border text-slate-900 dark:text-foreground text-lg font-semibold" />
                </div>

                {result && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        {/* Primary Age */}
                        <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-center shadow-lg">
                            <p className="text-violet-200 text-xs mb-1">Your Age</p>
                            <p className="text-4xl font-bold">{result.age.years} <span className="text-xl font-medium text-violet-200">years</span></p>
                            <p className="text-violet-200 text-sm mt-1">{result.age.months} months & {result.age.days} days</p>
                        </div>

                        {/* Detailed Breakdown */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Total Days', value: result.age.totalDays.toLocaleString(), icon: <Calendar size={16} />, color: 'text-blue-500' },
                                { label: 'Total Weeks', value: result.age.totalWeeks.toLocaleString(), icon: <Clock size={16} />, color: 'text-emerald-500' },
                                { label: 'Total Hours', value: result.age.totalHours.toLocaleString(), icon: <Star size={16} />, color: 'text-amber-500' },
                                { label: 'Born On', value: result.dayOfWeek, icon: <Info size={16} />, color: 'text-violet-500' },
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
                                <p className={`text-lg font-bold mt-1 ${result.gen.color}`}>{result.gen.name}</p>
                                <p className="text-muted-foreground text-[10px] uppercase font-bold">Generation</p>
                            </div>
                        </div>

                        {/* Fun Facts */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-center">
                                <div className="text-rose-500 mb-1 flex justify-center"><Activity size={20} /></div>
                                <p className="text-lg font-bold text-slate-800 dark:text-foreground">{result.metrics.heartbeats.toLocaleString()}</p>
                                <p className="text-rose-600 dark:text-rose-400 text-[10px] uppercase font-bold mt-1">Total Heartbeats</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 text-center">
                                <div className="text-sky-500 mb-1 flex justify-center"><Wind size={20} /></div>
                                <p className="text-lg font-bold text-slate-800 dark:text-foreground">{result.metrics.breaths.toLocaleString()}</p>
                                <p className="text-sky-600 dark:text-sky-400 text-[10px] uppercase font-bold mt-1">Total Breaths</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-center col-span-2">
                                <div className="text-indigo-500 mb-1 flex justify-center"><Moon size={20} /></div>
                                <p className="text-lg font-bold text-slate-800 dark:text-foreground">{result.metrics.sleepYears.toFixed(1)} <span className="text-sm font-medium">years</span></p>
                                <p className="text-indigo-600 dark:text-indigo-400 text-[10px] uppercase font-bold mt-1">Time Spent Sleeping</p>
                            </div>
                        </div>

                        {/* Next Birthday */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-500/10 dark:to-rose-500/10 border border-pink-200 dark:border-pink-500/30 text-center">
                            <Cake size={24} className="text-pink-500 mx-auto mb-2" />
                            <p className="text-pink-700 dark:text-pink-300 text-sm font-bold">
                                Next birthday in <span className="text-pink-600 dark:text-pink-400 text-xl">{result.nextBday.daysLeft}</span> days
                            </p>
                            <p className="text-pink-500 text-xs mt-1">
                                {result.nextBday.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className="text-pink-500 text-xs mt-0.5">You'll turn {result.age.years + 1}!</p>
                        </div>
                    </motion.div>
                )}

                
                
            </div>
        </div>
    );
}
