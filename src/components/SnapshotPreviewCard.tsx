/**
 * SnapshotPreviewCard — non-time-based equivalent of LiveLoanStatus.
 *
 * Used by snapshot calculators where the value doesn't accrete over time
 * but the user still wants a rich preview card before saving:
 *  - CAGR              (return-rate calculation)
 *  - Gratuity          (one-time payout at retirement)
 *  - Insurance         (premium quote)
 *  - Insurance Compare (premium A vs B)
 *  - Overdraft         (interest on a credit line, fixed period)
 *
 * Renders a 3-section UI styled like LiveInvestmentTracker so the
 * experience feels consistent across all 13 calculators:
 *  1. Headline       — primary outcome (e.g. "Gratuity ₹X")
 *  2. Key Metrics    — 3 colored cards
 *  3. Snapshot Date  — when this preview was computed
 *
 * Component is purely presentational. Parent owns the date state.
 */

import { useTranslation } from 'react-i18next';
import { CheckCircle2, Calendar } from 'lucide-react';
import { useAppColors } from '../theme/useAppColors';

function fmtDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export interface SnapshotMetric {
    label: string;
    value: string;
    /** One of: 'income' | 'expense' | 'investment' | 'neutral' */
    tone?: 'income' | 'expense' | 'investment' | 'neutral';
}

interface Props {
    /** YYYY-MM-DD anchor date. Empty string = show "pick a date" placeholder. */
    anchorDate: string;
    /** Headline value (e.g. "₹15,00,000"). */
    headline: string;
    /** Headline label (e.g. "Estimated Gratuity"). */
    headlineLabel: string;
    /** Up to 3 colored metric cards. */
    metrics: SnapshotMetric[];
    /** Optional subtitle below the headline. */
    subtitle?: string;
    /** Title shown in the empty-state placeholder. */
    label?: string;
    /** Note rows shown below the metrics (key/value rows). */
    notes?: { label: string; value: string }[];
}

const TONE_COLORS = {
    income: { bg: '#10B98115', border: '#10B98130', text: '#10B981' },
    expense: { bg: '#EF444415', border: '#EF444430', text: '#EF4444' },
    investment: { bg: '#3B82F615', border: '#3B82F630', text: '#3B82F6' },
    neutral: { bg: '#F59E0B15', border: '#F59E0B30', text: '#F59E0B' },
};

export default function SnapshotPreviewCard(props: Props) {
    const { t } = useTranslation();
    const c = useAppColors();
    const { anchorDate, headline, headlineLabel, metrics, subtitle, label, notes } = props;

    // Empty state
    if (!anchorDate) {
        return (
            <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-violet-500" />
                    <h3 className="font-bold text-sm" style={{ color: c.text }}>
                        {label || t('snapshot.title', 'Saved Preview')}
                    </h3>
                </div>
                <p className="text-sm" style={{ color: c.textSecondary }}>
                    {t('snapshot.pickDateHint', 'Pick a date above to lock this calculation as a snapshot.')}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* HEADER — snapshot badge */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-violet-500" />
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                        {t('snapshot.snapshotAsOf', 'Snapshot as of {{date}}', { date: fmtDate(anchorDate) })}
                    </p>
                </div>
            </div>

            {/* 1. HEADLINE CARD */}
            <div className="p-5 rounded-2xl border-2 shadow-sm" style={{ backgroundColor: c.card, borderColor: '#8B5CF6' }}>
                <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: c.textSecondary }}>
                    {headlineLabel}
                </p>
                <p className="text-3xl font-black text-violet-500 mb-1">{headline}</p>
                {subtitle && (
                    <p className="text-[10px]" style={{ color: c.textSecondary }}>{subtitle}</p>
                )}
            </div>

            {/* 2. METRIC CARDS (up to 3) */}
            {metrics.length > 0 && (
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className={`grid gap-2 ${metrics.length === 3 ? 'grid-cols-3' : metrics.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {metrics.map((m, i) => {
                            const tone = TONE_COLORS[m.tone || 'investment'];
                            return (
                                <div
                                    key={i}
                                    className="p-3 rounded-xl text-center"
                                    style={{ backgroundColor: tone.bg, border: `1px solid ${tone.border}` }}
                                >
                                    <p className="text-[9px] uppercase font-bold mb-1" style={{ color: tone.text }}>
                                        {m.label}
                                    </p>
                                    <p className="text-sm font-black" style={{ color: tone.text }}>{m.value}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 3. NOTES — additional key/value rows */}
            {notes && notes.length > 0 && (
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="space-y-2">
                        {notes.map((n, i) => (
                            <div key={i} className="flex justify-between items-center py-1">
                                <span className="text-sm" style={{ color: c.textSecondary }}>{n.label}</span>
                                <span className="text-sm font-bold" style={{ color: c.text }}>{n.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
