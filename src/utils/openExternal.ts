import { Capacitor } from '@capacitor/core';

/**
 * Open an outside web page (an official government source). In the Android app it opens in the
 * in-app browser (Chrome Custom Tabs via @capacitor/browser), so the user stays in FinCalix and
 * comes back with Back; on the web it opens a new tab.
 */
export async function openExternal(url: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
        try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.open({ url });
            return;
        } catch {
            /* plugin missing: fall through to the system handler */
        }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}
