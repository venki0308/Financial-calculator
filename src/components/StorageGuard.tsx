/**
 * StorageGuard — the user-facing side of utils/safeStorage.
 *  - Storage full  → blocking dialog: nothing more can be saved until the user
 *    backs up and deletes old entries. Offers "Export backup" right there.
 *  - Storage ≥ 80% → dismissible banner with the same button, at most once a day.
 * Mounted once in App. All colours come from theme tokens (light + dark).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { AlertTriangle, Download, HardDrive, X } from 'lucide-react';
import {
    STORAGE_FULL_EVENT,
    STORAGE_WARNING_EVENT,
    StorageFullError,
    checkStorageUsage,
} from '../utils/safeStorage';

type ExportState = 'idle' | 'working' | 'done' | 'failed';

export default function StorageGuard() {
    const { t } = useTranslation();
    const [isFull, setIsFull] = useState(false);
    const [unsavedInput, setUnsavedInput] = useState(false);
    const [warnPercent, setWarnPercent] = useState<number | null>(null);
    const [exportState, setExportState] = useState<ExportState>('idle');

    useEffect(() => {
        const onFull = (e: Event) => {
            // Background writes (flags, caches) can hit the limit too; only a
            // failed user save means there is unsaved input on screen.
            const userData = (e as CustomEvent<{ userData?: boolean }>).detail?.userData === true;
            setIsFull(true);
            setUnsavedInput(prev => prev || userData);
            setWarnPercent(null);
        };
        const onWarning = (e: Event) => {
            const percent = (e as CustomEvent<{ percent?: number }>).detail?.percent;
            setWarnPercent(typeof percent === 'number' ? percent : 80);
        };
        // A StorageFullError deliberately stops the save flow that hit it; the
        // dialog above is its handling, so don't let it surface as "uncaught".
        const onError = (e: ErrorEvent) => {
            if (e.error instanceof StorageFullError) e.preventDefault();
        };
        const onRejection = (e: PromiseRejectionEvent) => {
            if (e.reason instanceof StorageFullError) e.preventDefault();
        };

        window.addEventListener(STORAGE_FULL_EVENT, onFull);
        window.addEventListener(STORAGE_WARNING_EVENT, onWarning);
        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onRejection);
        // Measure once at launch so a nearly-full store is flagged before the
        // user starts typing a new entry.
        checkStorageUsage(true);
        return () => {
            window.removeEventListener(STORAGE_FULL_EVENT, onFull);
            window.removeEventListener(STORAGE_WARNING_EVENT, onWarning);
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onRejection);
        };
    }, []);

    const handleExport = async () => {
        if (exportState === 'working') return;
        setExportState('working');
        try {
            // Loaded on demand — the backup code is not part of the app shell.
            const { exportBackup } = await import('../utils/backupRestore');
            await exportBackup(Capacitor.isNativePlatform() ? 'share' : 'download');
            setExportState('done');
        } catch (e) {
            console.error('Backup export failed:', e);
            setExportState('failed');
        }
    };

    const exportLabel =
        exportState === 'working' ? t('storage.exporting', 'Preparing backup…')
        : exportState === 'done' ? t('storage.exportDone', 'Backup exported')
        : t('storage.exportBackup', 'Export backup');

    const exportButton = (extraClass: string) => (
        <button
            type="button"
            onClick={handleExport}
            disabled={exportState === 'working'}
            className={`flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-opacity active:opacity-80 disabled:opacity-60 ${extraClass}`}
        >
            <Download size={16} />
            {exportLabel}
        </button>
    );

    if (isFull) {
        return (
            <div
                className="fixed inset-0 z-[10002] flex items-center justify-center bg-background/80 p-5"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="storage-full-title"
            >
                <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-2xl">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15">
                        <HardDrive size={26} className="text-destructive" />
                    </div>
                    <h2 id="storage-full-title" className="mb-2 text-lg font-bold text-foreground">
                        {t('storage.fullTitle', 'Storage full')}
                    </h2>
                    <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                        {t('storage.fullBody', 'Storage full — export a backup and delete old entries to keep saving.')}
                    </p>
                    {exportState === 'failed' && (
                        <p className="mb-3 text-xs font-medium text-destructive">
                            {t('storage.exportFailed', 'Could not create the backup. Please try again.')}
                        </p>
                    )}
                    {exportButton('w-full py-3')}
                    <button
                        type="button"
                        onClick={() => { setIsFull(false); setUnsavedInput(false); setExportState('idle'); }}
                        className="mt-3 w-full rounded-xl border border-border py-3 text-sm font-medium text-foreground active:opacity-80"
                    >
                        {t('storage.close', 'Close')}
                    </button>
                    {unsavedInput && (
                        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                            {t('storage.inputKept', 'What you just entered has not been saved yet. It is still on screen — save it again after freeing space.')}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (warnPercent !== null) {
        return (
            <div className="fixed bottom-28 left-3 right-3 z-[60]" role="status">
                <div className="rounded-2xl border border-warning/40 bg-card p-4 shadow-2xl">
                    <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-warning/15">
                            <AlertTriangle size={18} className="text-warning" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">
                                {t('storage.warnTitle', 'Storage almost full ({{percent}}%)', { percent: warnPercent })}
                            </p>
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                {t('storage.warnBody', 'Export a backup and delete old entries soon, or new entries will stop saving.')}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setWarnPercent(null); setExportState('idle'); }}
                            aria-label={t('storage.close', 'Close')}
                            className="flex-shrink-0 p-1 text-muted-foreground active:opacity-70"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    {exportState === 'failed' && (
                        <p className="mt-2 text-xs font-medium text-destructive">
                            {t('storage.exportFailed', 'Could not create the backup. Please try again.')}
                        </p>
                    )}
                    {exportButton('mt-3 w-full py-2.5')}
                </div>
            </div>
        );
    }

    return null;
}
