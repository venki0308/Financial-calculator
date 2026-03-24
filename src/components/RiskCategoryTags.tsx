import { Shield, TrendingUp, Wallet } from 'lucide-react';
import { RiskLevel, InvestmentCategory } from '../services/DecisionEngine';

interface Props {
  risk: RiskLevel;
  categories: InvestmentCategory[];
}

export default function RiskCategoryTags({ risk, categories }: Props) {
  const isLowRisk = risk.includes('Low');
  const riskColor = isLowRisk ? 'bg-brand-green/10 text-brand-green border-brand-green/20' 
                  : risk === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' 
                  : 'bg-red-500/10 text-red-500 border-red-500/20';

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${riskColor}`}>
        <Shield size={12} />
        {risk} Risk
      </div>
      {categories.map(cat => {
        const Icon = cat === 'Tax Saving' ? Wallet : TrendingUp;
        return (
          <div key={cat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-brand-blue/10 text-brand-blue border-brand-blue/20 text-[10px] font-bold uppercase tracking-wider">
            <Icon size={12} />
            {cat}
          </div>
        );
      })}
    </div>
  );
}
