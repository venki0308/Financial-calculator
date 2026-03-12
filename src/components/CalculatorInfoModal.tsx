import React from 'react';
import BottomSheet from './BottomSheet';

interface CalculatorInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    calculatorTitle: string;
}

const infoMap: Record<string, string> = {
    'EMI Calculator': 'Calculate your Equated Monthly Installment (EMI) for home loans, car loans, and personal loans. It helps you plan your monthly repayment schedule.',
    'Salary Hike Calculator': 'Plan your expected salary increment. Compare your current salary with the expected new salary or hike percentage to see your new monthly and annual earnings.',
    'SIP Calculator': 'Calculate the future value of your Systematic Investment Plan (SIP). See how regular monthly investments grow over time with the power of compounding.',
    'GST Calculator': 'Calculate Goods and Services Tax (GST). Find out the net price, tax amount, and total price efficiently for both inclusive and exclusive tax modes.',
    'Compound Interest': 'Calculate the interest earned on your deposit over a given period, where interest is earned on both the principal and the accumulated interest.',
    'Simple Interest': 'Calculate basic simple interest earned on a principal amount over a specific time period at a fixed rate.',
    'Advanced SIP': 'A comprehensive SIP calculator allowing you to factor in inflation, step-up (annual increase in contribution), and taxes to calculate real returns.',
    'CAGR Calculator': 'Calculate Compound Annual Growth Rate (CAGR) to understand the smoothed annualized return of an investment over a specified time period.',
    'Home Loan': 'Calculate your monthly EMI, total interest payable, and the total cost of your home loan over its full tenure.',
    'Personal Loan': 'Estimate your monthly EMI and interest for unsecured personal loans.',
    'Car Loan': 'Calculate your monthly car loan payment and check how much interest you will pay over the life of the loan.',
    'Education Loan': 'Plan your education finances by calculating the EMI and total interest for a student loan.',
    'Lumpsum Calculator': 'Calculate the future value of a one-time lumpsum investment over a period of time with a fixed expected rate of return.',
    'Step-up SIP': 'Calculate SIP returns when you increase your investment amount by a fixed percentage every year to match your income growth.',
    'Goal-based SIP': 'Determine how much you need to invest monthly in an SIP to reach a specific financial target within a certain timeframe.',
    'Mutual Fund Returns': 'Estimate the potential returns on your mutual fund investments based on historical or expected growth rates.',
    'SWP Calculator': 'Calculate your Systematic Withdrawal Plan (SWP). Find out how long your corpus will last or what your withdrawal structure should be for a steady income.',
    'Break-even': 'Find the break-even point in business or investments where total costs and total revenues are exactly equal.',
    'FD Calculator': 'Calculate returns on your Fixed Deposit (FD) investments based on various compounding frequencies (monthly, quarterly, half-yearly, yearly).',
    'RD Calculator': 'Calculate returns on your Recurring Deposit (RD) where you invest a fixed amount every month for a specific tenure.',
    'PPF Calculator': 'Calculate returns on Public Provident Fund (PPF) investments, a long-term retirement savings scheme backed by the Government of India.',
    'EPF Calculator': 'Estimate your Employee Provident Fund (EPF) balance at retirement based on your current basic salary, contribution, and expected hike.',
    'NPS Calculator': 'Calculate your National Pension System (NPS) maturity amount and the expected monthly pension upon retirement.',
    'Gratuity Calculator': 'Calculate the gratuity amount you are entitled to receive from your employer after rendering continuous service for 5 or more years.',
    'Retirement Calculator': 'Estimate the corpus you will need to comfortably sustain your lifestyle after retirement, factoring in inflation and expected returns.',
    'Property Yield': 'Calculate the rental yield and potential return on investment (ROI) for real estate properties.',
    'HRA Calculator': 'Calculate the exempt portion of your House Rent Allowance (HRA) to maximize your tax savings.',
    'Income Tax': 'Estimate your income tax liability under both the old and new tax regimes to find out which one is more beneficial for you.',
    'POMIS Calculator': 'Calculate the monthly income generated from Post Office Monthly Income Scheme (POMIS) deposits.',
    'SCSS Calculator': 'Calculate returns and periodic interest payouts for the Senior Citizen Savings Scheme (SCSS).',
    'SSY Calculator': 'Estimate maturity amount for Sukanya Samriddhi Yojana (SSY), a scheme for the girl child.',
    'KVP Calculator': 'Calculate the duration required for your money to double in Kisan Vikas Patra (KVP).',
    'NSC Calculator': 'Calculate the maturity value of National Savings Certificate (NSC) investments.',
    'POTD Calculator': 'Calculate interest and maturity returns for Post Office Time Deposit (POTD).',
};

export default function CalculatorInfoModal({ isOpen, onClose, calculatorTitle }: CalculatorInfoModalProps) {
    // Find exact match or default
    const infoText = infoMap[calculatorTitle] ||
        'Use this calculator to input your parameters and get accurate financial projections. Remember that all calculations are for simulation purposes.';

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="About This Calculator">
            <div className="p-4 bg-slate-50 dark:bg-card border border-slate-200 dark:border-border rounded-xl">
                <p className="text-muted-foreground text-sm leading-relaxed">
                    {infoText}
                </p>
                <div className="mt-4 p-3 bg-brand-blue/5 border border-brand-blue/15 rounded-lg">
                    <p className="text-muted-foreground text-xs italic">
                        Note: Projections are illustrative. Please consult a financial advisor for official advice.
                    </p>
                </div>
            </div>
            <div className="mt-4 px-1">
                <button
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-brand-green text-white font-semibold text-sm"
                >
                    Got it
                </button>
            </div>
        </BottomSheet>
    );
}
