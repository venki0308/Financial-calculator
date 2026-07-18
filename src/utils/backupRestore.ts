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
    'fincalix_recurring',
    // Settings/preferences that change how money data is interpreted —
    // missing these silently changed budget windows on a migrated phone.
    'fincalix_month_start_day',    // salary-cycle month start (1-28)
    'fincalix_entry_prefs',        // AddEntrySheet sticky defaults
    'fincalix_cc_payoff_strategy', // chosen payoff strategy
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
    'fincalix_disclaimer_accepted_v3',
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
    /** 'documents' = saved on device (native), 'download' = browser download,
     *  'cache' = Documents was not writable (permission denied on Android ≤12)
     *  and the file landed in app cache — reachable only via the Share sheet. */
    location: 'documents' | 'download' | 'cache';
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

export function buildEnvelope(): BackupEnvelope {
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

export type ExportMode = 'download' | 'share';

/**
 * Build the backup and hand it to the user:
 * - Native 'download': write to Documents (fallback: Cache) — no share sheet;
 *   the caller's toast tells the user where the file landed.
 * - Native 'share': write the file, then open the system Share sheet so the
 *   user can send it to Drive/email/the new phone.
 * - Web: plain blob download regardless of mode.
 */
export async function exportBackup(mode: ExportMode = 'share'): Promise<ExportResult> {
    // Compact JSON — the file is machine-restored, never hand-read, and
    // pretty-printing roughly doubles multi-MB backups.
    const json = JSON.stringify(buildEnvelope());
    const fileName = backupFileName();

    if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        // Android ≤12 needs the storage permission for Documents writes
        // (Android 13+ auto-grants). Without this every Documents write was
        // silently permission-denied on older phones.
        try {
            const st = await Filesystem.checkPermissions();
            if (st.publicStorage !== 'granted') {
                await Filesystem.requestPermissions();
            }
        } catch { /* API unavailable — attempt the write anyway */ }
        let uri: string;
        let landedIn: 'documents' | 'cache' = 'documents';
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
            // Documents restricted (permission denied) — fall back to app
            // cache; the Share sheet below still lets the user save it.
            const result = await Filesystem.writeFile({
                path: fileName,
                data: json,
                directory: Directory.Cache,
                encoding: Encoding.UTF8,
                recursive: true,
            });
            uri = result.uri;
            landedIn = 'cache';
        }
        // If the file could only be written to cache, the user can't browse
        // to it — open the Share sheet regardless of mode so they can still
        // save it somewhere reachable.
        if (mode === 'share' || landedIn === 'cache') {
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
        }
        return { fileName, location: landedIn };
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

// ─── Safety snapshots ──────────────────────────────────────────────────────
// The automatic DAILY backup feature was removed on user feedback: a silent
// background file write read as "the app is collecting my data". Backup is
// strictly user-initiated (Export/Import above). The only remaining silent
// write is the pre-destruction snapshot below, which fires exclusively when
// the user performs the destructive action it protects against — and the
// Clear All dialog discloses it.

const AUTO_BACKUP_DIR = 'FinCalix';

/**
 * Safety snapshot taken immediately BEFORE a destructive action (Clear All
 * Data / Import-overwrite). No daily throttle — every destructive action gets
 * its own snapshot. Native only, silent on failure; callers must never block
 * the action on this (best-effort insurance, not a gate).
 */
export async function snapshotBackup(reason: 'clear' | 'import'): Promise<void> {
    try {
        if (!Capacitor.isNativePlatform()) return;
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        await Filesystem.writeFile({
            path: `${AUTO_BACKUP_DIR}/pre-${reason}-${ts}.json`,
            data: JSON.stringify(buildEnvelope()),
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
            recursive: true,
        });
    } catch (e) {
        console.warn(`[FinCalix] pre-${reason} snapshot failed`, e);
    }
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
