import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Share2, CheckCircle2, ExternalLink, AlertCircle, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { schemes } from '../data/schemes';
import { useSchemeStore } from '../store/useSchemeStore';
import { useAuthStore } from '../store/useAuthStore';
import DisclaimerBanner from '../components/DisclaimerBanner';

export default function SchemeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { bookmarkedSchemes, addBookmark, removeBookmark } = useSchemeStore();
    const hasPremium = useAuthStore((s) => s.hasPremium);
    const isAdmin = useAuthStore((s) => s.isAdmin());
    const canAccessAll = hasPremium || isAdmin;
    const scheme = schemes.find((s) => s.id === id);

    if (!scheme) return <div className="flex items-center justify-center min-h-dvh bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white"><p>{t('schemes.schemeNotFound')}</p></div>;

    // Guard: state schemes require premium (unless admin)
    if (scheme.governmentLevel === 'state' && !canAccessAll) {
        navigate('/schemes', { replace: true });
        return null;
    }

    const isBookmarked = bookmarkedSchemes.includes(scheme.id);

    return (
        <div className="min-h-dvh bg-white dark:bg-[#0F172A] pb-28 animate-fade-in">
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-lg border-b border-slate-200 dark:border-dark-border px-4 pt-14 pb-4">
                <div className="flex items-center justify-between mb-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border"><ArrowLeft size={18} className="text-slate-500 dark:text-slate-400" /></button>
                    <div className="flex gap-2">
                        <button onClick={() => isBookmarked ? removeBookmark(scheme.id) : addBookmark(scheme.id)} className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border">
                            <Bookmark size={18} className={isBookmarked ? 'text-brand-gold fill-brand-gold' : 'text-slate-400'} />
                        </button>
                        <button className="p-2 rounded-xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border"><Share2 size={18} className="text-slate-400" /></button>
                    </div>
                </div>
                <div className="flex gap-1.5 mb-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${scheme.governmentLevel === 'central' ? 'bg-brand-blue/15 text-brand-blue' : 'bg-brand-purple/15 text-brand-purple'}`}>
                        {scheme.governmentLevel === 'central' ? t('schemes.centralGovt') : `${t('schemes.state')}: ${scheme.state}`}
                    </span>
                    {scheme.tags.map((tag) => {
                        const tagMap: Record<string, string> = { 'New': 'schemes.new', 'Popular': 'schemes.popular', 'Verified': 'schemes.verified' };
                        return <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-brand-green/15 text-brand-green">{tagMap[tag] ? t(tagMap[tag]) : tag}</span>;
                    })}
                </div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">{scheme.name}</h1>
            </div>

            <DisclaimerBanner type="scheme" />

            <div className="px-4 mt-5">
                {/* Key Info */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {scheme.interestRate && <div className="p-4 rounded-2xl bg-brand-green/10 border border-brand-green/20"><p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('schemes.interestRate')}</p><p className="text-xl font-bold text-brand-green mt-1">{scheme.interestRate}</p></div>}
                    {scheme.benefitAmount && <div className="p-4 rounded-2xl bg-brand-green/10 border border-brand-green/20"><p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('schemes.benefit')}</p><p className="text-xl font-bold text-brand-green mt-1">{scheme.benefitAmount}</p></div>}
                    {scheme.tenure && <div className="p-4 rounded-2xl bg-brand-blue/10 border border-brand-blue/20"><p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('schemes.tenure')}</p><p className="text-xl font-bold text-brand-blue mt-1">{scheme.tenure}</p></div>}
                    {scheme.minAmount && <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border"><p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('schemes.minAmount')}</p><p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{scheme.minAmount}</p></div>}
                    {scheme.maxAmount && <div className="p-4 rounded-2xl bg-slate-50 dark:bg-dark-card border border-slate-200 dark:border-dark-border"><p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('schemes.maxAmount')}</p><p className="text-lg font-bold text-slate-900 dark:text-white mt-1">{scheme.maxAmount}</p></div>}
                </div>

                {/* About */}
                <Section title={t('schemes.aboutScheme')}>
                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{scheme.description}</p>
                    <div className="mt-3 space-y-1.5">
                        <Row label={t('schemes.ministry')} value={scheme.ministry} />
                        {scheme.taxBenefit && <Row label={t('schemes.taxBenefit')} value={scheme.taxBenefit} green />}
                    </div>
                </Section>

                <Section title={t('schemes.eligibility')}>
                    {scheme.eligibility.map((e, i) => <CheckItem key={i} text={e} />)}
                </Section>

                <Section title={t('schemes.keyBenefits')}>
                    {scheme.benefits.map((b, i) => <CheckItem key={i} text={b} />)}
                </Section>

                <Section title={t('schemes.documentsRequired')}>
                    {scheme.documents.map((d, i) => (
                        <div key={i} className="flex items-start gap-3 mb-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border flex items-center justify-center flex-shrink-0"><span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{i + 1}</span></span>
                            <span className="text-slate-700 dark:text-slate-300 text-sm">{d}</span>
                        </div>
                    ))}
                </Section>

                <Section title={t('schemes.howToApply')}>
                    {scheme.howToApply.map((h, i) => (
                        <div key={i} className="flex items-start gap-3 mb-2.5">
                            <span className="w-6 h-6 rounded-full bg-brand-green/15 flex items-center justify-center flex-shrink-0"><span className="text-xs text-brand-green font-bold">{i + 1}</span></span>
                            <span className="text-slate-700 dark:text-slate-300 text-sm">{h}</span>
                        </div>
                    ))}
                </Section>

                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200 text-[11px] leading-relaxed mb-4 italic">
                    ⚠️ {t('schemes.disclaimerNote')}
                </div>

                {/* Verification Badge */}
                {scheme.lastVerified && (
                    <div className="p-3 rounded-xl bg-green-50 dark:bg-brand-green/5 border border-green-200 dark:border-brand-green/15 mb-8">
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                            ✓ <span className="text-brand-green font-medium">{t('schemes.verifiedOn')}:</span>{' '}
                            {new Date(scheme.lastVerified).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {scheme.officialWebsite && <> &middot; <a href={scheme.officialWebsite} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">{new URL(scheme.officialWebsite).hostname}</a></>}
                        </p>
                        <p className="text-slate-400 dark:text-slate-600 text-[10px] mt-1 italic">{t('schemes.alwaysCheck')}</p>
                    </div>
                )}
            </div>

            {/* Sticky buttons */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-lg border-t border-slate-200 dark:border-dark-border p-4 flex gap-3">
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({
                                title: scheme.name,
                                text: `Check out the ${scheme.name} on FinCalix`,
                                url: window.location.href
                            });
                        }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-100 dark:bg-dark-card border border-slate-200 dark:border-dark-border text-slate-700 dark:text-slate-300 font-semibold text-sm"
                >
                    <Share2 size={18} /> {t('schemes.share')}
                </motion.button>
                <motion.a whileTap={{ scale: 0.97 }} href={scheme.officialWebsite} target="_blank" rel="noopener noreferrer"
                    className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-green text-white font-semibold text-sm shadow-lg shadow-brand-green/20">
                    {t('schemes.verifyOfficial')} <ExternalLink size={18} />
                </motion.a>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return <section className="mb-6"><h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">{title}</h2>{children}</section>;
}
function CheckItem({ text }: { text: string }) {
    return <div className="flex items-start gap-3 mb-2"><CheckCircle2 size={16} className="text-brand-green mt-0.5 flex-shrink-0" /><span className="text-slate-700 dark:text-slate-300 text-sm">{text}</span></div>;
}
function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
    return <div className="flex items-start gap-2"><span className="text-slate-500 text-xs font-medium min-w-[70px]">{label}</span><span className={`text-xs ${green ? 'text-brand-green font-medium' : 'text-slate-700 dark:text-slate-300'}`}>{value}</span></div>;
}
