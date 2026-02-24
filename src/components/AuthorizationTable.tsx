import { Check, X, Crown } from 'lucide-react';

const rows = [
    { feature: 'Calculator Access', free: true, premium: true },
    { feature: 'Save Calculations', free: true, premium: true },
    { feature: 'View History', free: true, premium: true },
    { feature: 'Central Govt Schemes', free: true, premium: true },
    { feature: 'Live Metal Prices', free: true, premium: true },
    { feature: 'State Govt Schemes', free: false, premium: true },
    { feature: 'Export as PDF', free: false, premium: true },
    { feature: 'Export as Excel', free: false, premium: true },
];

export default function AuthorizationTable() {
    return (
        <div className="mt-6 rounded-2xl bg-dark-card border border-dark-border overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-dark-border flex items-center gap-2.5">
                <Crown size={18} className="text-amber-500" />
                <h3 className="text-white font-bold text-[15px]">Feature Access</h3>
            </div>

            {/* Premium note */}
            <div className="px-5 py-2.5 bg-amber-500/5 border-b border-dark-border">
                <p className="text-amber-400 text-xs">
                    📄 PDF & 📊 Excel export available under <span className="font-bold">Premium plan</span> only
                </p>
            </div>

            {/* Table */}
            <div className="w-full">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_64px_64px] px-5 py-3 border-b border-dark-border">
                    <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Feature</span>
                    <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider text-center">Free</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-center">
                        <span className="inline-flex items-center gap-1 text-amber-400">
                            <Crown size={10} /> Prem
                        </span>
                    </span>
                </div>

                {/* Rows */}
                {rows.map(({ feature, free, premium }, i) => (
                    <div
                        key={feature}
                        className={`grid grid-cols-[1fr_64px_64px] px-5 py-3 border-b border-dark-border/40 items-center ${i % 2 === 0 ? 'bg-slate-900/20' : ''}`}
                    >
                        <span className="text-slate-200 text-[13px] font-medium">{feature}</span>
                        <div className="flex justify-center">
                            {free
                                ? <Check size={16} className="text-green-500" />
                                : <X size={16} className="text-slate-600" />
                            }
                        </div>
                        <div className="flex justify-center">
                            {premium
                                ? <Check size={16} className="text-amber-500" />
                                : <X size={16} className="text-slate-600" />
                            }
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
