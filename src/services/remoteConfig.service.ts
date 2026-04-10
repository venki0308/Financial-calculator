/**
 * Remote Config Service
 * Fetches a config.json from a public GitHub repo to power:
 *  - Force-update checks
 *  - Feature flags
 *  - Ad unit IDs (for future AdMob)
 *
 * GitHub repo you must create: venki0308/fincalix-config
 * File path: config.json
 */

export interface FincalixRemoteConfig {
    minRequiredVersion: string;
    latestVersion: string;
    features: Record<string, boolean>;
    adConfig?: {
        bannerAdUnitId?: string;
        interstitialAdUnitId?: string;
        rewardedAdUnitId?: string;
    };
    updateMessage: {
        title: string;
        message: string;
        required: boolean;
    };
}

// -----------------------------------------------------------
// DEFAULT FALLBACK (used when network is unavailable)
// -----------------------------------------------------------
const DEFAULT_CONFIG: FincalixRemoteConfig = {
    minRequiredVersion: '1.0.0',
    latestVersion: '1.0.0',
    features: {
        adMobEnabled: false,
        showBannerAds: false,
        maintenanceMode: false,
        pdfExport: true,
        expenseTracker: true,
    },
    updateMessage: {
        title: 'Update Available',
        message: 'A new version with improvements is available!',
        required: false,
    },
};

// Fetched from our own domain (Vercel-hosted) so it shares the cache
// infrastructure and IP visibility is to fincalix.com only — disclosed in
// the Privacy Policy under Section 3.
const CONFIG_URL = 'https://fincalix.com/config.json';

let cachedConfig: FincalixRemoteConfig | null = null;

export const RemoteConfigService = {
    /** Fetch config; returns cached or default on failure / timeout / offline */
    async getConfig(): Promise<FincalixRemoteConfig> {
        if (cachedConfig) return cachedConfig;
        try {
            // 5s timeout — never block the app waiting for the config endpoint
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(CONFIG_URL, {
                cache: 'no-cache',
                signal: controller.signal,
            });
            clearTimeout(timeout);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            cachedConfig = (await res.json()) as FincalixRemoteConfig;
            return cachedConfig;
        } catch {
            // Network error / timeout / offline → use defaults
            cachedConfig = DEFAULT_CONFIG;
            return DEFAULT_CONFIG;
        }
    },

    /** Compare semver strings: returns 1 if a > b, -1 if a < b, 0 if equal */
    compareVersions(a: string, b: string): number {
        const pa = a.split('.').map(Number);
        const pb = b.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
            if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
            if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
        }
        return 0;
    },

    /** Returns true if `current` is below `minRequired` */
    isUpdateRequired(current: string, minRequired: string): boolean {
        return this.compareVersions(current, minRequired) < 0;
    },

    /** Returns true if `latest` is newer than `current` */
    isUpdateAvailable(current: string, latest: string): boolean {
        return this.compareVersions(current, latest) < 0;
    },

    /** Opens the Play Store listing for the app */
    async openPlayStore() {
        const packageName = 'com.fincalix.app';
        const webUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
        window.open(webUrl, '_blank', 'noopener,noreferrer');
    },
};
