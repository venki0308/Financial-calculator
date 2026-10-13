import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, Share2, CheckCircle2, Phone, Building2, Globe, BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { schemes } from '../data/schemes';
import { useSchemeStore } from '../store/useSchemeStore';
import { useTranslatedScheme } from '../hooks/useTranslatedScheme';
import DisclaimerComponent from '../components/DisclaimerComponent';
import APYContributionCalculator from '../components/APYContributionCalculator';
import { AnalyticsService } from '../lib/analytics';
import { nativeShare } from '../utils/nativeShare';

export default function SchemeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { bookmarkedSchemes, addBookmark, removeBookmark } = useSchemeStore();
    const rawScheme = schemes.find((s) => s.id === id);
    // Rules of Hooks: the hook must run unconditionally — calling it inside a
    // ternary changed the hook count when navigating valid → invalid ids and
    // crashed. Translate a stable fallback when the id is unknown, then drop it.
    const translated = useTranslatedScheme(rawScheme ?? schemes[0]);
    const scheme = rawScheme ? translated : undefined;

    useEffect(() => {
        if (rawScheme) {
            AnalyticsService.trackSchemeViewed(rawScheme.name, rawScheme.governmentLevel);
        }
    }, [rawScheme]);

    if (!scheme) return <div className="flex items-center justify-center min-h-dvh bg-white dark:bg-background text-slate-900 dark:text-foreground"><p>{t('schemes.schemeNotFound')}</p></div>;

    const isBookmarked = bookmarkedSchemes.includes(scheme.id);

    const noIndividualApp = rawScheme!.applicationType === 'No Individual';
    const isServiceAccess = rawScheme!.applicationType === 'Service Access';
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
        <div className="min-h-dvh bg-white dark:bg-background pb-36 animate-fade-in">
            <div className="sticky top-0 z-10 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-border px-4 pt-14 pb-4">
                <div className="flex items-center justify-between mb-3">
                    <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border"><ArrowLeft size={18} className="text-muted-foreground dark:text-muted-foreground" /></button>
                    <div className="flex gap-2">
                        <button onClick={() => isBookmarked ? removeBookmark(scheme.id) : addBookmark(scheme.id)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border">
                            <Bookmark size={18} className={isBookmarked ? 'text-brand-gold fill-brand-gold' : 'text-muted-foreground'} />
                        </button>
                        <button onClick={() => nativeShare(scheme.name, '', window.location.href)} className="p-2 rounded-xl bg-slate-100 dark:bg-card border border-slate-200 dark:border-border"><Share2 size={18} className="text-muted-foreground" /></button>
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
                        // 'New 2026' / 'Updated 2026' style tags carry a year — localise the word, keep the year
                        const yearTag = /^(New|Updated) (\d{4})$/.exec(tag);
                        const label = tagMap[tag] ? t(tagMap[tag]) : yearTag ? t(yearTag[1] === 'New' ? 'schemes.newYear' : 'schemes.updatedYear', { year: yearTag[2] }) : tag;
                        return <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-brand-green/15 text-brand-green">{label}</span>;
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
                    {(() => { const appTypeMap: Record<string, string> = { 'Online Application': 'schemes.appTypeOnline', 'Bank Application': 'schemes.appTypeBank', 'CSC / Offline Application': 'schemes.appTypeCSC', 'Through Government Agency': 'schemes.appTypeGovt', 'Service Access': 'schemes.appTypeService', 'No Individual': 'schemes.appTypeNoIndividual' }; return appTypeMap[scheme.applicationType] ? t(appTypeMap[scheme.applicationType]) : scheme.applicationType; })()}
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
                        <Row label={t('schemes.ministry')} value={scheme.ministry} />
                        {scheme.launchYear && <Row label={t('schemes.launched')} value={String(scheme.launchYear)} />}
                        {scheme.taxBenefit && <Row label={t('schemes.taxBenefit')} value={scheme.taxBenefit} green />}
                    </div>
                </Section>

                <Section title={t('schemes.eligibility')}>
                    {scheme.eligibility.map((e, i) => <CheckItem key={i} text={e} />)}
                </Section>

                <Section title={t('schemes.keyBenefits')}>
                    {scheme.benefits.map((b, i) => <CheckItem key={i} text={b} />)}
                </Section>

                {/* APY-specific contribution calculator. Only this scheme has
                    a fixed-table contribution lookup, so the embedded calc is
                    inlined here rather than building a generic plug system. */}
                {scheme.id === 'c-apy' && <APYContributionCalculator />}

                {/* Conditional sections based on application type */}
                {noIndividualApp ? (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-card border border-slate-200 dark:border-border mb-6">
                        <div className="flex items-start gap-3">
                            <Building2 size={20} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-muted-foreground text-sm font-medium mb-1">{t('schemes.govMission')}</p>
                                <p className="text-muted-foreground dark:text-muted-foreground text-sm">{t('schemes.govMissionDesc')}</p>
                            </div>
                        </div>
                    </div>
                ) : isServiceAccess ? (
                    <>
                        <Section title={t('schemes.accessService')}>
                            {scheme.howToApply.map((h, i) => (
                                <div key={i} className="flex items-start gap-3 mb-2.5">
                                    <span className="w-6 h-6 rounded-full bg-brand-blue/15 flex items-center justify-center flex-shrink-0"><span className="text-xs text-brand-blue font-bold">{i + 1}</span></span>
                                    <span className="text-muted-foreground text-sm">{h}</span>
                                </div>
                            ))}
                        </Section>
                        {scheme.documents.length > 0 && (
                            <Section title={t('schemes.documentsRequired')}>
                                {scheme.documents.map((d, i) => (
                                    <div key={i} className="flex items-start gap-3 mb-2">
                                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-card border border-slate-200 dark:border-border flex items-center justify-center flex-shrink-0"><span className="text-xs text-muted-foreground font-medium">{i + 1}</span></span>
                                        <span className="text-muted-foreground text-sm">{d}</span>
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
                                    <span className="text-muted-foreground text-sm">{d}</span>
                                </div>
                            ))}
                        </Section>
                        <Section title={t('schemes.howToApply')}>
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-200 text-sm mb-3 flex items-center gap-2">
                                <Building2 size={16} className="flex-shrink-0" />
                                {t('schemes.applyBank')}
                            </div>
                            {scheme.howToApply.map((h, i) => (
                                <div key={i} className="flex items-start gap-3 mb-2.5">
                                    <span className="w-6 h-6 rounded-full bg-brand-green/15 flex items-center justify-center flex-shrink-0"><span className="text-xs text-brand-green font-bold">{i + 1}</span></span>
                                    <span className="text-muted-foreground text-sm">{h}</span>
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
                                        <span className="text-muted-foreground text-sm">{d}</span>
                                    </div>
                                ))}
                            </Section>
                        )}
                        <Section title={t('schemes.howToApply')}>
                            {isGovtAgency && (
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-card border border-slate-200 dark:border-border text-slate-600 dark:text-muted-foreground text-sm mb-3 flex items-center gap-2">
                                    <Building2 size={16} className="flex-shrink-0" />
                                    {t('schemes.govAgencies')}
                                </div>
                            )}
                            {scheme.howToApply.map((h, i) => (
                                <div key={i} className="flex items-start gap-3 mb-2.5">
                                    <span className="w-6 h-6 rounded-full bg-brand-green/15 flex items-center justify-center flex-shrink-0"><span className="text-xs text-brand-green font-bold">{i + 1}</span></span>
                                    <span className="text-muted-foreground text-sm">{h}</span>
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
                <DisclaimerComponent module="schemes" />

                {/* Verification Badge */}
                {scheme.lastVerified && (() => {
                    // Age-aware badge: scheme data older than ~4 months turns amber and asks the user to re-check
                    const ageMonths = Math.floor((Date.now() - new Date(scheme.lastVerified).getTime()) / (30.44 * 86400000));
                    const stale = ageMonths > 4;
                    return (
                    <div className={`p-3 rounded-xl border mb-8 ${stale ? 'bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/15' : 'bg-green-50 dark:bg-brand-green/5 border-green-200 dark:border-brand-green/15'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <BadgeCheck size={16} className={`flex-shrink-0 ${stale ? 'text-amber-600' : 'text-brand-green'}`} />
                            <span className={`font-semibold text-[12px] ${stale ? 'text-amber-600' : 'text-brand-green'}`}>{stale ? t('schemes.verifiedAgeWarn', { months: ageMonths }) : t('schemes.verifiedSource')}</span>
                        </div>
                        <p className="text-muted-foreground dark:text-muted-foreground text-[11px] leading-relaxed pl-6">
                            {t('schemes.lastVerified')}: {new Date(scheme.lastVerified).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {scheme.verifiedSource && <> · {t('schemes.source')}: <a href={`https://${scheme.verifiedSource}`} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline">{scheme.verifiedSource}</a></>}
                        </p>
                        <p className="text-muted-foreground text-[10px] mt-1 pl-6 italic">{t('schemes.alwaysCheck')}</p>
                    </div>
                    );
                })()}
            </div>



        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return <section className="mb-6"><h2 className="text-base font-semibold text-slate-900 dark:text-foreground mb-3">{title}</h2>{children}</section>;
}
function CheckItem({ text }: { text: string }) {
    return <div className="flex items-start gap-3 mb-2"><CheckCircle2 size={16} className="text-brand-green mt-0.5 flex-shrink-0" /><span className="text-muted-foreground text-sm">{text}</span></div>;
}
function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
    return <div className="flex items-start gap-2"><span className="text-muted-foreground text-xs font-medium min-w-[70px]">{label}</span><span className={`text-xs ${green ? 'text-brand-green font-medium' : 'text-muted-foreground'}`}>{value}</span></div>;
}

