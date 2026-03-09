import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Trash2 } from 'lucide-react';
import { useCalculatorStore } from '../store/useCalculatorStore';
import { formatINR } from '../utils/calculations';

export default function CalculationHistory() {
    const navigate = useNavigate();
    const { history, clearHistory } = useCalculatorStore();

    return (
        <div className="min-h-dvh bg-[#0F172A] pb-10 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            <div className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur-lg px-4 pt-14 pb-4 border-b border-dark-border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-dark-card border border-dark-border">
                            <ArrowLeft size={18} className="text-slate-400" />
                        </button>
                        <h1 className="text-lg font-bold text-white">History</h1>
                    </div>
                    {history.length > 0 && (
                        <button onClick={clearHistory} className="p-2 text-red-400">
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="px-4 mt-6">
                {history.length === 0 ? (
                    <div className="text-center py-20">
                        <Clock size={48} className="text-slate-700 mx-auto mb-4" />
                        <p className="text-slate-500 text-sm">No recent history</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((item) => {
                            const primaryValue = typeof item.resultValues === 'number' ? item.resultValues : (item.resultValues?.primary || 0);
                            return (
                                <div key={item.id} className="p-4 rounded-2xl bg-dark-card border border-dark-border">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-white font-bold text-sm">{item.calculatorType}</h3>
                                        <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-lg font-bold text-brand-blue">{formatINR(primaryValue)}</p>
                                    <p className="text-[10px] text-slate-500 mt-1">{new Date(item.timestamp).toLocaleDateString()}</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
