import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '../theme/useAppColors';

interface Props {
    open: boolean;
    onClose: () => void;
    onConfirm: (name: string) => void;
    /** Pre-filled suggested name (e.g. "Compound Interest — ₹1,00,000 × 10Y") */
    defaultName?: string;
    /** Optional title shown at the top of the dialog */
    title?: string;
    /** Optional subtitle / hint shown under the title */
    subtitle?: string;
}

/**
 * Lightweight centered modal that asks the user to give a name to whatever
 * they are about to save (loan, investment tracker, etc.).
 *
 * Used by all calculators so the saved item lands in My Loans / My Trackers
 * with a meaningful, user-supplied label instead of an auto-generated one.
 */
export default function SaveNameDialog({ open, onClose, onConfirm, defaultName = '', title, subtitle }: Props) {
    const { t } = useTranslation();
    const c = useAppColors();
    const [name, setName] = useState(defaultName);
    const inputRef = useRef<HTMLInputElement>(null);

    // Re-seed the input every time the dialog opens (so a fresh suggestion shows up
    // when the user changes inputs and saves again).
    useEffect(() => {
        if (open) {
            setName(defaultName);
            // Focus the input shortly after the open animation kicks in
            const tmr = setTimeout(() => inputRef.current?.focus(), 150);
            return () => clearTimeout(tmr);
        }
    }, [open, defaultName]);

    const trimmed = name.trim();
    const canSave = trimmed.length > 0;

    const handleConfirm = () => {
        if (!canSave) return;
        onConfirm(trimmed);
        onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-[10001]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 20 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[10002] w-[88vw] max-w-sm rounded-2xl shadow-2xl"
                        style={{ backgroundColor: c.card, border: `1px solid ${c.border}` }}
                    >
                        <div className="flex items-start justify-between px-5 pt-4 pb-2">
                            <div className="flex-1">
                                <h2 className="text-base font-bold" style={{ color: c.text }}>
                                    {title || t('common.nameThisCalculation', 'Name this calculation')}
                                </h2>
                                <p className="text-[11px] mt-0.5" style={{ color: c.textSecondary }}>
                                    {subtitle || t('common.nameThisCalculationHint', 'Give it a label so you can find it later in My Loans')}
                                </p>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ backgroundColor: c.bg }}>
                                <X size={16} style={{ color: c.textSecondary }} />
                            </button>
                        </div>

                        <div className="px-5 pb-2">
                            <label className="text-[10px] font-bold tracking-wider uppercase block mb-1.5" style={{ color: c.textSecondary }}>
                                {t('common.name', 'Name')}
                            </label>
                            <input
                                ref={inputRef}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
                                placeholder={t('common.namePlaceholder', 'e.g. Daughter\'s education fund')}
                                maxLength={60}
                                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border"
                                style={{ borderColor: c.border, color: c.text, backgroundColor: c.bg }}
                            />
                            <p className="text-[10px] mt-1.5" style={{ color: c.textSecondary }}>
                                {trimmed.length}/60
                            </p>
                        </div>

                        <div className="px-5 pt-2 pb-4 flex gap-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl text-xs font-bold border"
                                style={{ borderColor: c.border, color: c.textSecondary }}
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!canSave}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all ${canSave ? 'bg-violet-600 active:scale-95' : 'bg-slate-500 opacity-50 cursor-not-allowed'}`}
                            >
                                <Save size={14} /> {t('common.save', 'Save')}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
