import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, Calculator, Zap, Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { schemes } from '../data/schemes';

type Tab = 'schemes' | 'calculators' | 'features';

const calcList = [
    'Income Tax', 'Salary Hike', 'HRA', 'Loan EMI', 'Fixed Deposit', 'Recurring Deposit', 'Compound Interest',
    'Simple Interest', 'SIP', 'Lumpsum', 'SWP', 'CAGR', 'Step Up SIP', 'Goal SIP', 'PPF', 'NPS', 'EPF',
    'Gratuity', 'Sukanya Samriddhi', 'NSC', 'KVP', 'Post Office MIS', 'Senior Citizen Savings', 'Post Office TD', 'Break Even'
];

const features = [
    { id: 'pdfExport', name: 'PDF Export', description: 'Export calculations as PDF', enabled: true, tier: 'Premium' },
    { id: 'excelExport', name: 'Excel Export', description: 'Export calculations as Excel', enabled: true, tier: 'Premium' },
    { id: 'stateSchemes', name: 'State Government Schemes', description: 'Access to 400+ state schemes', enabled: true, tier: 'Premium' },
    { id: 'metalPrices', name: 'Live Metal Prices', description: 'Gold, Silver, Platinum prices', enabled: true, tier: 'Free' },
    { id: 'calcHistory', name: 'Calculation History', description: 'Track calculation history', enabled: true, tier: 'Free' },
    { id: 'savedCalcs', name: 'Saved Calculations', description: 'Save and revisit calculations', enabled: true, tier: 'Free' },
    { id: 'centralSchemes', name: 'Central Government Schemes', description: 'Access to central schemes', enabled: true, tier: 'Free' },
    { id: 'darkMode', name: 'Dark Mode', description: 'Toggle dark/light theme', enabled: true, tier: 'Free' },
];

export default function AdminPanel() {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const [tab, setTab] = useState<Tab>('schemes');
    const [search, setSearch] = useState('');

    if (user?.role !== 'admin') {
        navigate('/', { replace: true });
        return null;
    }

    const filteredSchemes = schemes.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase()) ||
        (s.state || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-dvh bg-[#0F172A] animate-fade-in">
            <div className="px-4 pt-14 pb-28">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            <ShieldCheck size={20} className="text-amber-500" /> Admin Panel
                        </h1>
                        <p className="text-slate-500 text-xs">Manage schemes, calculators & features</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex rounded-2xl bg-dark-card border border-dark-border p-1 mb-5">
                    {([
                        { key: 'schemes' as Tab, label: 'Schemes', icon: FileText },
                        { key: 'calculators' as Tab, label: 'Calculators', icon: Calculator },
                        { key: 'features' as Tab, label: 'Features', icon: Zap },
                    ]).map(({ key, label, icon: Icon }) => (
                        <button key={key} onClick={() => { setTab(key); setSearch(''); }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5
                            ${tab === key ? 'bg-brand-green text-white' : 'text-slate-500'}`}>
                            <Icon size={14} /> {label}
                        </button>
                    ))}
                </div>

                {/* === SCHEMES TAB === */}
                {tab === 'schemes' && (
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input type="text" placeholder="Search schemes..." value={search} onChange={e => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-dark-card border border-dark-border text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-green/50" />
                            </div>
                            <button className="p-2.5 rounded-xl bg-brand-green text-white shrink-0" onClick={() => alert('Add Scheme form coming soon')}>
                                <Plus size={18} />
                            </button>
                        </div>

                        <p className="text-slate-500 text-xs mb-3">{filteredSchemes.length} schemes found</p>

                        <div className="space-y-2">
                            {filteredSchemes.map((scheme) => (
                                <div key={scheme.id} className="flex items-center gap-3 p-3 rounded-xl bg-dark-card border border-dark-border">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-white text-sm font-medium truncate">{scheme.name}</h3>
                                        <div className="flex gap-1.5 mt-1">
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${scheme.governmentLevel === 'central' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'}`}>
                                                {scheme.governmentLevel === 'central' ? 'Central' : scheme.state}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-700 text-slate-400">{scheme.category}</span>
                                        </div>
                                    </div>
                                    <button className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-blue-400 transition-colors" onClick={() => alert(`Edit: ${scheme.name}`)}>
                                        <Pencil size={14} />
                                    </button>
                                    <button className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors" onClick={() => alert(`Delete: ${scheme.name}`)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* === CALCULATORS TAB === */}
                {tab === 'calculators' && (
                    <div className="space-y-2">
                        <p className="text-slate-500 text-xs mb-3">{calcList.length} calculators</p>
                        {calcList.map((name, i) => (
                            <div key={name} className="flex items-center gap-3 p-3 rounded-xl bg-dark-card border border-dark-border">
                                <span className="w-7 h-7 rounded-lg bg-brand-green/10 text-brand-green text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                <span className="text-white text-sm font-medium flex-1">{name} Calculator</span>
                                <span className="px-2 py-0.5 rounded-lg bg-green-500/15 text-green-400 text-[10px] font-medium">Active</span>
                                <button className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-blue-400 transition-colors" onClick={() => alert(`Edit: ${name}`)}>
                                    <Pencil size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* === FEATURES TAB === */}
                {tab === 'features' && (
                    <div className="space-y-2">
                        <p className="text-slate-500 text-xs mb-3">{features.length} features</p>
                        {features.map((f) => (
                            <div key={f.id} className="flex items-center gap-3 p-4 rounded-xl bg-dark-card border border-dark-border">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white text-sm font-medium">{f.name}</h3>
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${f.tier === 'Premium' ? 'bg-amber-500/15 text-amber-400' : 'bg-green-500/15 text-green-400'}`}>{f.tier}</span>
                                    </div>
                                    <p className="text-slate-500 text-xs mt-0.5">{f.description}</p>
                                </div>
                                <div className="text-brand-green">
                                    {f.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} className="text-slate-600" />}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
