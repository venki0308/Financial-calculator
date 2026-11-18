import { Shield, TrendingUp, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RiskLevel, InvestmentCategory } from '../services/DecisionEngine';

interface Props {
  risk: RiskLevel;
  categories: InvestmentCategory[];
}

// DecisionEngine values stay in English (the website and audits read them); only the chip text is translated.
const RISK_KEYS: Record<RiskLevel, [string, string]> = {
  'Low (Govt backed)': ['saveUi.riskLowGovt', 'Low (Govt backed) Risk'],
  'Medium': ['saveUi.riskMedium', 'Medium Risk'],
  'Market-linked': ['saveUi.riskMarket', 'Market-linked Risk'],
};
const CATEGORY_KEYS: Record<InvestmentCategory, [string, string]> = {
  'Tax Saving': ['saveUi.catTaxSaving', 'Tax Saving'],
  'Income': ['saveUi.catIncome', 'Income'],
  'Growth': ['saveUi.catGrowth', 'Growth'],
};

export default function RiskCategoryTags({ risk, categories }: Props) {
  const { t } = useTranslation();
  const isLowRisk = risk.includes('Low');
  const riskColor = isLowRisk ? 'bg-brand-green/10 text-brand-green border-brand-green/20'
                  : risk === 'Medium' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                  : 'bg-red-500/10 text-red-500 border-red-500/20';
  const riskKey = RISK_KEYS[risk];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${riskColor}`}>
        <Shield size={12} />
        {riskKey ? t(riskKey[0], riskKey[1]) : `${risk} Risk`}
      </div>
      {categories.map(cat => {
        const Icon = cat === 'Tax Saving' ? Wallet : TrendingUp;
        const catKey = CATEGORY_KEYS[cat];
        return (
          <div key={cat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-brand-blue/10 text-brand-blue border-brand-blue/20 text-[10px] font-bold uppercase tracking-wider">
            <Icon size={12} />
            {catKey ? t(catKey[0], catKey[1]) : cat}
          </div>
        );
      })}
    </div>
  );
}
