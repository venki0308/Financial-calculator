/** /export-my-data: list what this browser holds and download it with the app's own export. */
import { dataSummary } from './userData';
import { exportNow } from './exportBanner';

export function initExportPage(root: HTMLElement): void {
    const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
    const status = $<HTMLElement>('[data-export-status]');
    const list = $<HTMLUListElement>('[data-export-found]');
    const button = $<HTMLButtonElement>('[data-export-button]');
    const done = $<HTMLElement>('[data-export-done]');

    // On www.fincalix.com, point to the apex page instead (and the other way round).
    const onWww = location.hostname.startsWith('www.');
    document.querySelectorAll<HTMLElement>('[data-origin]').forEach((el) => { el.hidden = (el.dataset.origin === 'www') !== onWww; });

    // Name the site only on fincalix.com / www.fincalix.com; never print another host
    // (a deployment preview's address carries the hosting account's name).
    const site = /^(www\.)?fincalix\.com$/.test(location.hostname) ? ` on ${location.hostname}` : '';
    const found = dataSummary();
    if (!found.length) {
        status.textContent = `No FinCalix data was found in this browser${site}.`;
        button.disabled = true;
        return;
    }
    status.textContent = `This browser holds FinCalix data${site}:`;
    list.innerHTML = '';
    for (const x of found) {
        const li = document.createElement('li');
        li.textContent = `${x.n} ${x.label}`;
        list.appendChild(li);
    }
    list.hidden = false;
    button.disabled = false;
    button.addEventListener('click', async () => {
        button.disabled = true;
        try {
            const file = await exportNow();
            done.textContent = `Downloaded ${file}. Now import it in the Android app (steps below).`;
        } catch {
            done.textContent = 'Could not create the file. Please try again.';
        }
        done.hidden = false;
        button.disabled = false;
    });
}
