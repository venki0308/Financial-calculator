import { useTranslation } from 'react-i18next';
import { TaxRegime } from '../utils/taxEngine';

interface Props {
  income: number;
  setIncome: (v: number) => void;
  regime: TaxRegime;
  setRegime: (v: TaxRegime) => void;
}

export default function TaxInputGroup({ income, setIncome, regime, setRegime }: Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/30">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('taxInput.title')}</p>

      <div>
        <label className="text-muted-foreground text-[11px] font-medium block mb-1">{t('taxInput.totalAnnualIncome')}</label>
        <p className="text-muted-foreground text-[9px] mb-1.5 leading-tight">{t('taxInput.incomeHelpText')}</p>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">₹</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={income}
            onChange={e => setIncome(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            onContextMenu={(e) => e.preventDefault()}
            onSelect={(e) => e.preventDefault()}
            className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-2 text-foreground text-sm font-semibold focus:outline-none focus:border-brand-blue"
          />
        </div>
      </div>

      <div>
        <label className="text-muted-foreground text-[11px] font-medium block mb-1">{t('taxInput.taxRegime')}</label>
        <div className="flex gap-2">
          <button
            onClick={() => setRegime('new')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${regime === 'new' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-background text-foreground border-border hover:border-brand-blue/50'}`}
          >
            {t('taxInput.newRegime')}
          </button>
          <button
            onClick={() => setRegime('old')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${regime === 'old' ? 'bg-brand-blue text-white border-brand-blue' : 'bg-background text-foreground border-border hover:border-brand-blue/50'}`}
          >
            {t('taxInput.oldRegime')}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {regime === 'new' ? t('taxInput.newRegimeDescription') : t('taxInput.oldRegimeDescription')}
        </p>
      </div>
    </div>
  );
}
