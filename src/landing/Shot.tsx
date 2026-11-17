/**
 * A real app screenshot in a phone frame, in the theme the page is showing.
 * Both theme versions are in the HTML; CSS hides the other one, and because
 * they are lazy-loaded the hidden one is never downloaded. Hero shots are
 * promoted to eager/high priority by a tiny inline script (see Landing.tsx).
 * Server-rendered only: this file ships no JavaScript.
 */
import manifest from './img/images.json';

const URLS = import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function shotUrl(id: string, theme: 'light' | 'dark', width: number): string {
    const u = URLS[`./img/${id}-${theme}-${width}.webp`];
    if (!u) throw new Error(`landing: no screenshot ${id}-${theme}-${width}.webp (run scripts/landing/build-images.mjs)`);
    return u;
}

export function shotInfo(id: string) {
    const m = (manifest as Record<string, { aspect: number[]; widths: number[] }>)[id];
    if (!m) throw new Error(`landing: screenshot ${id} is not in img/images.json`);
    return m;
}

export function Shot({ id, alt, sizes, hero, className = '' }: { id: string; alt: string; sizes: string; hero?: boolean; className?: string }) {
    const { aspect, widths } = shotInfo(id);
    const [w0] = widths;
    const h0 = Math.round((w0 * aspect[1]) / aspect[0]);
    return (
        <span className={`phone ${className}`}>
            {(['light', 'dark'] as const).map((theme) => (
                <img
                    key={theme}
                    className={`only-${theme}`}
                    src={shotUrl(id, theme, w0)}
                    srcSet={widths.map((w) => `${shotUrl(id, theme, w)} ${w}w`).join(', ')}
                    sizes={sizes}
                    width={w0}
                    height={h0}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    {...(hero ? { 'data-hero': '' } : {})}
                />
            ))}
        </span>
    );
}
