// Turn the real app captures into the website's WebP screenshots.
//
//   node scripts/landing/build-images.mjs
//
// Input:  marketing-assets/_captures/<lang>/<theme>/<screen>.png (tools/marketing/capture.mjs,
//         1082 x 2402, git-ignored)
// Output: src/landing/img/<lang>-<screen>-<theme>-<width>.webp (committed) and
//         src/landing/img/images.json { "<lang>-<screen>": { aspect: [w, h], widths: [...] } }
//
// Screens are cropped from the top to the phone-frame aspect used on the page and
// encoded by Chrome (canvas.toDataURL('image/webp')), so no image library is needed.
// Nothing is drawn on the screenshots.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const SRC = path.resolve('marketing-assets/_captures');
const OUT = path.resolve('src/landing/img');
const PHONE = { crop: [1082, 2050], widths: [280, 560] };
const MINI = { crop: [1082, 1500], widths: [180, 360] };
const LANGS = ['en', 'hi', 'te', 'ta', 'kn', 'ml'];

const JOBS = [
    ...['home', 'tax', 'foreclosure', 'expenses-monthly', 'cc-payoff', 'goal-planner', 'export', 'reminders']
        .map((screen) => ({ lang: 'en', screen, ...PHONE, fromBottom: screen === 'reminders' })), // reminders: the settings sheet sits at the bottom
    ...LANGS.map((lang) => ({ lang, screen: 'home', key: `${lang}-home-mini`, ...MINI })),
];

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.webp')) fs.unlinkSync(path.join(OUT, f));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const manifest = {};
let bytes = 0;
for (const job of JOBS) {
    const key = job.key || `${job.lang}-${job.screen}`;
    manifest[key] = { aspect: job.crop, widths: job.widths };
    for (const theme of ['light', 'dark']) {
        const file = path.join(SRC, job.lang, theme, `${job.screen}.png`);
        if (!fs.existsSync(file)) throw new Error(`missing capture: ${path.relative(process.cwd(), file)} (run tools/marketing/capture.mjs)`);
        const dataUrl = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
        for (const width of job.widths) {
            const height = Math.round(width * job.crop[1] / job.crop[0]);
            const webp = await page.evaluate(async ({ dataUrl, crop, width, height, fromBottom }) => {
                const img = new Image();
                img.src = dataUrl;
                await img.decode();
                // Two-step downscale keeps small text crisp.
                const mid = document.createElement('canvas');
                mid.width = width * 2; mid.height = height * 2;
                const m = mid.getContext('2d');
                m.imageSmoothingQuality = 'high';
                m.drawImage(img, 0, fromBottom ? img.naturalHeight - crop[1] : 0, crop[0], crop[1], 0, 0, mid.width, mid.height);
                const c = document.createElement('canvas');
                c.width = width; c.height = height;
                const g = c.getContext('2d');
                g.imageSmoothingQuality = 'high';
                g.drawImage(mid, 0, 0, width, height);
                return c.toDataURL('image/webp', 0.8);
            }, { dataUrl, crop: job.crop, width, height, fromBottom: !!job.fromBottom });
            const buf = Buffer.from(webp.split(',')[1], 'base64');
            const name = `${key}-${theme}-${width}.webp`;
            fs.writeFileSync(path.join(OUT, name), buf);
            bytes += buf.length;
        }
    }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'images.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`${Object.keys(manifest).length} screens, ${fs.readdirSync(OUT).filter((f) => f.endsWith('.webp')).length} files, ${(bytes / 1024).toFixed(0)} KB`);
