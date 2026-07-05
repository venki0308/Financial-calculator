import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Gavel } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TermsOfService() {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const sections = [
        {
            num: 1,
            title: t('termsOfService.sec1Title'),
            body: t('termsOfService.sec1Body'),
            accent: '#3B82F6',
        },
        {
            num: 2,
            title: t('termsOfService.sec2Title'),
            body: t('termsOfService.sec2Body'),
            accent: '#8B5CF6',
        },
        {
            num: 3,
            title: t('termsOfService.sec3Title'),
            body: t('termsOfService.sec3Body'),
            accent: '#22C55E',
        },
        {
            num: 4,
            title: t('termsOfService.sec4Title'),
            body: t('termsOfService.sec4Body'),
            accent: '#F59E0B',
        },
        {
            num: 5,
            title: t('termsOfService.sec5Title'),
            body: t('termsOfService.sec5Body'),
            accent: '#EC4899',
        },
    ];

    return (
        <div className="min-h-dvh bg-background pb-10 animate-fade-in" style={{ maxWidth: 428, margin: '0 auto' }}>
            {/* ─── Header ─── */}
            <div className="sticky top-0 z-10 bg-background  px-4 pt-14 pb-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-card border border-border">
                        <ArrowLeft size={18} className="text-muted-foreground" />
                    </button>
                    <h1 className="text-lg font-bold text-foreground">{t('termsOfService.title')}</h1>
                </div>
            </div>

            <div className="px-5 mt-6 space-y-6">
                {/* ─── Section Label (formerly banner card) ─── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5"
                >
                    <Gavel size={16} className="text-brand-gold" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{t('termsOfService.usageAgreement')}</span>
                </motion.div>

                {/* ─── Sections ─── */}
                {sections.map((sec, idx) => (
                    <motion.section
                        key={sec.num}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.1 * idx }}
                        className="space-y-2.5"
                    >
                        <div className="flex items-center gap-3">
                            <span
                                className="flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold text-foreground flex-shrink-0"
                                style={{ background: sec.accent }}
                            >
                                {sec.num}
                            </span>
                            <h2 className="text-foreground font-bold text-sm">{sec.title}</h2>
                        </div>
                        <p className="text-muted-foreground text-xs leading-relaxed pl-10">{sec.body}</p>

                        {/* Divider (except after last) */}
                        {idx < sections.length - 1 && (
                            <div className="pt-2">
                                <div className="h-px bg-border" />
                            </div>
                        )}
                    </motion.section>
                ))}

                {/* ─── Acceptance + Last Updated ─── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="pt-6 space-y-4"
                >
                    <div className="h-px bg-border" />
                    <p className="text-muted-foreground text-xs leading-relaxed">
                        {t('termsOfService.acceptance')}
                    </p>
                    <div className="flex justify-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border text-[10px] text-muted-foreground font-medium">
                            {t('termsOfService.lastUpdated')}
                        </span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
