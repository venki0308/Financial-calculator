import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Lock, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PremiumModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPurchase: () => void;
}

export default function PremiumModal({ isOpen, onClose, onPurchase }: PremiumModalProps) {
    const { t } = useTranslation();

    const features = [
        t('premium.feature1'),
        t('premium.feature2'),
        t('premium.feature3'),
        t('premium.feature4'),
        t('premium.feature5'),
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 z-[100]"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-slate-800 border-2 border-slate-600 rounded-2xl w-full max-w-sm shadow-2xl pointer-events-auto overflow-hidden">
                            {/* Close */}
                            <div className="flex justify-end p-3 pb-0">
                                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            {/* Header */}
                            <div className="text-center px-6 pb-4">
                                <div className="w-16 h-16 mx-auto mb-3 bg-amber-500/20 rounded-full flex items-center justify-center">
                                    <Lock size={32} className="text-amber-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-1">{t('premium.title')}</h2>
                                <p className="text-slate-400 text-sm">{t('premium.subtitle')}</p>
                            </div>

                            {/* Price Card */}
                            <div className="mx-6 mb-4 p-5 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-700">
                                <div className="text-center mb-4">
                                    <span className="text-amber-100 text-xs uppercase tracking-wider">{t('premium.oneTimePayment')}</span>
                                    <div className="text-5xl font-bold text-white my-1">₹75</div>
                                    <span className="text-amber-100 text-xs">{t('premium.lifetimeAccess')}</span>
                                </div>

                                <div className="space-y-2.5">
                                    {features.map((item) => (
                                        <div key={item} className="flex items-start gap-2">
                                            <Check size={16} className="text-amber-200 shrink-0 mt-0.5" />
                                            <span className="text-white text-sm">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="px-6 pb-6 space-y-2">
                                <button
                                    onClick={onPurchase}
                                    className="w-full py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-base transition-colors shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2"
                                >
                                    <Star size={18} /> {t('premium.unlockFor')}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 rounded-xl text-slate-400 hover:text-white text-sm font-medium transition-colors"
                                >
                                    {t('premium.maybeLater')}
                                </button>
                            </div>

                            {/* Security */}
                            <div className="px-6 pb-4 text-center">
                                <p className="text-slate-500 text-[10px]">{t('premium.securePayment')}</p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
