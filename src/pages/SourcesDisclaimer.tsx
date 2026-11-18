// Settings → About → Sources & Disclaimer: FinCalix is not a government app, and the official
// sources behind its rules and rates (src/data/officialSources.ts), each opening in the in-app browser.
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { OFFICIAL_SOURCES } from '../data/officialSources';
import { OfficialLink } from '../components/OfficialSources';

export default function SourcesDisclaimer() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    return (
        <div className="min-h-dvh bg-background animate-fade-in" data-sources-screen>
            <div className="px-4 pt-14 pb-8">
                <div className="flex items-center gap-3 mb-5">
                    <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 rounded-xl bg-card border border-border"><ArrowLeft size={18} className="text-muted-foreground" /></button>
                    <h1 className="text-xl font-bold text-foreground">{t('sources.title', 'Sources & Disclaimer')}</h1>
                </div>

                <div data-govt-notice className="rounded-2xl border border-amber-300/60 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800 p-4 mb-5 flex gap-3">
                    <ShieldAlert size={20} className="shrink-0 mt-0.5" aria-hidden />
                    <p className="text-sm font-semibold leading-snug">{t('sources.notGovt', 'FinCalix is not a government app and does not represent any government entity.')}</p>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{t('sources.intro')}</p>

                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-3">{t('sources.listTitle', 'Official sources')}</p>
                <ul className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
                    {OFFICIAL_SOURCES.map((s, i) => (
                        <li key={s.id} data-source-id={s.id} className={`p-4 ${i ? 'border-t border-border' : ''}`}>
                            <p className="text-foreground font-medium text-sm">{s.name}</p>
                            <p className="text-muted-foreground text-xs mt-0.5">{t(`sources.purpose.${s.id}`)}</p>
                            <p className="text-sm mt-1.5"><OfficialLink url={s.url}>{s.host}</OfficialLink></p>
                        </li>
                    ))}
                </ul>

                <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest mb-3">{t('sources.disclaimerTitle', 'Disclaimer')}</p>
                <div className="bg-card border border-border rounded-2xl p-4">
                    <p className="text-sm text-foreground leading-relaxed">{t('sources.disclaimerBody')}</p>
                </div>
            </div>
        </div>
    );
}
