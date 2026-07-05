/**
 * backupRestore.ts — Full-app data backup & restore for phone migration.
 *
 * Exports every FinCalix localStorage key (raw strings, untouched) into a
 * single JSON envelope, and restores them on a new device. After a restore
 * the caller MUST reload the app so Zustand stores rehydrate and
 * dataIntegrity re-validates the imported data.
 */

import { Capacitor } from '@capacitor/core';
import { APP_VERSION } from '../config/app';

export const BACKUP_SCHEMA = 1;

/**
 * Every FinCalix localStorage key that holds user data.
 * Keys absent on the device are exported as null (and removed on import so
 * the restored device matches the backup exactly).
 *
 * Deliberately excluded (device-specific / transient): fincalix_anon_id,
 * fincalix_analytics_queue, fincalix_dev_access, fincalix_last_quote_date,
 * fincalix_last_update_notif_version, fincalix_scheduler_first_seed,
 * fincalix_scheduler_last_run.
 */
export const BACKUP_KEYS: readonly string[] = [
    // Expense tracker + money data (plain localStorage)
    'fincalix_entries',
    'fincalix_accounts',
    'fincalix_budgets',
    'fincalix_categories',
    'fincalix_my_loans',
    'fincalix_credit_cards',
    'fincalix_businesses',
    'fincalix_business_entries',
    'fincalix_cibil_profile',
    'fincalix_property_data',
    'fincalix_world_clocks',
    'fincalix_comparev2',
    'fincalix_recently_used',
    // Zustand persist stores
    'fincalix_notifications',      // useNotificationStore
    'local-user-storage',          // useAuthStore
    'calculator-storage',          // useCalculatorStore
    'fincalix-calculator-store',   // legacy saved-calcs (read by NotificationScheduler)
    'settings-storage',            // useSettingsStore
    'budget-tracker-storage',      // useBudgetTrackerStore
    'fincalix-expenses',           // useExpenseStore
    'live-status-storage',         // useLiveStatusStore
    'scheme-storage',              // useSchemeStore
    'feature-flags-storage',       // useFeatureFlagStore
    // One-time flags / consent (so a migrated phone isn't re-prompted)
    'fincalix_disclaimer_accepted',
    'fincalix_disclaimer_accepted_v2',
    'fincalix_privacy_accepted',
    'appDisclaimerAccepted',
    'expenseTrackerDisclaimerAccepted',
    'cibil_onboarding_shown',
    // Language preference
    'language',
];

export interface BackupEnvelope {
    app: 'FinCalix';
    schema: number;
    appVersion: string;
    exportedAt: string;
    data: Record<string, string | null>;
}

export interface ExportResult {
    fileName: string;
    /** 'documents' = saved on device (native), 'download' = browser download */
    location: 'documents' | 'download';
}

export interface ImportResult {
    restored: number;
    skipped: number;
}

function backupFileName(): string {
    const d = new Date();
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `fincalix-backup-${yyyy}${mm}${dd}.json`;
}

function buildEnvelope(): BackupEnvelope {
    const data: Record<string, string | null> = {};
    for (const key of BACKUP_KEYS) {
        data[key] = localStorage.getItem(key);
    }
    return {
        app: 'FinCalix',
        schema: BACKUP_SCHEMA,
        appVersion: APP_VERSION,
        exportedAt: new Date().toISOString(),
        data,
    };
}

/**
 * Build the backup and hand it to the user:
 * - Native: write to Documents (fallback: Cache) via Filesystem, then open
 *   the system Share sheet so the user can send it to Drive/email/new phone.
 * - Web: plain blob download.
 */
export async function exportBackup(): Promise<ExportResult> {
    // Compact JSON — the file is machine-restored, never hand-read, and
    // pretty-printing roughly doubles multi-MB backups.
    const json = JSON.stringify(buildEnvelope());
    const fileName = backupFileName();

    if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        let uri: string;
        try {
            const result = await Filesystem.writeFile({
                path: fileName,
                data: json,
                directory: Directory.Documents,
                encoding: Encoding.UTF8,
                recursive: true,
            });
            uri = result.uri;
        } catch {
            // Documents can be restricted on some Android versions — fall back
            // to app cache; the Share sheet below still lets the user save it.
            const result = await Filesystem.writeFile({
                path: fileName,
                data: json,
                directory: Directory.Cache,
                encoding: Encoding.UTF8,
                recursive: true,
            });
            uri = result.uri;
        }
        try {
            const { Share } = await import('@capacitor/share');
            const can = await Share.canShare();
            if (can.value) {
                await Share.share({
                    title: `FinCalix Backup – ${fileName}`,
                    url: uri,
                    dialogTitle: 'Save or share your FinCalix backup',
                });
            }
        } catch {
            // Share dismissed or unavailable — file is already written.
        }
        return { fileName, location: 'documents' };
    }

    // Web: blob download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
    return { fileName, location: 'download' };
}

function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
        reader.readAsText(file);
    });
}

/**
 * Restore a backup created by exportBackup().
 * Only known FinCalix keys are written; unknown keys in the file are skipped
 * and non-FinCalix localStorage keys are never touched. A key whose backup
 * value is null is removed locally so the device matches the backup.
 *
 * Throws Error('INVALID_BACKUP') if the file is not a valid FinCalix backup.
 * After a successful restore the caller must window.location.reload().
 */
export async function importBackup(input: File | string): Promise<ImportResult> {
    const text = typeof input === 'string' ? input : await readFileAsText(input);

    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error('INVALID_BACKUP');
    }

    const env = parsed as Partial<BackupEnvelope> | null;
    if (
        !env || typeof env !== 'object' ||
        env.app !== 'FinCalix' ||
        env.schema !== BACKUP_SCHEMA ||
        !env.data || typeof env.data !== 'object' || Array.isArray(env.data)
    ) {
        throw new Error('INVALID_BACKUP');
    }

    let restored = 0;
    let skipped = 0;
    for (const [key, value] of Object.entries(env.data)) {
        if (!BACKUP_KEYS.includes(key)) {
            skipped++;
            continue;
        }
        if (typeof value === 'string') {
            localStorage.setItem(key, value);
            restored++;
        } else if (value === null) {
            localStorage.removeItem(key);
            restored++;
        } else {
            skipped++;
        }
    }

    return { restored, skipped };
}
