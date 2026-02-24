import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, Trash2, PieChart, Target, TrendingUp, Wallet,
    ChevronRight, Calendar, ArrowUpCircle, ArrowDownCircle,
    LayoutDashboard, FileBarChart, PiggyBank, Briefcase, FileText, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useBudgetTrackerStore, type BudgetCategory } from '../store/useBudgetTrackerStore';
import { useAuthStore } from '../store/useAuthStore';
import { formatINR } from '../utils/calculations';

const CATEGORY_EMOJIS = ['🍽️', '🛒', '🚗', '🏠', '💊', '📚', '🎮', '👗', '💆', '🎁', '📱', '✈️', '☕', '🏋️', '🐾'];

export default function BudgetTracker() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = useAuthStore(s => s.user);
    const {
        monthlyIncome, setMonthlyIncome,
        currentBalance, setCurrentBalance,
        totalBalance, setTotalBalance,
        entries, categories
    } = useBudgetTrackerStore();

    const [activeTab, setActiveTab] = useState<'month' | 'year'>('month');

    // Calculate totals for current month
    const now = new Date();
    const month = now.getMonth(), year = now.getFullYear();
    const monthEntries = entries.filter(e => {
        const d = new Date(e.date);
        return d.getMonth() === month && d.getFullYear() === year;
    });
    const totalSpent = monthEntries.reduce((s, e) => s + e.amount, 0);

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in relative overflow-x-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />

            {/* Header section - matching screenshot */}
            <div className="bg-gradient-to-b from-brand-purple/20 to-transparent px-4 pt-14 pb-12">
                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-lg font-bold text-white lowercase">{user?.name || 'krithikah'}</h1>
                    <div className="w-10 h-10" /> {/* spacer */}
                </div>

                <div className="flex justify-between items-end mb-8">
                    <div>
                        <p className="text-white/60 text-xs font-medium mb-1">Current Balance</p>
                        <p className="text-3xl font-bold text-white">₹{currentBalance.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-white/60 text-xs font-medium mb-1">Total Balance</p>
                        <p className="text-lg font-bold text-white/90">₹{totalBalance.toLocaleString('en-IN')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Income</p>
                            <p className="text-white font-bold">₹{monthlyIncome.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                            <ArrowDownCircle size={20} />
                        </div>
                        <div>
                            <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider">Expenses</p>
                            <p className="text-white font-bold">₹{totalSpent.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content section */}
            <div className="px-4 -mt-6 relative z-10 pb-28">
                <p className="text-white/40 text-[10px] text-center mb-6">
                    Share your reports via Whatsapp / Email for more analysis.
                </p>

                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-white font-bold text-lg">Insights & Reports</h2>
                    <button className="text-white/40"><MoreVertical size={20} /></button>
                </div>

                {/* Month/Year selector */}
                <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-6">
                    <button onClick={() => setActiveTab('month')}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'month' ? 'bg-white text-black' : 'text-slate-400'}`}>
                        Month
                    </button>
                    <button onClick={() => setActiveTab('year')}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'year' ? 'bg-white text-black' : 'text-slate-400'}`}>
                        Year
                    </button>
                    <button className="px-3 bg-white/5 text-white/60 rounded-lg"><Calendar size={14} /></button>
                </div>

                {/* Dashboard Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <DashboardCard
                        title="Monthly Summary"
                        subtitle="Income, Expense, Budget, Cards"
                        icon={LayoutDashboard}
                        color="text-indigo-400"
                        bg="bg-indigo-500/5 border-indigo-500/10"
                        img="https://cdn-icons-png.flaticon.com/512/2620/2620608.png"
                    />
                    <DashboardCard
                        title="Expense Summary"
                        subtitle="Rent, Groceries, EMI & Bills, Cash"
                        icon={FileBarChart}
                        color="text-purple-400"
                        bg="bg-purple-500/5 border-purple-500/10"
                        img="https://cdn-icons-png.flaticon.com/512/3135/3135706.png"
                        tall
                    />
                    <DashboardCard
                        title="Income Summary"
                        subtitle="Salary, Freelance, Others"
                        icon={ArrowUpCircle}
                        color="text-blue-400"
                        bg="bg-blue-500/5 border-blue-500/10"
                        img="https://cdn-icons-png.flaticon.com/512/1041/1041916.png"
                    />
                    <DashboardCard
                        title="Savings Summary"
                        subtitle="Income, Expense, Saving"
                        icon={PiggyBank}
                        color="text-green-400"
                        bg="bg-green-500/5 border-green-500/10"
                        img="https://cdn-icons-png.flaticon.com/512/2454/2454269.png"
                        tall
                        offsetUp
                    />
                    <DashboardCard
                        title="Financial review"
                        subtitle="Upload an Excel file to generate a customized financial summary."
                        icon={Briefcase}
                        color="text-brand-blue"
                        bg="bg-brand-blue/5 border-brand-blue/10"
                    />
                    <DashboardCard
                        title="Financial Goal"
                        icon={Target}
                        color="text-indigo-400"
                        bg="bg-indigo-500/5 border-indigo-500/10"
                        offsetUp
                    />
                </div>
            </div>

            {/* Quick Actions / Floating Action */}
            <div className="fixed bottom-24 right-4 z-20">
                <button className="w-14 h-14 rounded-full bg-brand-purple text-white shadow-xl shadow-brand-purple/40 flex items-center justify-center">
                    <Plus size={28} />
                </button>
            </div>
        </div>
    );
}

interface CardProps {
    title: string;
    subtitle?: string;
    icon: any;
    color: string;
    bg: string;
    img?: string;
    tall?: boolean;
    offsetUp?: boolean;
}

function DashboardCard({ title, subtitle, icon: Icon, color, bg, img, tall, offsetUp }: CardProps) {
    return (
        <motion.div
            whileTap={{ scale: 0.98 }}
            className={`relative p-4 rounded-2xl border ${bg} ${tall ? 'min-h-[200px]' : 'min-h-[140px]'} ${offsetUp ? '-mt-16' : ''} flex flex-col justify-between overflow-hidden`}
        >
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-white text-sm font-bold leading-tight max-w-[80%]">{title}</h3>
                    <Icon size={18} className={color} />
                </div>
                {subtitle && <p className="text-slate-500 text-[9px] leading-tight font-medium pr-4">{subtitle}</p>}
            </div>

            {img && (
                <img src={img} alt="" className="absolute bottom-2 right-2 w-16 h-16 opacity-30 object-contain grayscale" />
            )}

            <div className="relative z-10 flex justify-end">
                <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                    <ChevronRight size={14} className="text-slate-500" />
                </div>
            </div>
        </motion.div>
    );
}
