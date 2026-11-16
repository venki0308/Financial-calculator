// Download the two website fonts once, subset by Google Fonts' `text=` API,
// into src/landing/fonts/ (committed; the site self-hosts them).
//
//   node scripts/landing/fetch-fonts.mjs
//
// Fraunces (headings and large figures): one variable file, weight 500-700 at
// optical size 72, Basic Latin + ₹ + the punctuation the headings use.
// Plus Jakarta Sans (everything else): one variable file, weight 400-800,
// Basic Latin + Latin-1 punctuation + ₹ + typographic quotes, dashes and arrows.
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('src/landing/fonts');
const basicLatin = Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i)).join('');
const extra = '₹’‘“”–—·…→✓×°';
const FONTS = [
    // Optical size pinned at 72 (display sizes): half the bytes of the full opsz axis.
    { file: 'fraunces-var.woff2', family: 'Fraunces:opsz,wght@72,500..700', text: basicLatin + '₹’‘“”–—·…' },
    { file: 'jakarta-var.woff2', family: 'Plus+Jakarta+Sans:wght@400..800', text: basicLatin + ' ©®' + extra },
];
// A current Chrome user agent makes the CSS API answer with WOFF2.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

fs.mkdirSync(OUT, { recursive: true });
for (const f of FONTS) {
    const url = `https://fonts.googleapis.com/css2?family=${f.family}&text=${encodeURIComponent(f.text)}&display=swap`;
    const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
    const src = css.match(/url\((https:[^)]+)\)\s*format\('woff2'\)/);
    if (!src) throw new Error(`no woff2 for ${f.family}:\n${css}`);
    const buf = Buffer.from(await (await fetch(src[1])).arrayBuffer());
    fs.writeFileSync(path.join(OUT, f.file), buf);
    console.log(`${f.file}: ${(buf.length / 1024).toFixed(1)} KB`);
}
