import React from 'react';
import { useTranslation } from 'react-i18next';
import BottomSheet from './BottomSheet';

interface CalculatorInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    calculatorTitle: string;
}

const infoKeyMap: Record<string, string> = {
    'EMI Calculator': 'calcInfo.emiDesc',
    'Salary Hike Calculator': 'calcInfo.salaryHikeDesc',
    'SIP Calculator': 'calcInfo.sipDesc',
    'GST Calculator': 'calcInfo.gstDesc',
    'Compound Interest': 'calcInfo.compoundInterestDesc',
    'Simple Interest': 'calcInfo.simpleInterestDesc',
    'Advanced SIP': 'calcInfo.advancedSipDesc',
    'CAGR Calculator': 'calcInfo.cagrDesc',
    'Home Loan': 'calcInfo.homeLoanDesc',
    'Personal Loan': 'calcInfo.personalLoanDesc',
    'Car Loan': 'calcInfo.carLoanDesc',
    'Education Loan': 'calcInfo.educationLoanDesc',
    'Lumpsum Calculator': 'calcInfo.lumpsumDesc',
    'Step-up SIP': 'calcInfo.stepUpSipDesc',
    'Goal-based SIP': 'calcInfo.goalSipDesc',
    'Mutual Fund Returns': 'calcInfo.mutualFundDesc',
    'SWP Calculator': 'calcInfo.swpDesc',
    'Break-even': 'calcInfo.breakevenDesc',
    'FD Calculator': 'calcInfo.fdDesc',
    'RD Calculator': 'calcInfo.rdDesc',
    'PPF Calculator': 'calcInfo.ppfDesc',
    'EPF Calculator': 'calcInfo.epfDesc',
    'NPS Calculator': 'calcInfo.npsDesc',
    'Gratuity Calculator': 'calcInfo.gratuityDesc',
    'Retirement Calculator': 'calcInfo.retirementDesc',
    'Property Yield': 'calcInfo.propertyYieldDesc',
    'HRA Calculator': 'calcInfo.hraDesc',
    'Income Tax': 'calcInfo.incomeTaxDesc',
    'POMIS Calculator': 'calcInfo.pomisDesc',
    'SCSS Calculator': 'calcInfo.scssDesc',
    'SSY Calculator': 'calcInfo.ssyDesc',
    'KVP Calculator': 'calcInfo.kvpDesc',
    'NSC Calculator': 'calcInfo.nscDesc',
    'POTD Calculator': 'calcInfo.potdDesc',
};

export default function CalculatorInfoModal({ isOpen, onClose, calculatorTitle }: CalculatorInfoModalProps) {
    const { t } = useTranslation();
    // Find exact match or default
    const infoKey = infoKeyMap[calculatorTitle];
    const infoText = infoKey ? t(infoKey) : t('calcInfo.defaultDesc');

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title={t('calcInfo.aboutTitle')}>
            <div className="p-4 bg-slate-50 dark:bg-card border border-slate-200 dark:border-border rounded-xl">
                <p className="text-muted-foreground text-sm leading-relaxed">
                    {infoText}
                </p>
                <div className="mt-4 p-3 bg-brand-blue/5 border border-brand-blue/15 rounded-lg">
                    <p className="text-muted-foreground text-xs italic">
                        {t('calcInfo.note')}
                    </p>
                </div>
            </div>
            <div className="mt-4 px-1">
                <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-brand-green text-white font-semibold text-sm"
                >
                    {t('calcInfo.gotIt')}
                </button>
            </div>
        </BottomSheet>
    );
}
