import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Share2, CheckCircle2, ExternalLink, Phone, Building2, Globe, BadgeCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { schemes } from '../data/schemes';
import { useSchemeStore } from '../store/useSchemeStore';
import DisclaimerComponent from '../components/DisclaimerComponent';
import { AnalyticsService } from '../lib/analytics';
import { nativeShare } from '../utils/nativeShare';

export default function SchemeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { bookmarkedSchemes, addBookmark, removeBookmark } = useSchemeStore();
    const scheme = schemes.find((s) => s.id === id);

    useEffect(() => {
        if (scheme) {
            AnalyticsService.trackSchemeViewed(scheme.name, scheme.governmentLevel);
        }
    }, [scheme]);

    if (!scheme) return <div className="flex items-center justify-center min-h-dvh bg-white dark:bg-background text-slate-900 dark:text-foreground"><p>{t('schemes.schemeNotFound')}</p></div>;

    const isBookmarked = bookmarkedSchemes.includes(scheme.id);

    const noIndividualApp = scheme.applicationType === 'No Individual';
    const isServiceAccess = scheme.applicationType === 'Service Access';
    const isBankApp = scheme.applicationType === 'Bank Application';
    const isOnlineApp = scheme.applicationType === 'Online Application';
    const isGovtAgency = scheme.applicationType === 'Through Government Agency';
    const isCSCOffline = scheme.applicationType === 'CSC / Offline Application';

    // Application type label color
    const appTypeColor = noIndividualApp
        ? 'bg-slate-100 dark:bg-card border-border text-muted-foreground dark:text-muted-foreground'
        : isServiceAccess
            ? 'bg-brand-blue/15 text-brand-blue'
            : isOnlineApp
                ? 'bg-brand-green/15 text-brand-green'
                : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400';

    return (
        <div className="min-h-dvh bg-white dark:bg-background pb-28 animate-fade-in">
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-lg border-b border-slate-200 dark:border-border px-4 pt-14 pb-4">
                <div className="flex items-center justify-between mb-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border"><ArrowLeft size={18} className="text-muted-foreground dark:text-muted-foreground" /></button>
                    <div className="flex gap-2">
                        <button onClick={() => isBookmarked ? removeBookmark(scheme.id) : addBookmark(scheme.id)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <Bookmark size={18} className={isBookmarked ? 'text-brand-gold fill-brand-gold' : 'text-muted-foreground'} />
                        </button>
                        <button onClick={() => nativeShare(scheme.name, `Check out the ${scheme.name} on FinCalix`, window.location.href)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border"><Share2 size={18} className="text-muted-foreground" /></button>
                    </div>
                </div>
                <div className="flex gap-1.5 flex-wrap mb-2">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${scheme.governmentLevel === 'central' ? 'bg-brand-blue/15 text-brand-blue' : 'bg-brand-purple/15 text-brand-purple'}`}>
                        {scheme.governmentLevel === 'central' ? t('schemes.centralGovt') : `${t('schemes.state')}: ${scheme.state}`}
                    </span>
                    {scheme.schemeCategory && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-brand-purple/15 text-brand-purple">{scheme.schemeCategory}</span>
                    )}
                    {scheme.tags.map((tag) => {
                        const tagMap: Record<string, string> = { 'New': 'schemes.new', 'Popular': 'schemes.popular', 'Verified': 'schemes.verified' };
                        return <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-brand-green/15 text-brand-green">{tagMap[tag] ? t(tagMap[tag]) : tag}</span>;
                    })}
                </div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-foreground">{scheme.name}</h1>
            </div>


            <div className="px-4 mt-5">

                {/* Application Type Badge */}
                <div className={`mb-4 px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-medium ${appTypeColor}`}>
                    {isOnlineApp && <Globe size={14} />}
                    {isBankApp && <Building2 size={14} />}
                    {isServiceAccess && <Phone size={14} />}
                    {(noIndividualApp || isGovtAgency || isCSCOffline) && <Building2 size={14} />}
                    {scheme.applicationType}
                </div>

                {/* Key Info Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {scheme.interestRate && <div className="p-4 rounded-2xl bg-brand-green/10 border border-brand-green/20"><p className="text-[11px] text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">{t('schemes.interestRate')}</p><p className="text-xl font-bold text-brand-green mt-1">{scheme.interestRate}</p></div>}
                    {scheme.benefitAmount && <div className="p-4 rounded-2xl bg-brand-green/10 border border-brand-green/20"><p className="text-[11px] text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">{t('schemes.benefit')}</p><p className="text-base font-bold text-brand-green mt-1">{scheme.benefitAmount}</p></div>}
                    {scheme.tenure && <div className="p-4 rounded-2xl bg-brand-blue/10 border border-brand-blue/20"><p className="text-[11px] text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">{t('schemes.tenure')}</p><p className="text-xl font-bold text-brand-blue mt-1">{scheme.tenure}</p></div>}
                    {scheme.minAmount && <div className="p-4 rounded-2xl bg-slate-50 dark:bg-card border border-slate-200 dark:border-border"><p className="text-[11px] text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">{t('schemes.minAmount')}</p><p className="text-lg font-bold text-slate-900 dark:text-foreground mt-1">{scheme.minAmount}</p></div>}
                    {scheme.maxAmount && <div className="p-4 rounded-2xl bg-slate-50 dark:bg-card border border-slate-200 dark:border-border"><p className="text-[11px] text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">{t('schemes.maxAmount')}</p><p className="text-lg font-bold text-slate-900 dark:text-foreground mt-1">{scheme.maxAmount}</p></div>}
                </div>

                {/* About */}
                <Section title={t('schemes.aboutScheme')}>
                    <p className="text-muted-foreground dark:text-muted-foreground text-sm leading-relaxed">{scheme.description}</p>
                    <div className="mt-3 space-y-1.5">
                        <Row label="Ministry" value={scheme.ministry} />
                        {scheme.launchYear && <Row label="Launched" value={String(scheme.launchYear)} />}
                        {scheme.taxBenefit && <Row label={t('schemes.taxBenefit')} value={scheme.taxBenefit} green />}
                    </div>
                </Section>

                <Section title={t('schemes.eligibility')}>
                    {scheme.eligibility.map((e, i) => <CheckItem key={i} text={e} />)}
                </Section>

                <Section title={t('schemes.keyBenefits')}>
                    {scheme.benefits.map((b, i) => <CheckItem key={i} text={b} />)}
                </Section>

                {/* Conditional sections based on application type */}
                {noIndividualApp ? (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-card border border-slate-200 dark:border-border mb-6">
                        <div className="flex items-start gap-3">
                            <Building2 size={20} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-slate-700 dark:text-slate-300 text-sm font-medium mb-1">Government Mission — No Individual Application</p>
                                <p className="text-muted-foreground dark:text-muted-foreground text-sm">This program is implemented by government agencies and does not require individual application. Citizens benefit through government-delivered services and infrastructure.</p>
                            </div>
                        </div>
                    </div>
                ) : isServiceAccess ? (
                    <>
                        <Section title="Access Service">
                            {scheme.howToApply.map((h, i) => (
                                <div key={i} className="flex items-start gap-3 mb-2.5">
                                    <span className="w-6 h-6 rounded-full bg-brand-blue/15 flex items-center justify-center flex-shrink-0"><span className="text-xs text-brand-blue font-bold">{i + 1}</span></span>
                                    <span className="text-slate-700 dark:text-slate-300 text-sm">{h}</span>
                                </div>
                            ))}
                        </Section>
                        {scheme.documents.length > 0 && (
                            <Section title={t('schemes.documentsRequired')}>
                                {scheme.documents.map((d, i) => (
                                    <div key={i} className="flex items-start gap-3 mb-2">
                                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-card border border-slate-200 dark:border-border flex items-center justify-center flex-shrink-0"><span className="text-xs text-muted-foreground font-medium">{i + 1}</span></span>
                                        <span className="text-slate-700 dark:text-slate-300 text-sm">{d}</span>
                                    </div>
                                ))}
                            </Section>
                        )}
                    </>
                ) : isBankApp ? (
                    <>
                        <Section title={t('schemes.documentsRequired')}>
                            {scheme.documents.map((d, i) => (
                                <div key={i} className="flex items-start gap-3 mb-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-card border border-slate-200 dark:border-border flex items-center justify-center flex-shrink-0"><span className="text-xs text-muted-foreground font-medium">{i + 1}</span></span>
                                    <span className="text-slate-700 dark:text-slate-300 text-sm">{d}</span>
                                </div>
                            ))}
                        </Section>
                        <Section title={t('schemes.howToApply')}>
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200 text-sm mb-3 flex items-center gap-2">
                                <Building2 size={16} className="flex-shrink-0" />
                                Apply through your bank or financial institution
                            </div>
                            {scheme.howToApply.map((h, i) => (
                                <div key={i} className="flex items-start gap-3 mb-2.5">
                                    <span className="w-6 h-6 rounded-full bg-brand-green/15 flex items-center justify-center flex-shrink-0"><span className="text-xs text-brand-green font-bold">{i + 1}</span></span>
                                    <span className="text-slate-700 dark:text-slate-300 text-sm">{h}</span>
                                </div>
                            ))}
                        </Section>
                    </>
                ) : (
                    <>
                        {scheme.documents.length > 0 && (
                            <Section title={t('schemes.documentsRequired')}>
                                {scheme.documents.map((d, i) => (
                                    <div key={i} className="flex items-start gap-3 mb-2">
                                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-card border border-slate-200 dark:border-border flex items-center justify-center flex-shrink-0"><span className="text-xs text-muted-foreground font-medium">{i + 1}</span></span>
                                        <span className="text-slate-700 dark:text-slate-300 text-sm">{d}</span>
                                    </div>
                                ))}
                            </Section>
                        )}
                        <Section title={t('schemes.howToApply')}>
                            {isGovtAgency && (
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-card border border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground text-sm mb-3 flex items-center gap-2">
                                    <Building2 size={16} className="flex-shrink-0" />
                                    Implemented through government agencies
                                </div>
                            )}
                            {scheme.howToApply.map((h, i) => (
                                <div key={i} className="flex items-start gap-3 mb-2.5">
                                    <span className="w-6 h-6 rounded-full bg-brand-green/15 flex items-center justify-center flex-shrink-0"><span className="text-xs text-brand-green font-bold">{i + 1}</span></span>
                                    <span className="text-slate-700 dark:text-slate-300 text-sm">{h}</span>
                                </div>
                            ))}
                        </Section>
                    </>
                )}

                {/* Notes */}
                {scheme.notes && (
                    <div className="p-3 rounded-xl bg-brand-blue/5 border border-brand-blue/15 text-slate-600 dark:text-muted-foreground text-[12px] mb-4 italic">
                        📌 {scheme.notes}
                    </div>
                )}

                {/* Disclaimer */}
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200 text-[11px] leading-relaxed mb-4 italic">
                    ⚠️ {t('schemes.disclaimerNote')}
                </div>

                {/* Verification Badge */}
                {scheme.lastVerified && (
                    <div className="p-3 rounded-xl bg-green-50 dark:bg-brand-green/5 border border-green-200 dark:border-brand-green/15 mb-8">
                        <div className="flex items-center gap-2 mb-1">
                            <BadgeCheck size={16} className="text-brand-green flex-shrink-0" />
                            <span className="text-brand-green font-semibold text-[12px]">Verified from official Government of India sources</span>
                        </div>
                        <p className="text-muted-foreground dark:text-muted-foreground text-[11px] leading-relaxed pl-6">
                            Last verified: {new Date(scheme.lastVerified).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {scheme.verifiedSource && <> · Source: <a href={`https://${scheme.verifiedSource}`} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">{scheme.verifiedSource}</a></>}
                        </p>
                        <p className="text-muted-foreground dark:text-slate-600 text-[10px] mt-1 pl-6 italic">{t('schemes.alwaysCheck')}</p>
                    </div>
                )}
            </div>

            <DisclaimerComponent module="government" />

            {/* Sticky bottom buttons */}
            <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-lg border-t border-slate-200 dark:border-border p-4 flex gap-3">
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => nativeShare(scheme.name, `Check out the ${scheme.name} on FinCalix`, window.location.href)}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border text-slate-700 dark:text-slate-300 font-semibold text-sm"
                >
                    <Share2 size={18} /> {t('schemes.share')}
                </motion.button>

                {noIndividualApp ? (
                    <div className="flex-[2] flex items-center justify-center py-3.5 rounded-2xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border text-muted-foreground text-sm font-medium">
                        No Application Required
                    </div>
                ) : isServiceAccess ? (
                    <motion.a whileTap={{ scale: 0.97 }} href={scheme.officialWebsite} target="_blank" rel="noopener noreferrer"
                        className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-blue text-white font-semibold text-sm shadow-lg shadow-brand-blue/20">
                        <Phone size={18} /> Access Service <ExternalLink size={14} />
                    </motion.a>
                ) : (
                    <motion.a whileTap={{ scale: 0.97 }} href={scheme.officialWebsite} target="_blank" rel="noopener noreferrer"
                        className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-brand-green text-white font-semibold text-sm shadow-lg shadow-brand-green/20">
                        {isBankApp ? 'Apply at Bank' : 'Apply Now'} <ExternalLink size={18} />
                    </motion.a>
                )}
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return <section className="mb-6"><h2 className="text-base font-semibold text-slate-900 dark:text-foreground mb-3">{title}</h2>{children}</section>;
}
function CheckItem({ text }: { text: string }) {
    return <div className="flex items-start gap-3 mb-2"><CheckCircle2 size={16} className="text-brand-green mt-0.5 flex-shrink-0" /><span className="text-slate-700 dark:text-slate-300 text-sm">{text}</span></div>;
}
function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
    return <div className="flex items-start gap-2"><span className="text-muted-foreground text-xs font-medium min-w-[70px]">{label}</span><span className={`text-xs ${green ? 'text-brand-green font-medium' : 'text-slate-700 dark:text-slate-300'}`}>{value}</span></div>;
}
