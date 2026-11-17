// Website brand images, rendered once and committed.
//
//   node scripts/landing/build-og.mjs
//
// - src/landing/public/og/fincalix-og.png   1200 x 630 social card (Passbook style:
//   paper background, Fraunces headline, a real app screenshot)
// - src/landing/assets/fincalix-icon-96.webp  header logo (from the app icon)
//
// Inputs: tools/marketing/assets/app-icon-512.png, src/landing/fonts/*.woff2 and
// src/landing/img/en-home-light-560.webp (scripts/landing/build-images.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const R = (p) => path.resolve(p);
const b64 = (p) => fs.readFileSync(R(p)).toString('base64');
const icon = `data:image/png;base64,${b64('tools/marketing/assets/app-icon-512.png')}`;
const shot = `data:image/webp;base64,${b64('src/landing/img/en-home-light-560.webp')}`;
const fraunces = `data:font/woff2;base64,${b64('src/landing/fonts/fraunces-var.woff2')}`;
const jakarta = `data:font/woff2;base64,${b64('src/landing/fonts/jakarta-var.woff2')}`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: F; src: url(${fraunces}) format('woff2'); font-weight: 500 700; }
@font-face { font-family: J; src: url(${jakarta}) format('woff2'); font-weight: 400 800; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #FBFAF6; font-family: J, sans-serif; color: #0F172A; position: relative; overflow: hidden; }
.rules { position: absolute; inset: 0; background: repeating-linear-gradient(#FBFAF6 0 51px, #ECE7DC 51px 52px); opacity: .7; }
.copy { position: absolute; left: 72px; top: 64px; width: 650px; }
.brand { display: flex; align-items: center; gap: 14px; font-weight: 800; font-size: 30px; letter-spacing: -.01em; }
.brand img { width: 56px; height: 56px; border-radius: 14px; }
h1 { font-family: F; font-weight: 600; font-size: 74px; line-height: 1.02; letter-spacing: -.02em; margin-top: 44px; }
h1 em { font-style: italic; color: #047857; }
p { margin-top: 26px; font-size: 25px; color: #334155; font-weight: 600; }
.chips { margin-top: 28px; display: flex; gap: 12px; }
.chips span { border: 2px solid #C9C1AF; border-radius: 999px; padding: 8px 18px; font-size: 20px; font-weight: 700; color: #0F172A; background: #fff; }
.phone { position: absolute; right: 70px; top: 54px; width: 330px; padding: 11px; background: #0B1120; border-radius: 42px; transform: rotate(4deg); box-shadow: 0 30px 60px -24px rgba(15,23,42,.45); }
.phone img { display: block; width: 100%; border-radius: 32px; }
</style></head><body>
<div class="rules"></div>
<div class="copy">
  <div class="brand"><img src="${icon}">FinCalix</div>
  <h1>Every money decision, <em>worked out</em> in seconds.</h1>
  <p>EMI · SIP · Income tax · Govt schemes · Expenses</p>
  <div class="chips"><span>Free</span><span>No login</span><span>6 Indian languages</span></div>
</div>
<div class="phone"><img src="${shot}"></div>
</body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
fs.mkdirSync(R('src/landing/public/og'), { recursive: true });
await page.screenshot({ path: R('src/landing/public/og/fincalix-og.png') });

// Header logo: the app icon's cube fills only half of its 512 px frame (white and grey margin),
// so at 34 px it was ~17 px wide and unclear. Crop to the cube, centre it on a white tile with a
// small margin, and export at 4x (136 px) so it stays sharp on 3x phone screens.
const webp = await page.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const W = img.width, H = img.height;
    const s = document.createElement('canvas'); s.width = W; s.height = H;
    const sg = s.getContext('2d'); sg.drawImage(img, 0, 0);
    const d = sg.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        if (max < 200 || max - min > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    const side = Math.max(x1 - x0, y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const OUT = 136, inner = OUT * 0.86;
    const c = document.createElement('canvas'); c.width = OUT; c.height = OUT;
    const g = c.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, OUT, OUT);
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, cx - side / 2, cy - side / 2, side, side, (OUT - inner) / 2, (OUT - inner) / 2, inner, inner);
    // The source has a pale grey square behind the cube: make that background plain white.
    const px = g.getImageData(0, 0, OUT, OUT);
    for (let i = 0; i < px.data.length; i += 4) {
        const r = px.data[i], gg = px.data[i + 1], b = px.data[i + 2];
        if (Math.min(r, gg, b) > 222 && Math.max(r, gg, b) - Math.min(r, gg, b) < 12) px.data[i] = px.data[i + 1] = px.data[i + 2] = 255;
    }
    g.putImageData(px, 0, 0);
    return c.toDataURL('image/webp', 0.92);
}, icon);
fs.mkdirSync(R('src/landing/assets'), { recursive: true });
fs.writeFileSync(R('src/landing/assets/fincalix-icon-96.webp'), Buffer.from(webp.split(',')[1], 'base64'));
await browser.close();
for (const f of ['src/landing/public/og/fincalix-og.png', 'src/landing/assets/fincalix-icon-96.webp']) console.log(f, (fs.statSync(R(f)).size / 1024).toFixed(1) + ' KB');
