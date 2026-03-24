import { TaxRegime } from '../utils/taxEngine';

interface Props {
  income: number;
  setIncome: (v: number) => void;
  regime: TaxRegime;
  setRegime: (v: TaxRegime) => void;
}

export default function TaxInputGroup({ income, setIncome, regime, setRegime }: Props) {
  return (
    <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/30">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tax Settings</p>
      
      <div>
        <label className="text-muted-foreground text-[11px] font-medium block mb-1">Total Annual Income</label>
        <p className="text-muted-foreground text-[9px] mb-1.5 leading-tight">Enter your estimated total gross income to accurately compute the effective tax rate using income slabs.</p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">₹</span>
          <input 
            type="number" 
            value={income} 
            onChange={e => setIncome(Number(e.target.value) || 0)} 
            className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-blue" 
          />
        </div>
      </div>

      <div>
        <label className="text-muted-foreground text-[11px] font-medium block mb-1">Tax Regime</label>
        <div className="flex gap-2">
          <button 
            onClick={() => setRegime('new')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${regime === 'new' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-background text-foreground border-border hover:border-brand-blue/50'}`}
          >
            New Regime
          </button>
          <button 
            onClick={() => setRegime('old')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${regime === 'old' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-background text-foreground border-border hover:border-brand-blue/50'}`}
          >
            Old Regime
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {regime === 'new' ? 'Standard Deduction ₹75K. Tax-free up to ₹7.75L.' : 'Standard Deduction ₹50K. Tax-free up to ₹5.5L. Allows 80C.'}
        </p>
      </div>
    </div>
  );
}
