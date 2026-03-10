import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Calendar, CreditCard, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBudgetTrackerStore, Subscription, EXPENSE_CATEGORIES } from '../../store/useBudgetTrackerStore';

const COLOR_TAGS = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Amber
    '#10b981', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
];

const PREPOPULATED = [
    { name: 'Netflix', amount: 499, color: '#ef4444' },
    { name: 'Spotify', amount: 119, color: '#10b981' },
    { name: 'Amazon Prime', amount: 299, color: '#06b6d4' },
    { name: 'YouTube Premium', amount: 129, color: '#ef4444' },
    { name: 'Gym Membership', amount: 1500, color: '#f59e0b' },
];

export default function SubscriptionsTab() {
    const { t } = useTranslation();
    const { subscriptions, addSubscription, updateSubscription, deleteSubscription } = useBudgetTrackerStore();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Subscription>>({
        name: '',
        amount: 0,
        billingCycle: 'monthly',
        nextDueDate: new Date().toISOString().split('T')[0],
        category: 'entertainment',
        colorTag: COLOR_TAGS[5],
        isActive: true,
    });

    const openModal = (sub?: Subscription) => {
        if (sub) {
            setEditingId(sub.id);
            setFormData(sub);
        } else {
            setEditingId(null);
            setFormData({
                name: '',
                amount: 0,
                billingCycle: 'monthly',
                nextDueDate: new Date().toISOString().split('T')[0],
                category: 'entertainment',
                colorTag: COLOR_TAGS[5],
                isActive: true,
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.name || !formData.amount || !formData.nextDueDate) return;

        const sub: Subscription = {
            id: editingId || Date.now().toString(),
            name: formData.name!,
            amount: Number(formData.amount),
            billingCycle: formData.billingCycle as 'monthly' | 'yearly',
            nextDueDate: formData.nextDueDate!,
            category: formData.category || 'entertainment',
            colorTag: formData.colorTag || COLOR_TAGS[5],
            isActive: formData.isActive ?? true,
        };

        if (editingId) {
            updateSubscription(editingId, sub);
        } else {
            const { id, ...newSub } = sub;
            addSubscription(newSub);
        }
        setIsModalOpen(false);
    };

    const handleSuggest = (suggest: typeof PREPOPULATED[0]) => {
        addSubscription({
            name: suggest.name,
            amount: suggest.amount,
            billingCycle: 'monthly',
            nextDueDate: new Date().toISOString().split('T')[0],
            category: 'entertainment',
            colorTag: suggest.color,
            isActive: true,
        });
    };

    const sortedSubs = [...subscriptions].sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime());

    const totalMonthly = subscriptions
        .filter(s => s.isActive)
        .reduce((sum, s) => sum + (s.billingCycle === 'monthly' ? s.amount : s.amount / 12), 0);

    const getDaysIndicator = (dateStr: string) => {
        const diffDays = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
        if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, color: 'text-red-500 bg-red-50 dark:bg-red-500/10' };
        if (diffDays === 0) return { text: 'Due Today', color: 'text-red-500 bg-red-50 dark:bg-red-500/10' };
        if (diffDays <= 3) return { text: `Due in ${diffDays}d`, color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10' };
        if (diffDays <= 7) return { text: `Due in ${diffDays}d`, color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' };
        return { text: `Due in ${diffDays}d`, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10' };
    };

    return (
        <div className="space-y-6 pb-24">
            {/* Header Summary */}
            <div className="bg-gradient-to-r from-brand-purple to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-brand-purple/20">
                <div className="flex items-center gap-2 mb-2 text-white/80">
                    <CreditCard size={18} />
                    <span className="font-semibold text-sm">Monthly Commitment</span>
                </div>
                <h2 className="text-3xl font-extrabold tracking-tight">₹{Math.round(totalMonthly).toLocaleString('en-IN')}</h2>
                <p className="text-sm mt-1 opacity-90">{subscriptions.length} Active Subscriptions</p>
            </div>

            {/* Empty State / Prepopulated Suggestions */}
            {subscriptions.length === 0 && (
                <div className="space-y-4">
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📱</div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-2">No Subscriptions Yet</h3>
                        <p className="text-slate-500 text-sm">Track your recurring expenses easily.</p>
                    </div>

                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-3">Quick Add Popular</h4>
                        <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide">
                            {PREPOPULATED.map((p) => (
                                <button
                                    key={p.name}
                                    onClick={() => handleSuggest(p)}
                                    className="flex-shrink-0 flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3"
                                >
                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: p.color }} />
                                    <span className="font-bold text-sm text-slate-800 dark:text-white">{p.name}</span>
                                    <span className="text-slate-400 text-xs font-semibold ml-2">₹{p.amount}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="space-y-3">
                {sortedSubs.map(sub => {
                    const indicator = getDaysIndicator(sub.nextDueDate);
                    const cat = EXPENSE_CATEGORIES.find(c => c.id === sub.category);
                    
                    return (
                        <motion.div
                            key={sub.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => openModal(sub)}
                            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-4 cursor-pointer relative overflow-hidden group"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: sub.colorTag }} />
                            
                            <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-lg flex-shrink-0">
                                {cat?.icon || '📅'}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">{sub.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${indicator.color}`}>
                                        {indicator.text}
                                    </span>
                                    {!sub.isActive && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-slate-500 bg-slate-100 dark:bg-slate-800">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="font-bold text-slate-900 dark:text-white text-base leading-none mb-1">
                                    ₹{sub.amount.toLocaleString('en-IN')}
                                </p>
                                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                                    /{sub.billingCycle === 'monthly' ? 'mo' : 'yr'}
                                </span>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Add Button */}
            <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => openModal()}
                className="fixed bottom-24 right-5 w-14 h-14 bg-brand-purple text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-purple/30 z-40"
            >
                <Plus size={24} />
            </motion.button>

            {/* Add/Edit Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white dark:bg-slate-900 rounded-t-3xl z-50 shadow-2xl safe-bottom border-t border-slate-200 dark:border-white/10"
                        >
                            <div className="p-6">
                                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" />
                                
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {editingId ? 'Edit Subscription' : 'New Subscription'}
                                    </h2>
                                    {editingId && (
                                        <button
                                            onClick={() => {
                                                deleteSubscription(editingId);
                                                setIsModalOpen(false);
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pb-6 scrollbar-hide px-1">
                                    {/* Name & Amount */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 ml-1">Name</label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="e.g. Netflix"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-purple"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 ml-1">Amount (₹)</label>
                                            <input
                                                type="number"
                                                value={formData.amount || ''}
                                                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                                placeholder="0"
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-purple"
                                            />
                                        </div>
                                    </div>

                                    {/* Date & Cycle */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 ml-1">Next Due Date</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                <input
                                                    type="date"
                                                    value={formData.nextDueDate}
                                                    onChange={e => setFormData({ ...formData, nextDueDate: e.target.value })}
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-3.5 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-purple"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 ml-1">Billing Cycle</label>
                                            <select
                                                value={formData.billingCycle}
                                                onChange={e => setFormData({ ...formData, billingCycle: e.target.value as 'monthly' | 'yearly' })}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-purple appearance-none cursor-pointer"
                                            >
                                                <option value="monthly">Monthly</option>
                                                <option value="yearly">Yearly</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Category */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 ml-1">Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3.5 text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-purple appearance-none cursor-pointer"
                                        >
                                            {EXPENSE_CATEGORIES.map(c => (
                                                <option key={c.id} value={c.id}>{c.icon} {t(`expenses.categories.${c.id}`)}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Color Tag & Status */}
                                    <div className="flex items-center justify-between pt-2">
                                        <div className="flex gap-2">
                                            {COLOR_TAGS.map(color => (
                                                <button
                                                    key={color}
                                                    onClick={() => setFormData({ ...formData, colorTag: color })}
                                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform ${formData.colorTag === color ? 'border-brand-purple scale-110' : 'border-transparent'}`}
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {formData.colorTag === color && <CheckCircle2 size={14} className="text-white drop-shadow-sm" />}
                                                </button>
                                            ))}
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.isActive}
                                                onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                                className="w-5 h-5 rounded text-brand-purple bg-slate-100 border-slate-300 focus:ring-brand-purple dark:bg-slate-800 dark:border-slate-700"
                                            />
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Active</span>
                                        </label>
                                    </div>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleSave}
                                    disabled={!formData.name || !formData.amount || !formData.nextDueDate}
                                    className="w-full py-4 mt-2 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl font-bold shadow-lg shadow-brand-purple/20 disabled:opacity-50 disabled:shadow-none transition-all"
                                >
                                    Save Subscription
                                </motion.button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
