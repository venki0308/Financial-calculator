import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Lightbulb, BarChart2, ClipboardList, TrendingUp, Landmark, ShieldCheck, Target, CreditCard, AlertCircle, Scale, Building2, Briefcase, Home as HomeIcon, Gem } from 'lucide-react';

export type ModuleName = 'advisor' | 'emi' | 'tax' | 'sip' | 'fd' | 'rd' | 'ppf' | 'hra' | 'gratuity' | 'gst' | 'goal' | 'expense' | 'overdraft' | 'schemes' | 'compare' | 'general' | 'time' | 'scientific' | 'swp' | 'stp' | 'prag' | 'cagr' | 'lumpsum' | 'epf' | 'nps' | 'ssy' | 'nsc' | 'kvp' | 'pomis' | 'potd' | 'scss' | 'budget' | 'insurance' | 'mortgage' | 'property' | 'goldLoan';

const MODULE_ICONS: Record<ModuleName, React.ElementType> = {
    emi: Lightbulb, overdraft: Building2, tax: ClipboardList, sip: TrendingUp,
    fd: Landmark, rd: Landmark, ppf: ShieldCheck, hra: ClipboardList,
    gratuity: Briefcase, gst: ClipboardList, advisor: Lightbulb, goal: Target,
    expense: CreditCard, compare: Scale, schemes: Landmark, general: AlertCircle,
    time: AlertCircle, scientific: AlertCircle, swp: TrendingUp, cagr: BarChart2,
    lumpsum: TrendingUp, epf: ShieldCheck, nps: ShieldCheck, ssy: ShieldCheck,
    nsc: Landmark, kvp: Landmark, pomis: Landmark, potd: Landmark,
    scss: ShieldCheck, budget: CreditCard, insurance: ShieldCheck,
    mortgage: HomeIcon, property: Building2, goldLoan: Gem,
    stp: TrendingUp, prag: BarChart2,
};

const colorClass = "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-900";

export interface DisclaimerProps {
    module?: ModuleName;
}

export default function DisclaimerComponent({ module = 'general' }: DisclaimerProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const Icon = MODULE_ICONS[module] || AlertCircle;
    const title = t(`disclaimer.${module}.title`);
    const text = t(`disclaimer.${module}.text`);

    return (
        <div className={`mx-4 my-6 p-4 rounded-xl border transition-colors ${colorClass}`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between text-left"
            >
                <div className="flex items-start gap-3 flex-1 overflow-hidden pr-2">
                    <Icon size={18} className="shrink-0 mt-0.5" />
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-semibold text-sm">{title}</span>
                        {!isOpen && (
                            <span className="text-xs opacity-80 truncate block w-full mt-0.5">
                                {text}
                            </span>
                        )}
                    </div>
                </div>
                {isOpen ? <ChevronUp size={16} className="shrink-0 opacity-70" /> : <ChevronDown size={16} className="shrink-0 opacity-70" />}
            </button>

            {isOpen && (
                <div className="mt-3 pt-3 border-t border-current/20">
                    <p className="text-sm leading-relaxed text-left opacity-90">
                        {text}
                    </p>
                </div>
            )}
        </div>
    );
}
