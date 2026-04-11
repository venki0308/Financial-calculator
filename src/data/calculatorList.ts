import { Calculator, FileText, Clock, Percent, PiggyBank, Landmark, Wallet, TrendingUp, LayoutGrid, RefreshCcw, ArrowUpRight, DollarSign, Target, GraduationCap, Heart, BarChart3, Minus, Building2, Car, Bike, Receipt, Sparkles, History, Briefcase, Mail, CreditCard, GitCompare, Calendar, Globe, Shield, Gem } from 'lucide-react';

export interface CalcItem { 
    nameKey: string; 
    descKey: string; 
    icon: React.ElementType; 
    color: string; 
    path: string; 
    category: string; 
    keywords?: string[]; // Added for fuzzy search
}

export const allCalcs: CalcItem[] = [
    // Tax & Salary
    { nameKey: 'calculators.incomeTax.name', descKey: 'calculators.incomeTax.desc', icon: FileText, color: '#F59E0B', path: '/calculator/income-tax', category: 'taxSalary', keywords: ['tax', 'income', 'salary'] },
    { nameKey: 'calculators.salaryHike.name', descKey: 'calculators.salaryHike.desc', icon: ArrowUpRight, color: '#10B981', path: '/calculator/salary-hike', category: 'taxSalary', keywords: ['hike', 'appraisal', 'increment', 'salary'] },
    { nameKey: 'calculators.hra.name', descKey: 'calculators.hra.desc', icon: GraduationCap, color: '#F59E0B', path: '/calculator/hra', category: 'taxSalary', keywords: ['hra', 'house', 'rent', 'allowance'] },

    // Loans
    { nameKey: 'calculators.advancedMortgage.name', descKey: 'calculators.advancedMortgage.desc', icon: Landmark, color: '#3B82F6', path: '/calculator/mortgage-calculator', category: 'loans', keywords: ['mortgage', 'home', 'loan', 'prepayment', 'tax', '80c', '24'] },
    { nameKey: 'calculators.personalLoan.name', descKey: 'calculators.personalLoan.desc', icon: Calculator, color: '#8B5CF6', path: '/calculator/personal-loan', category: 'loans', keywords: ['personal', 'loan', 'finance', 'cash'] },
    { nameKey: 'calculators.educationLoan.name', descKey: 'calculators.educationLoan.desc', icon: GraduationCap, color: '#F59E0B', path: '/calculator/education-loan', category: 'loans', keywords: ['education', 'loan', 'student', 'study', 'college'] },
    { nameKey: 'calculators.emi.name', descKey: 'calculators.emi.desc', icon: Calculator, color: '#10B981', path: '/calculator/loan-emi', category: 'loans', keywords: ['emi', 'home', 'loan', 'mortgage'] },
    { nameKey: 'calculators.carLoan.name', descKey: 'calculators.carLoan.desc', icon: Car, color: '#3B82F6', path: '/calculator/car-loan', category: 'loans', keywords: ['car', 'loan', 'auto', 'vehicle'] },
    { nameKey: 'calculators.twoWheeler.name', descKey: 'calculators.twoWheeler.desc', icon: Bike, color: '#EC4899', path: '/two-wheeler-loan', category: 'loans', keywords: ['two', 'wheeler', 'bike', 'scooter', 'ev', 'electric', 'loan', 'emi'] },
    { nameKey: 'calculators.goldLoan.name', descKey: 'calculators.goldLoan.desc', icon: Gem, color: '#EAB308', path: '/gold-loan', category: 'loans', keywords: ['gold', 'loan', 'jewellery', 'jewelry', 'ornament', 'pledge', 'pawn', 'bullet', 'rbi'] },
    { nameKey: 'calculators.compound.name', descKey: 'calculators.compound.desc', icon: Percent, color: '#8B5CF6', path: '/calculator/compound-interest', category: 'loans', keywords: ['compound', 'interest', 'ci'] },

    // Investments
    { nameKey: 'calculators.sip.name', descKey: 'calculators.sip.desc', icon: TrendingUp, color: '#3B82F6', path: '/calculator/sip', category: 'investments', keywords: ['sip', 'mutual', 'fund', 'investment'] },
    { nameKey: 'calculators.lumpsum.name', descKey: 'calculators.lumpsum.desc', icon: Wallet, color: '#10B981', path: '/calculator/lumpsum', category: 'investments', keywords: ['lumpsum', 'mutual', 'fund', 'one time'] },
    { nameKey: 'calculators.swp.name', descKey: 'calculators.swp.desc', icon: TrendingUp, color: '#F59E0B', path: '/calculator/swp', category: 'investments', keywords: ['swp', 'withdrawal', 'pension', 'regular'] },
    { nameKey: 'calculators.stp.name', descKey: 'calculators.stp.desc', icon: RefreshCcw, color: '#06B6D4', path: '/calculator/stp', category: 'investments', keywords: ['stp', 'systematic', 'transfer', 'plan', 'debt', 'equity', 'lumpsum'] },
    { nameKey: 'calculators.prag.name', descKey: 'calculators.prag.desc', icon: PiggyBank, color: '#8B5CF6', path: '/calculator/prag', category: 'investments', keywords: ['prag', 'portfolio', 'rebalance', 'allocation', 'asset', 'diversification'] },
    { nameKey: 'calculators.cagr.name', descKey: 'calculators.cagr.desc', icon: BarChart3, color: '#8B5CF6', path: '/calculator/cagr', category: 'investments', keywords: ['cagr', 'growth', 'annual', 'rate'] },

    // Banking
    { nameKey: 'calculators.fd.name', descKey: 'calculators.fd.desc', icon: PiggyBank, color: '#F59E0B', path: '/calculator/fixed-deposit', category: 'banking', keywords: ['fd', 'fixed', 'deposit', 'bank'] },
    { nameKey: 'calculators.rd.name', descKey: 'calculators.rd.desc', icon: Clock, color: '#3B82F6', path: '/calculator/recurring-deposit', category: 'banking', keywords: ['rd', 'recurring', 'deposit', 'bank'] },
    { nameKey: 'calculators.simple.name', descKey: 'calculators.simple.desc', icon: Minus, color: '#6B7280', path: '/calculator/simple-interest', category: 'banking', keywords: ['simple', 'interest', 'si'] },
    { nameKey: 'calculators.overdraft.name', descKey: 'calculators.overdraft.desc', icon: Wallet, color: '#EF4444', path: '/calculator/overdraft', category: 'banking', keywords: ['overdraft', 'loan', 'bank', 'interest', 'od'] },

    // Retirement
    { nameKey: 'calculators.epf.name', descKey: 'calculators.epf.desc', icon: Wallet, color: '#F59E0B', path: '/calculator/epf', category: 'retirement', keywords: ['epf', 'pf', 'provident', 'fund', 'employee'] },
    { nameKey: 'calculators.nps.name', descKey: 'calculators.nps.desc', icon: LayoutGrid, color: '#3B82F6', path: '/calculator/nps', category: 'retirement', keywords: ['nps', 'national', 'pension', 'system'] },
    { nameKey: 'calculators.ppf.name', descKey: 'calculators.ppf.desc', icon: Landmark, color: '#10B981', path: '/calculator/ppf', category: 'retirement', keywords: ['ppf', 'public', 'provident', 'fund', 'tax', 'saving', 'monthly', 'quarterly', 'yearly'] },
    { nameKey: 'calculators.gratuity.name', descKey: 'calculators.gratuity.desc', icon: DollarSign, color: '#8B5CF6', path: '/calculator/gratuity', category: 'retirement', keywords: ['gratuity', 'retirement', 'employee', 'bonus'] },

    // Post Office
    { nameKey: 'calculators.ssy.name', descKey: 'calculators.ssy.desc', icon: Heart, color: '#EF4444', path: '/calculator/sukanya-samriddhi', category: 'postOffice', keywords: ['ssy', 'sukanya', 'samriddhi', 'yojana', 'girl'] },
    { nameKey: 'calculators.nsc.name', descKey: 'calculators.nsc.desc', icon: RefreshCcw, color: '#3B82F6', path: '/calculator/nsc', category: 'postOffice', keywords: ['nsc', 'national', 'savings', 'certificate'] },
    { nameKey: 'calculators.kvp.name', descKey: 'calculators.kvp.desc', icon: Clock, color: '#F59E0B', path: '/calculator/kvp', category: 'postOffice', keywords: ['kvp', 'kisan', 'vikas', 'patra'] },
    { nameKey: 'calculators.pomis.name', descKey: 'calculators.pomis.desc', icon: DollarSign, color: '#10B981', path: '/calculator/post-office-mis', category: 'postOffice', keywords: ['mis', 'pomis', 'monthly', 'income', 'scheme'] },
    { nameKey: 'calculators.potd.name', descKey: 'calculators.potd.desc', icon: PiggyBank, color: '#3B82F6', path: '/calculator/post-office-td', category: 'postOffice', keywords: ['td', 'time', 'deposit', 'post', 'office'] },
    { nameKey: 'calculators.scss.name', descKey: 'calculators.scss.desc', icon: Landmark, color: '#8B5CF6', path: '/calculator/senior-citizen-savings', category: 'postOffice', keywords: ['scss', 'senior', 'citizen', 'savings', 'scheme', 'elderly'] },

    // Business
    { nameKey: 'calculators.gst.name', descKey: 'calculators.gst.desc', icon: Receipt, color: '#06B6D4', path: '/calculator/gst', category: 'business', keywords: ['gst', 'goods', 'services', 'tax', 'business'] },
    { nameKey: 'calculators.breakEven.name', descKey: 'calculators.breakEven.desc', icon: BarChart3, color: '#10B981', path: '/calculator/break-even', category: 'business', keywords: ['break', 'even', 'profit', 'loss', 'point'] },

    // Property
    { nameKey: 'calculators.property.name', descKey: 'calculators.property.desc', icon: Building2, color: '#F97316', path: '/calculator/property', category: 'property', keywords: ['property', 'real', 'estate', 'house', 'appreciation'] },

    // Tools
    { nameKey: 'calculators.age.name', descKey: 'calculators.age.desc', icon: Calendar, color: '#F97316', path: '/calculator/age', category: 'tools', keywords: ['age', 'date', 'birth', 'generation'] },
    { nameKey: 'calculators.scientific.name', descKey: 'calculators.scientific.desc', icon: Calculator, color: '#3B82F6', path: '/calculator/scientific', category: 'tools', keywords: ['scientific', 'calculator', 'math', 'log', 'sin'] },
    { nameKey: 'calculators.cibilScore.name', descKey: 'calculators.cibilScore.desc', icon: BarChart3, color: '#8B5CF6', path: '/cibil-score', category: 'tools', keywords: ['cibil', 'score', 'credit', 'loan', 'eligibility', 'rate'] },
    // Insurance
    { nameKey: 'calculators.insurance.name', descKey: 'calculators.insurance.desc', icon: Shield, color: '#10B981', path: '/calculator/insurance', category: 'insurance', keywords: ['insurance', 'health', 'life', 'term', 'premium', 'cover', 'policy'] },
    { nameKey: 'calculators.insuranceCompare.name', descKey: 'calculators.insuranceCompare.desc', icon: GitCompare, color: '#06B6D4', path: '/insurance-compare', category: 'insurance', keywords: ['insurance', 'compare', 'health', 'plan', 'comparison', 'csr'] },
    // Credit Cards
    { nameKey: 'calculators.ccPayoff.name', descKey: 'calculators.ccPayoff.desc', icon: CreditCard, color: '#06B6D4', path: '/calculator/credit-card-payoff', category: 'loans', keywords: ['credit', 'card', 'payoff', 'debt', 'avalanche', 'snowball'] },
    { nameKey: 'calculators.ccInterest.name', descKey: 'calculators.ccInterest.desc', icon: CreditCard, color: '#EF4444', path: '/calculator/credit-card-interest', category: 'loans', keywords: ['credit', 'card', 'interest', 'gst', 'finance', 'charge'] },
];
