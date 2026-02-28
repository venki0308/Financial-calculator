import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, Calculator, Zap, Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight, X, Check, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useFeatureFlagStore } from '../store/useFeatureFlagStore';
import { schemes as schemeData, type Scheme } from '../data/schemes';

type Tab = 'schemes' | 'calculators' | 'features';

const calcList = [
    'Income Tax', 'Salary Hike', 'HRA', 'Loan EMI', 'Fixed Deposit', 'Recurring Deposit', 'Compound Interest',
    'Simple Interest', 'SIP', 'Lumpsum', 'SWP', 'CAGR', 'Step Up SIP', 'Goal SIP', 'PPF', 'NPS', 'EPF',
    'Gratuity', 'Sukanya Samriddhi', 'NSC', 'KVP', 'Post Office MIS', 'Senior Citizen Savings', 'Post Office TD', 'Break Even'
];

export default function AdminPanel() {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const [tab, setTab] = useState<Tab>('schemes');
    const [search, setSearch] = useState('');

    // Editable schemes state
    const [localSchemes, setLocalSchemes] = useState(schemeData);
    const [editingSchemeId, setEditingSchemeId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editCategory, setEditCategory] = useState('');

    // Features & Calculator states from persistent store
    const { features, calculatorStates, toggleFeature, toggleCalculator } = useFeatureFlagStore();
    const calcStates = calculatorStates;

    if (user?.role !== 'admin') {
        navigate('/', { replace: true });
        return null;
    }

    const filteredSchemes = localSchemes.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.category.toLowerCase().includes(search.toLowerCase()) ||
        (s.state || '').toLowerCase().includes(search.toLowerCase())
    );

    const startEdit = (scheme: Scheme) => {
        setEditingSchemeId(scheme.id);
        setEditName(scheme.name);
        setEditCategory(scheme.category);
    };

    const cancelEdit = () => {
        setEditingSchemeId(null);
        setEditName('');
        setEditCategory('');
    };

    const saveEdit = (id: string) => {
        setLocalSchemes(prev => prev.map(s =>
            s.id === id ? { ...s, name: editName, category: editCategory } : s
        ));
        setEditingSchemeId(null);
    };

    const deleteScheme = (id: string) => {
        setLocalSchemes(prev => prev.filter(s => s.id !== id));
    };

    const toggleCalc = (name: string) => {
        toggleCalculator(name);
    };

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
                        </div>

                        <p className="text-slate-500 text-xs mb-3">{filteredSchemes.length} schemes found</p>

                        <div className="space-y-2">
                            <AnimatePresence>
                                {filteredSchemes.map((scheme) => (
                                    <motion.div
                                        key={scheme.id}
                                        layout
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -100 }}
                                        className="rounded-xl bg-dark-card border border-dark-border overflow-hidden"
                                    >
                                        {editingSchemeId === scheme.id ? (
                                            /* Edit Mode */
                                            <div className="p-3 space-y-2">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green"
                                                    placeholder="Scheme name"
                                                />
                                                <input
                                                    type="text"
                                                    value={editCategory}
                                                    onChange={e => setEditCategory(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white text-sm focus:outline-none focus:border-brand-green"
                                                    placeholder="Category"
                                                />
                                                <div className="flex gap-2 justify-end">
                                                    <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs flex items-center gap-1">
                                                        <X size={12} /> Cancel
                                                    </button>
                                                    <button onClick={() => saveEdit(scheme.id)} className="px-3 py-1.5 rounded-lg bg-brand-green text-white text-xs flex items-center gap-1">
                                                        <Check size={12} /> Save
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* View Mode */
                                            <div className="flex items-center gap-3 p-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-white text-sm font-medium truncate">{scheme.name}</h3>
                                                    <div className="flex gap-1.5 mt-1">
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${scheme.governmentLevel === 'central' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'}`}>
                                                            {scheme.governmentLevel === 'central' ? 'Central' : scheme.state}
                                                        </span>
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-700 text-slate-400">{scheme.category}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-blue-400 transition-colors"
                                                    onClick={() => startEdit(scheme)}
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-red-400 transition-colors"
                                                    onClick={() => deleteScheme(scheme.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
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
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${calcStates[name] ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                                    {calcStates[name] ? 'Active' : 'Disabled'}
                                </span>
                                <button
                                    className="text-slate-400"
                                    onClick={() => toggleCalc(name)}
                                >
                                    {calcStates[name]
                                        ? <ToggleRight size={22} className="text-brand-green" />
                                        : <ToggleLeft size={22} className="text-slate-600" />
                                    }
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
                                    </div>
                                    <p className="text-slate-500 text-xs mt-0.5">{f.description}</p>
                                </div>
                                <button onClick={() => toggleFeature(f.id)} className="shrink-0">
                                    {f.enabled
                                        ? <ToggleRight size={24} className="text-brand-green" />
                                        : <ToggleLeft size={24} className="text-slate-600" />
                                    }
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
