import { Capacitor } from '@capacitor/core';

/**
 * Cross-platform share utility.
 * Uses @capacitor/share on native (Android/iOS), falls back to navigator.share on web,
 * then to clipboard copy if neither is available.
 */
export async function nativeShare(title: string, text: string, url?: string): Promise<void> {
    try {
        // 1. Try Capacitor Share (Native Android / iOS)
        if (Capacitor.isNativePlatform()) {
            const { Share } = await import('@capacitor/share');
            await Share.share({
                title,
                text,
                url,
                dialogTitle: `Share ${title}`,
            });
            return;
        }

        // 2. Try Web Share API (modern browsers)
        if (navigator.share) {
            await navigator.share({ title, text, url });
            return;
        }

        // 3. Fallback: copy to clipboard with toast
        const copyText = url ? (text ? `${text}\n${url}` : url) : text;
        await navigator.clipboard.writeText(copyText);
        showToast('✅ Copied to clipboard!');
    } catch (e: any) {
        // User cancelled share — ignore
        if (e?.name === 'AbortError') return;
        console.warn('Share failed:', e);
    }
}

function showToast(message: string) {
    const el = document.createElement('div');
    el.textContent = message;
    Object.assign(el.style, {
        position: 'fixed',
        bottom: '110px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#10B981',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '12px',
        fontSize: '14px',
        fontWeight: '600',
        zIndex: '99999',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
}
