/**
 * Feature Flags Service
 * Uses the same remote config as RemoteConfigService.
 * Toggle features remotely without an app update.
 */
import { RemoteConfigService, FincalixRemoteConfig } from './remoteConfig.service';

let _flags: Record<string, boolean> = {};
let _adConfig: FincalixRemoteConfig['adConfig'] = {};
let _loaded = false;

export const FeatureFlagService = {
 /** Load flags from remote config (call once in App.tsx) */
 async load(): Promise<void> {
 if (_loaded) return;
 const config = await RemoteConfigService.getConfig();
 _flags = config.features ?? {};
 _adConfig = config.adConfig ?? {};
 _loaded = true;
 },

 /** Check if a feature flag is enabled */
 isEnabled(flag: string): boolean {
 return _flags[flag] ?? false;
 },

 /** Get ad unit ID string, or empty string if not set */
 getAdUnitId(key: 'bannerAdUnitId' | 'interstitialAdUnitId' | 'rewardedAdUnitId'): string {
 return _adConfig?.[key] ?? '';
 },

 /** Force reload from remote (e.g., on app resume) */
 async reload(): Promise<void> {
 _loaded = false;
 await this.load();
 },

 /** Get all current flags (for debugging) */
 getAllFlags(): Record<string, boolean> {
 return { ..._flags };
 },
};
