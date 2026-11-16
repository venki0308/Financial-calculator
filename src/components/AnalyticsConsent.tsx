/**
 * AnalyticsConsent — asks once whether optional usage analytics may run.
 *
 *  - Shown to every user whose choice is not stored yet: new installs (after
 *    the disclaimer) and existing users on their first launch of this version.
 *  - Until a button is pressed analytics stay off: nothing is loaded from
 *    Google and nothing is sent (see services/analyticsService).
 *  - "Allow" and "No thanks" are the same size and style, and neither is
 *    pre-selected. There is no close button: the dialog needs an answer.
 *  - Hidden on the privacy pages so the policy can be read before choosing.
 * All colours come from theme tokens (light + dark).
 */
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, Check, X } from 'lucide-react';
import { AnalyticsService } from '../services/analyticsService';
import {
    ANALYTICS_CONSENT_EVENT,
    DISCLAIMER_ACCEPTED_EVENT,
    DISCLAIMER_KEY,
    getAnalyticsConsent,
} from '../utils/analyticsConsent';

const POLICY_ROUTES = ['/privacy-policy', '/data-safety', '/terms-of-service'];

function shouldAsk(): boolean {
    try {
        return getAnalyticsConsent() === null && localStorage.getItem(DISCLAIMER_KEY) === 'true';
    } catch {
        return false;
    }
}

export default function AnalyticsConsent() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [asking, setAsking] = useState(shouldAsk);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const refresh = () => setAsking(shouldAsk());
        window.addEventListener(DISCLAIMER_ACCEPTED_EVENT, refresh);
        window.addEventListener(ANALYTICS_CONSENT_EVENT, refresh);
        return () => {
            window.removeEventListener(DISCLAIMER_ACCEPTED_EVENT, refresh);
            window.removeEventListener(ANALYTICS_CONSENT_EVENT, refresh);
        };
    }, []);

    if (!asking || POLICY_ROUTES.includes(location.pathname)) return null;

    const choose = async (granted: boolean) => {
        if (busy) return;
        setBusy(true);
        try {
            await AnalyticsService.setConsent(granted);
        } finally {
            setBusy(false);
            setAsking(false);
        }
    };

    // One style for both answers — equal visual weight.
    const choiceClass =
        'flex-1 rounded-xl border border-border bg-background py-3 text-sm font-semibold text-foreground active:opacity-80 disabled:opacity-60';

    return (
        <div
            className="fixed inset-0 z-[10001] flex items-end justify-center bg-background/80 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-consent-title"
        >
            <div className="flex max-h-[88vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
                <div className="overflow-y-auto p-5">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15">
                            <BarChart3 size={20} className="text-primary" />
                        </div>
                        <h2 id="analytics-consent-title" className="text-base font-bold text-foreground">
                            {t('consent.title', 'Share usage statistics?')}
                        </h2>
                    </div>

                    <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                        {t('consent.body', 'FinCalix works fully without this. If you allow it, the app sends usage statistics to Google Analytics to help us improve it.')}
                    </p>

                    <p className="mb-1.5 text-xs font-semibold text-foreground">
                        {t('consent.sentTitle', 'What is sent if you allow')}
                    </p>
                    <ul className="mb-4 space-y-1.5">
                        {[
                            t('consent.sent1', 'Which screens and calculators you open'),
                            t('consent.sent2', 'When you view a government scheme, change language, or export a PDF or Excel file'),
                            t('consent.sent3', 'A random app ID, plus device details: screen size, language, OS or browser version, and approximate country'),
                        ].map((line) => (
                            <li key={line} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                                <Check size={14} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                                <span>{line}</span>
                            </li>
                        ))}
                    </ul>

                    <p className="mb-1.5 text-xs font-semibold text-foreground">
                        {t('consent.neverTitle', 'Never sent')}
                    </p>
                    <p className="mb-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                        <X size={14} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <span>{t('consent.never', 'Amounts, salary, loans, expenses, or anything you type.')}</span>
                    </p>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                        {t('consent.change', 'You can change this any time in Settings → Privacy.')}
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/privacy-policy')}
                        className="mt-2 text-xs font-semibold text-primary underline underline-offset-2"
                    >
                        {t('consent.policy', 'Read the privacy policy')}
                    </button>
                </div>

                <div className="flex gap-3 border-t border-border p-4">
                    <button type="button" disabled={busy} onClick={() => choose(false)} className={choiceClass}>
                        {t('consent.deny', 'No thanks')}
                    </button>
                    <button type="button" disabled={busy} onClick={() => choose(true)} className={choiceClass}>
                        {t('consent.allow', 'Allow')}
                    </button>
                </div>
            </div>
        </div>
    );
}
