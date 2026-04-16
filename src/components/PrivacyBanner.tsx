import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function PrivacyBanner() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasAccepted = localStorage.getItem('fincalix_privacy_accepted');
        if (!hasAccepted) {
            // Show banner after a short delay on first use
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('fincalix_privacy_accepted', 'true');
        setIsVisible(false);
    };

    const handleViewPolicy = () => {
        navigate('/privacy-policy');
        setIsVisible(false); // Optionally hide it when they go to read it
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-24 left-0 right-0 z-[9998] p-4 sm:p-6 pointer-events-none flex justify-center"
                >
                    <div className="w-full max-w-md bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl p-4 sm:p-5 pointer-events-auto relative">
                        <button 
                            onClick={() => setIsVisible(false)}
                            className="absolute top-3 right-3 p-1.5 text-muted-foreground hover:bg-white/5 rounded-full transition-colors"
                        >
                            <X size={16} />
                        </button>

                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-brand-purple/20 flex items-center justify-center flex-shrink-0">
                                <ShieldAlert size={20} className="text-brand-purple" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-bold text-foreground mb-1">
                                    {t('privacy:title')}
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                                    {t('privacy:message')}
                                </p>
                                
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={handleViewPolicy}
                                        className="text-xs font-semibold text-brand-purple hover:text-brand-purple/80 transition-colors"
                                    >
                                        {t('privacy:viewPolicy')}
                                    </button>
                                    <button
                                        onClick={handleAccept}
                                        className="flex-1 py-2 px-4 bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-bold rounded-xl transition-colors text-center"
                                    >
                                        {t('privacy:accept')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
