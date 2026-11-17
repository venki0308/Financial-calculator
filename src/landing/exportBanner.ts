/**
 * One-time banner on every website page for a browser that still holds FinCalix data:
 * "FinCalix now lives on Android — export your data", with the export button (the app's
 * own exportBackup, same fincalix-backup-YYYYMMDD.json file) and the Google Play badge.
 *
 * Dismissible. It comes back once, 30 days after it was dismissed, if the data is still
 * there; after that it never shows again. Plain DOM with its own styles, so it also runs
 * on the static calculator pages. Fixed at the bottom of the screen: it never moves the
 * page. It reads app data but never writes or deletes it; its only key is
 * fincalix_export_notice.
 */
import { hasFinCalixData } from './userData';
import { playUrl } from './play';
import badgeUrl from './assets/google-play-badge-en.png';

const KEY = 'fincalix_export_notice';
const DAY = 24 * 60 * 60 * 1000;
export const BANNER_REPEAT_DAYS = 30;

interface Notice { dismissals: number; at: number }

function readNotice(): Notice {
    try {
        const v = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (v && typeof v.dismissals === 'number' && typeof v.at === 'number') return v;
    } catch { /* ignore */ }
    return { dismissals: 0, at: 0 };
}

function dismiss() {
    const n = readNotice();
    try { localStorage.setItem(KEY, JSON.stringify({ dismissals: n.dismissals + 1, at: Date.now() })); } catch { /* ignore */ }
}

/** Show now? First time, or once more 30 days after the first dismissal. */
export function bannerDue(now = Date.now()): boolean {
    if (!hasFinCalixData()) return false;
    const n = readNotice();
    if (n.dismissals === 0) return true;
    return n.dismissals === 1 && now - n.at >= BANNER_REPEAT_DAYS * DAY;
}

const CSS = `
.fx-banner{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:560px;margin:0 auto;box-sizing:border-box;
 padding:16px 18px;border-radius:16px;background:#fff;color:#0F172A;border:1px solid #E3DED2;box-shadow:0 18px 40px -16px rgba(15,23,42,.45);
 font:400 15px/1.5 'Plus Jakarta Sans','Jakarta Fallback',system-ui,sans-serif}
.fx-banner *{box-sizing:border-box}
.fx-banner h2{margin:0 36px 6px 0;font-size:17px;line-height:1.3;font-weight:800}
.fx-banner p{margin:0 0 12px;color:#334155}
.fx-banner .fx-row{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
.fx-banner .fx-btn{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:11px;border:0;cursor:pointer;
 font-weight:700;font-size:15px;font-family:inherit;color:#fff;background:linear-gradient(120deg,#047857 0%,#2F5FA8 48%,#5B3FD0 100%)}
.fx-banner .fx-play{display:inline-block;line-height:0}.fx-banner .fx-play img{height:44px;width:auto;display:block}
.fx-banner .fx-more{color:#4F46E5;font-weight:700;font-size:14px}
.fx-banner .fx-close{position:absolute;top:8px;right:8px;width:40px;height:40px;border:0;border-radius:10px;background:transparent;
 color:#556070;font-size:22px;line-height:1;cursor:pointer}
.fx-banner .fx-done{margin:10px 0 0;font-size:14px;color:#047857;font-weight:700}
.fx-banner :focus-visible{outline:3px solid #4F46E5;outline-offset:2px}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .fx-banner{background:#131C2E;color:#F1EEE6;border-color:#3A4864}
 :root:not([data-theme=light]) .fx-banner p{color:#CBD5E1}:root:not([data-theme=light]) .fx-banner .fx-more{color:#A5B4FC}
 :root:not([data-theme=light]) .fx-banner .fx-close{color:#9AA8BC}:root:not([data-theme=light]) .fx-banner .fx-done{color:#34D399}}
[data-theme=dark] .fx-banner{background:#131C2E;color:#F1EEE6;border-color:#3A4864}[data-theme=dark] .fx-banner p{color:#CBD5E1}
[data-theme=dark] .fx-banner .fx-more{color:#A5B4FC}[data-theme=dark] .fx-banner .fx-close{color:#9AA8BC}[data-theme=dark] .fx-banner .fx-done{color:#34D399}
`;

/** Run the app's own export (same file and format as Settings → Export App Data). */
export async function exportNow(): Promise<string> {
    const { exportBackup } = await import('../utils/backupRestore');
    const r = await exportBackup('download');
    return r.fileName;
}

export function initExportBanner(): void {
    if (typeof window === 'undefined' || !bannerDue()) return;
    if (location.pathname.replace(/\/+$/, '') === '/export-my-data') return; // the page itself does the job
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    const box = document.createElement('section');
    box.className = 'fx-banner';
    box.setAttribute('role', 'region');
    box.setAttribute('aria-labelledby', 'fx-banner-h');
    box.innerHTML = `
        <button type="button" class="fx-close" aria-label="Dismiss">×</button>
        <h2 id="fx-banner-h">FinCalix now lives on Android — export your data</h2>
        <p>Your FinCalix calculations and records are saved in this browser. Download them and import them in the free Android app.</p>
        <div class="fx-row">
            <button type="button" class="fx-btn" data-fx-export>Export my data</button>
            <a class="fx-play" href="${playUrl('final_cta')}" target="_blank" rel="noopener"><img src="${badgeUrl}" width="646" height="250" alt="Get it on Google Play"></a>
            <a class="fx-more" href="/export-my-data">How it works</a>
        </div>
        <p class="fx-done" hidden></p>`;
    const close = () => { dismiss(); box.remove(); };
    box.querySelector('.fx-close')?.addEventListener('click', close);
    box.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    box.querySelector('[data-fx-export]')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget as HTMLButtonElement;
        btn.disabled = true;
        const done = box.querySelector('.fx-done') as HTMLElement;
        try {
            const file = await exportNow();
            done.textContent = `Downloaded ${file}. In the Android app open Profile → Settings → Backup & Restore → Import App Data.`;
        } catch {
            done.textContent = 'Could not create the file. Please try again from the Export my data page.';
        }
        done.hidden = false;
        btn.disabled = false;
    });
    document.body.appendChild(box);
}
