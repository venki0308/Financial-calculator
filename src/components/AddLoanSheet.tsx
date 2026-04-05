import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppColors } from '../theme/useAppColors';
import NumberInput from './NumberInput';
import DateInput from './DateInput';
import { type SavedLoan, type LoanType, LOAN_TYPE_META, generateLoanId, saveLoan } from '../utils/loanStorage';
import { calculateReducingEMI } from '../utils/calculations';

interface Props {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    editLoan?: SavedLoan | null;
    prefill?: Partial<SavedLoan>;
}

const LOAN_TYPES: LoanType[] = ['home_loan', 'car_loan', 'personal_loan', 'education_loan', 'gold_loan', 'business_loan', 'two_wheeler_loan', 'other'];

export default function AddLoanSheet({ open, onClose, onSaved, editLoan, prefill }: Props) {
    const { t } = useTranslation();
    const c = useAppColors();

    const [nickName, setNickName] = useState('');
    const [loanType, setLoanType] = useState<LoanType>('home_loan');
    const [lenderName, setLenderName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [loanAmount, setLoanAmount] = useState(2000000);
    const [interestRate, setInterestRate] = useState(8.5);
    const [tenureMonths, setTenureMonths] = useState(240);
    const [tenureUnit, setTenureUnit] = useState<'months' | 'years'>('years');
    const [emiAmount, setEmiAmount] = useState(0);
    const [rateType, setRateType] = useState<'floating' | 'fixed'>('floating');
    const [disbursementDate, setDisbursementDate] = useState('');
    const [emiDueDay, setEmiDueDay] = useState(5);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (editLoan) {
            setNickName(editLoan.nickName);
            setLoanType(editLoan.loanType);
            setLenderName(editLoan.lenderName);
            setAccountNumber(editLoan.accountNumber || '');
            setLoanAmount(editLoan.loanAmount);
            setInterestRate(editLoan.interestRate);
            setTenureMonths(editLoan.tenureMonths);
            setEmiAmount(editLoan.emiAmount);
            setRateType(editLoan.rateType);
            setDisbursementDate(editLoan.disbursementDate);
            setEmiDueDay(editLoan.emiDueDay);
            setNotes(editLoan.notes || '');
            setTenureUnit(editLoan.tenureMonths % 12 === 0 ? 'years' : 'months');
        } else if (prefill) {
            if (prefill.loanAmount) setLoanAmount(prefill.loanAmount);
            if (prefill.interestRate) setInterestRate(prefill.interestRate);
            if (prefill.tenureMonths) setTenureMonths(prefill.tenureMonths);
            if (prefill.emiAmount) setEmiAmount(prefill.emiAmount);
            if (prefill.rateType) setRateType(prefill.rateType);
            if (prefill.loanType) setLoanType(prefill.loanType);
        } else {
            // Reset for new
            setNickName('');
            setLoanType('home_loan');
            setLenderName('');
            setAccountNumber('');
            setLoanAmount(2000000);
            setInterestRate(8.5);
            setTenureMonths(240);
            setEmiAmount(0);
            setRateType('floating');
            setDisbursementDate('');
            setEmiDueDay(5);
            setNotes('');
        }
    }, [editLoan, prefill, open]);

    const actualTenureMonths = tenureUnit === 'years' ? Math.round(tenureMonths * 12) : tenureMonths;

    const autoCalcEmi = () => {
        if (loanAmount > 0 && interestRate > 0 && actualTenureMonths > 0) {
            const r = calculateReducingEMI(loanAmount, interestRate, actualTenureMonths);
            setEmiAmount(r.emi);
        }
    };

    const handleSave = () => {
        if (!nickName.trim() || !disbursementDate) return;
        const finalEmi = emiAmount > 0 ? emiAmount : calculateReducingEMI(loanAmount, interestRate, actualTenureMonths).emi;

        const loan: SavedLoan = {
            id: editLoan?.id || generateLoanId(),
            nickName: nickName.trim(),
            loanType,
            lenderName: lenderName.trim(),
            accountNumber: accountNumber.trim() || undefined,
            loanAmount,
            interestRate,
            tenureMonths: actualTenureMonths,
            emiAmount: finalEmi,
            rateType,
            disbursementDate,
            emiDueDay,
            notes: notes.trim() || undefined,
            createdAt: editLoan?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: editLoan?.isActive ?? true,
        };
        saveLoan(loan);
        onSaved();
        onClose();
    };

    const canSave = nickName.trim().length > 0 && disbursementDate && loanAmount > 0 && interestRate > 0;

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={onClose}
                    />
                    {/* Sheet */}
                    <motion.div
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl shadow-2xl"
                        style={{ backgroundColor: c.card }}
                    >
                        {/* Handle */}
                        <div className="sticky top-0 z-10 pt-3 pb-2 px-5 flex items-center justify-between" style={{ backgroundColor: c.card }}>
                            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
                            <h2 className="text-base font-bold" style={{ color: c.text }}>
                                {editLoan ? t('myLoans.editLoan') : t('myLoans.addLoan')}
                            </h2>
                            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ backgroundColor: c.bg }}>
                                <X size={18} style={{ color: c.textSecondary }} />
                            </button>
                        </div>

                        <div className="px-5 pb-8 space-y-4">
                            {/* Nickname */}
                            <div>
                                <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('myLoans.loanNickname')} *</label>
                                <input
                                    value={nickName} onChange={e => setNickName(e.target.value)}
                                    placeholder={t('myLoans.nicknamePlaceholder')}
                                    className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none"
                                    style={{ borderColor: c.border, color: c.text }}
                                    maxLength={40}
                                />
                            </div>

                            {/* Loan Type */}
                            <div>
                                <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('myLoans.loanType')}</label>
                                <div className="flex flex-wrap gap-2">
                                    {LOAN_TYPES.map(lt => {
                                        const meta = LOAN_TYPE_META[lt];
                                        const sel = loanType === lt;
                                        return (
                                            <button key={lt} onClick={() => setLoanType(lt)}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${sel ? 'text-white shadow-sm' : 'border'}`}
                                                style={sel ? { backgroundColor: meta.color } : { borderColor: c.border, color: c.textSecondary }}
                                            >
                                                <span>{meta.icon}</span> {t(meta.label)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Lender */}
                            <div>
                                <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('myLoans.lenderName')}</label>
                                <input
                                    value={lenderName} onChange={e => setLenderName(e.target.value)}
                                    placeholder={t('myLoans.lenderPlaceholder')}
                                    className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none"
                                    style={{ borderColor: c.border, color: c.text }}
                                />
                            </div>

                            {/* Account */}
                            <div>
                                <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('myLoans.accountNumber')}</label>
                                <input
                                    value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
                                    placeholder={t('myLoans.accountPlaceholder')}
                                    className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none"
                                    style={{ borderColor: c.border, color: c.text }}
                                />
                            </div>

                            {/* Amount */}
                            <NumberInput label={t('myLoans.loanAmount')} value={loanAmount} onChange={setLoanAmount} min={10000} max={100000000} prefix="₹" />

                            {/* Rate + Type */}
                            <div className="grid grid-cols-2 gap-3">
                                <NumberInput label={t('myLoans.interestRate')} value={interestRate} onChange={setInterestRate} min={1} max={30} suffix="%" step={0.05} />
                                <div>
                                    <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('myLoans.rateType')}</label>
                                    <div className="flex rounded-xl border p-0.5" style={{ borderColor: c.border }}>
                                        {(['floating', 'fixed'] as const).map(rt => (
                                            <button key={rt} onClick={() => setRateType(rt)}
                                                className={`flex-1 py-2 rounded-lg text-xs font-semibold ${rateType === rt ? 'bg-violet-600 text-white' : ''}`}
                                                style={rateType !== rt ? { color: c.textSecondary } : {}}
                                            >
                                                {t(`myLoans.${rt}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Tenure */}
                            <div>
                                <div className="flex rounded-xl border p-0.5 mb-2" style={{ borderColor: c.border }}>
                                    {(['years', 'months'] as const).map(u => (
                                        <button key={u} onClick={() => {
                                            if (u === 'years' && tenureUnit === 'months') setTenureMonths(Math.round(tenureMonths / 12) || 1);
                                            if (u === 'months' && tenureUnit === 'years') setTenureMonths(tenureMonths * 12);
                                            setTenureUnit(u);
                                        }}
                                            className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize ${tenureUnit === u ? 'bg-violet-600 text-white' : ''}`}
                                            style={tenureUnit !== u ? { color: c.textSecondary } : {}}
                                        >
                                            {u}
                                        </button>
                                    ))}
                                </div>
                                <NumberInput
                                    label={t('myLoans.tenure')}
                                    value={tenureMonths}
                                    onChange={setTenureMonths}
                                    min={1}
                                    max={tenureUnit === 'years' ? 40 : 480}
                                    suffix={tenureUnit === 'years' ? ' years' : ' months'}
                                />
                            </div>

                            {/* EMI */}
                            <div>
                                <NumberInput label={t('myLoans.emiAmount')} value={emiAmount} onChange={setEmiAmount} min={0} max={10000000} prefix="₹" />
                                <button onClick={autoCalcEmi} className="text-[10px] font-bold mt-1 text-violet-500">{t('myLoans.autoCalcEmi')}</button>
                            </div>

                            {/* Disbursement Date */}
                            <div>
                                <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('myLoans.disbursementDate')} *</label>
                                <DateInput value={disbursementDate} onChange={setDisbursementDate} />
                            </div>

                            {/* EMI Due Day */}
                            <div>
                                <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('myLoans.emiDueDay')}</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[1, 5, 7, 10, 15, 20, 25].map(d => (
                                        <button key={d} onClick={() => setEmiDueDay(d)}
                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${emiDueDay === d ? 'bg-violet-600 text-white shadow-sm' : 'border'}`}
                                            style={emiDueDay !== d ? { borderColor: c.border, color: c.textSecondary } : {}}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-xs font-bold mb-1.5 block" style={{ color: c.textSecondary }}>{t('myLoans.notes')}</label>
                                <textarea
                                    value={notes} onChange={e => setNotes(e.target.value)}
                                    placeholder={t('myLoans.notesPlaceholder')}
                                    className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none resize-none h-20"
                                    style={{ borderColor: c.border, color: c.text }}
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button onClick={onClose}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold border"
                                    style={{ borderColor: c.border, color: c.textSecondary }}
                                >
                                    {t('myLoans.cancel')}
                                </button>
                                <button onClick={handleSave} disabled={!canSave}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-emerald-500 disabled:opacity-40"
                                >
                                    {editLoan ? t('myLoans.updateLoan') : t('myLoans.saveLoan')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}