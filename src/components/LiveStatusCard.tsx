import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppColors } from '../theme/useAppColors';
import { Clock, AlertTriangle, Lightbulb, Save, Check, Trash2 } from 'lucide-react';
import { useLiveStatusStore } from '../store/useLiveStatusStore';
import { todayStr, parseLocalDate } from '../utils/dateUtils';

interface MetricCardProps {
    label: string;
    value: string;
    subValue?: string;
    color?: 'green' | 'red' | 'blue' | 'amber' | 'default';
}

interface LiveStatusCardProps {
    title: string;
    subtitle?: string;
    startDate?: string;
    metrics: MetricCardProps[];
    progressPercent?: number;
    progressLabel?: string;
    insightText?: string;
    warningText?: string;
    children?: React.ReactNode;
    calculatorType?: string;
    profileData?: Record<string, any>;
}

const COLOR_MAP = {
    green: { text: 'text-emerald-500', bg: '#10B98115', border: '#10B98130' },
    red: { text: 'text-red-500', bg: '#EF444415', border: '#EF444430' },
    blue: { text: 'text-blue-500', bg: '#3B82F615', border: '#3B82F630' },
    amber: { text: 'text-amber-500', bg: '#F59E0B15', border: '#F59E0B30' },
    default: { text: '', bg: '', border: '' },
};

function fmtDate(dateStr: string): string {
    if (!dateStr) return '—';
    // Parse YYYY-MM-DD as a LOCAL date — new Date('YYYY-MM-DD') is parsed as
    // UTC midnight and can display the previous day in negative-UTC timezones.
    const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? parseLocalDate(dateStr) : new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function LiveStatusCard({ title, subtitle, startDate, metrics, progressPercent, progressLabel, insightText, warningText, children, calculatorType, profileData }: LiveStatusCardProps) {
    const { t } = useTranslation();
    const c = useAppColors();

    const [profileName, setProfileName] = useState('');
    const [showSaveForm, setShowSaveForm] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const [savedProfileId, setSavedProfileId] = useState<string | null>(null);

    const { addProfile, removeProfile, savedProfiles } = useLiveStatusStore();

    const canSave = !!calculatorType && !!profileData;

    // Check if already saved by matching calculatorType + startDate + a key data field
    const existingSaved = useMemo(() => {
        if (!canSave) return undefined;
        return savedProfiles.find(p =>
            p.calculatorType === calculatorType &&
            p.profileData?.startDate === profileData?.startDate &&
            JSON.stringify(p.profileData) === JSON.stringify({ ...profileData, startDate })
        );
    }, [savedProfiles, calculatorType, profileData, canSave]);

    const isAlreadySaved = profileSaved || !!existingSaved;
    const currentSavedId = savedProfileId || existingSaved?.id || null;

    const handleSave = () => {
        if (!profileName.trim() || !canSave) return;
        const id = Date.now().toString();
        addProfile({
            id,
            name: profileName.trim(),
            calculatorType: calculatorType!,
            profileData: { ...profileData!, startDate },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        setProfileSaved(true);
        setSavedProfileId(id);
        setShowSaveForm(false);
    };

    const handleRemove = () => {
        if (currentSavedId) {
            removeProfile(currentSavedId);
            setProfileSaved(false);
            setSavedProfileId(null);
        }
    };

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 px-1">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: c.textSecondary }}>
                    {t('liveStatus.liveAsOf', { date: fmtDate(todayStr()) })}
                </p>
            </div>

            {/* Title Card */}
            <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-bold text-sm" style={{ color: c.text }}>{title}</h3>
                </div>
                {subtitle && <p className="text-xs ml-6" style={{ color: c.textSecondary }}>{subtitle}</p>}
                {startDate && <p className="text-[10px] ml-6 mt-0.5" style={{ color: c.textSecondary }}>{t('liveStatus.since', { date: fmtDate(startDate) })}</p>}
            </div>

            {/* Metrics Row */}
            <div className={`grid gap-2 ${metrics.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {metrics.map((m, i) => {
                    const clr = m.color ? COLOR_MAP[m.color] : COLOR_MAP.default;
                    return (
                        <div key={i} className="p-3 rounded-xl border text-center"
                            style={{
                                backgroundColor: clr.bg || c.card,
                                borderColor: clr.border || c.border,
                            }}>
                            <p className="text-[9px] uppercase font-bold tracking-wider mb-1" style={{ color: c.textSecondary }}>{m.label}</p>
                            <p className={`text-sm font-black ${clr.text}`} style={!m.color ? { color: c.text } : undefined}>{m.value}</p>
                            {m.subValue && <p className="text-[10px] mt-0.5" style={{ color: c.textSecondary }}>{m.subValue}</p>}
                        </div>
                    );
                })}
            </div>

            {/* Progress Bar */}
            {progressPercent !== undefined && (
                <div className="p-3 rounded-xl border" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: c.bg }}>
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}></div>
                    </div>
                    {progressLabel && (
                        <p className="text-[10px] font-bold text-center mt-1.5" style={{ color: c.textSecondary }}>{progressLabel}</p>
                    )}
                </div>
            )}

            {/* Children (custom sections) */}
            {children}

            {/* Insight */}
            {insightText && (
                <div className="p-3 rounded-xl flex items-start gap-2" style={{ backgroundColor: '#10B98115', border: '1px solid #10B98130' }}>
                    <Lightbulb className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">{insightText}</p>
                </div>
            )}

            {/* Warning */}
            {warningText && (
                <div className="p-3 rounded-xl flex items-start gap-2" style={{ backgroundColor: '#F59E0B15', border: '1px solid #F59E0B30' }}>
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">{warningText}</p>
                </div>
            )}

            {/* Save Tracker */}
            {canSave && (
                <div className="p-4 rounded-2xl border shadow-sm" style={{ backgroundColor: c.card, borderColor: c.border }}>
                    {isAlreadySaved ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm font-bold text-emerald-500">{t('liveStatus.savedToProfile')}</span>
                            </div>
                            <button
                                onClick={handleRemove}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20"
                            >
                                <Trash2 size={12} /> {t('liveStatus.removeBtn')}
                            </button>
                        </div>
                    ) : showSaveForm ? (
                        <div className="space-y-3">
                            <p className="text-sm font-bold" style={{ color: c.text }}>{t('liveStatus.nameTracker')}</p>
                            <input
                                autoFocus
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                placeholder={t('liveStatus.investmentPlaceholder', { type: calculatorType })}
                                className="w-full bg-transparent border rounded-xl px-3 py-2.5 text-sm outline-none"
                                style={{ borderColor: c.border, color: c.text }}
                                maxLength={40}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowSaveForm(false)}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border"
                                    style={{ borderColor: c.border, color: c.textSecondary }}
                                >
                                    {t('liveStatus.cancelBtn')}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!profileName.trim()}
                                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold disabled:opacity-40"
                                >
                                    {t('liveStatus.saveBtn')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowSaveForm(true)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-sm border border-emerald-500/20"
                        >
                            <Save size={16} /> {t('liveStatus.saveTracker')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
