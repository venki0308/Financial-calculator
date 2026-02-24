import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark } from 'lucide-react';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { formatINR } from '../utils/calculations';

export default function SavedCalculations() {
    const navigate = useNavigate();
    const { savedCalculations, removeSaved } = useCalculatorStore();

    return (
        <div className="min-h-dvh bg-[#0F172A] pb-10 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-4 border-b border-dark-border">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                        <ArrowLeft size={18} className="text-slate-400" />
                    </button>
                    <h1 className="text-lg font-bold text-white">Saved</h1>
                </div>
            </div>

            <div className="px-4 mt-6">
                {savedCalculations.length === 0 ? (
                    <div className="text-center py-20">
                        <Bookmark size={48} className="text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500 text-sm">No saved calculations yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {savedCalculations.map((item) => {
                            const primaryValue = typeof item.result === 'number' ? item.result : (item.result?.primary || 0);
                            return (
                                <div key={item.id} className="p-4 rounded-2xl bg-dark-card border border-dark-border group">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-white font-bold text-sm">{item.type}</h3>
                                        <button onClick={() => removeSaved(item.id)} className="p-1 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Bookmark size={14} className="fill-red-400" />
                                        </button>
                                    </div>
                                    <p className="text-2xl font-bold text-brand-green">{formatINR(primaryValue)}</p>
                                    <p className="text-[10px] text-slate-500 mt-2">{new Date(item.timestamp).toLocaleString()}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
