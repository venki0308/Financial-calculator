// HTML templates for every FinCalix marketing and Play Store image.
// One brand system, several layouts. render.mjs turns each item from
// content.mjs into an HTML file with `page(item, ctx)` and screenshots it.
//
// Brand (taken from the app: src/index.css, tailwind.config.js, the app icon):
//   navy background #0F172A / #0B1220, card #1E293B, line #334155
//   text #F8FAFC, muted #A3B1C6, green #34D399 (brand green #10B981),
//   purple #A78BFA (brand purple #8B5CF6), gold #FBBF24
//   type: Plus Jakarta Sans (the app font); Noto Sans for Indic scripts.

export const BRAND = {
    bg0: '#0B1220', bg1: '#0F172A', card: '#1E293B', line: '#334155',
    text: '#F8FAFC', muted: '#A3B1C6', green: '#34D399', purple: '#A78BFA', gold: '#FBBF24',
    // Darkest-to-lightest colours that can sit behind text on the page
    // background (navy plus the purple and green glows). QA checks text
    // contrast against every one of them.
    pageBackdrops: '#0B1220 #0F172A #3A2F71 #123247',
};

const INDIC_FONT = {
    hi: 'Noto Sans Devanagari', te: 'Noto Sans Telugu', ta: 'Noto Sans Tamil',
    kn: 'Noto Sans Kannada', ml: 'Noto Sans Malayalam',
};

export const FONT_LINK =
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800' +
    '&family=Noto+Sans+Devanagari:wght@500;600;700;800&family=Noto+Sans+Telugu:wght@500;600;700;800' +
    '&family=Noto+Sans+Tamil:wght@500;600;700;800&family=Noto+Sans+Kannada:wght@500;600;700;800' +
    '&family=Noto+Sans+Malayalam:wght@500;600;700;800&display=block';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** `*word*` marks an accent-coloured span inside a headline. */
const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

const ACCENT = { green: BRAND.green, purple: BRAND.purple, gold: BRAND.gold };

/** Shared CSS. `u` scales every length, so one layout serves several sizes. */
function baseCss(item, u) {
    const p = (n) => `${(n * u).toFixed(2)}px`;
    const indic = INDIC_FONT[item.lang];
    // Latin first for English; the script's own Noto font first for Indic
    // languages. Every Noto font stays in the stack so a word in another
    // script (e.g. language names) is never drawn with a system fallback.
    const others = Object.values(INDIC_FONT).filter(f => f !== indic).map(f => `'${f}'`).join(', ');
    const family = indic
        ? `'${indic}', 'Plus Jakarta Sans', ${others}, sans-serif`
        : `'Plus Jakarta Sans', ${others}, sans-serif`;
    const accent = ACCENT[item.accent] || BRAND.green;
    // Indic scripts are taller: open up the line height and tighten the size a little.
    const lh = indic ? 1.28 : 1.07;
    const k = indic ? 0.86 : 1;
    return { p, lh, k, accent, css: `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${item.w}px;height:${item.h}px;overflow:hidden}
body{position:relative;font-family:${family};color:${BRAND.text};-webkit-font-smoothing:antialiased;
  background:
    radial-gradient(${p(1100)} ${p(760)} at 92% -8%, rgba(139,92,246,.34), transparent 62%),
    radial-gradient(${p(900)} ${p(700)} at -12% 108%, rgba(16,185,129,.26), transparent 62%),
    linear-gradient(160deg, ${BRAND.bg0}, ${BRAND.bg1} 55%, ${BRAND.bg0});}
em{font-style:normal;color:${accent}}
.abs{position:absolute}
.fit{overflow:hidden;padding:.05em 0 .16em}
.eyebrow{font-weight:700;letter-spacing:${p(indic ? 1 : 3)};text-transform:uppercase;color:${accent};white-space:nowrap}
.h1{font-weight:800;line-height:${lh};letter-spacing:${indic ? 0 : p(-1.5)};text-wrap:balance}
.sub{font-weight:500;line-height:${indic ? 1.45 : 1.32};color:${BRAND.muted};text-wrap:pretty}
.pts{display:flex;flex-direction:column;gap:${p(26)}}
.pt{display:flex;align-items:flex-start;gap:${p(18)};font-weight:600;line-height:${indic ? 1.4 : 1.26}}
.pt i{flex:none;width:${p(40)};height:${p(40)};margin-top:${p(1)};border-radius:50%;background:rgba(52,211,153,.16);display:flex;align-items:center;justify-content:center}
.pt i svg{width:${p(22)};height:${p(22)}}
.stat{border:${p(2)} solid ${BRAND.line};background:${BRAND.card};border-radius:${p(26)};padding:${p(22)} ${p(26)}}
.stat b{display:block;font-weight:800;color:${accent};line-height:1.1;white-space:nowrap}
.stat span{display:block;font-weight:600;color:${BRAND.muted};line-height:1.25}
.phone{border-radius:${p(54)};border:${p(12)} solid #05080F;outline:${p(2)} solid #3B4A66;background:${BRAND.bg1};
  box-shadow:0 ${p(40)} ${p(90)} rgba(0,0,0,.55);overflow:hidden}
.card{border-radius:${p(48)} ${p(48)} 0 0;border:${p(3)} solid #3B4A66;border-bottom:0;background:${BRAND.bg1};
  box-shadow:0 ${p(-10)} ${p(80)} rgba(0,0,0,.45);overflow:hidden}
.shot{width:100%;height:100%;background-repeat:no-repeat;background-size:100% auto}
.lockup{display:flex;align-items:center;gap:${p(16)}}
.lockup img{width:${p(64)};height:${p(64)};border-radius:${p(15)};display:block}
.lockup b{display:block;font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:${p(30)};line-height:1.15;color:${BRAND.text}}
.lockup span{display:block;font-weight:600;font-size:${p(21)};line-height:1.25;color:${BRAND.muted}}
.pill{display:inline-flex;align-items:center;gap:${p(10)};border-radius:999px;border:${p(2)} solid ${BRAND.line};background:${BRAND.card};font-weight:700;color:${BRAND.text};white-space:nowrap}
.note{font-weight:500;color:${BRAND.muted};line-height:1.35}
.count{font-family:'Plus Jakarta Sans',sans-serif;font-weight:700;color:${BRAND.muted}}
` };
}

const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="#34D399" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

/** A real capture inside a frame. `crop` = share of the capture height to skip at the top. */
function shot(ctx, screen, cls, style, widthPx) {
    if (!screen) return '';
    const url = ctx.capture(screen);
    const offset = -(screen.crop || 0) * (widthPx * 2402 / 1082);
    return `<div class="abs ${cls}" style="${style}"><div class="shot" style="background-image:url('${url}');background-position:0 ${offset.toFixed(1)}px"></div></div>`;
}

function lockup(ctx, item, style) {
    const second = item.lockupNote === undefined ? '' : `<span data-t>${esc(item.lockupNote)}</span>`;
    return `<div class="abs lockup" style="${style}"><img src="${ctx.asset('app-icon-512.png')}" alt=""><div><b data-t>fincalix.com</b>${second}</div></div>`;
}

const points = (item, p, size) => !item.points?.length ? '' :
    `<div class="pts" style="font-size:${p(size)}">${item.points.map(t => `<div class="pt"><i>${CHECK}</i><span data-t>${rich(t)}</span></div>`).join('')}</div>`;

const stat = (item, p, valueSize, labelSize) => !item.stat ? '' :
    `<div class="stat" style="margin-top:${p(34)}"><span data-t style="font-size:${p(labelSize)}">${esc(item.stat.label)}</span><b data-t class="fit" data-fit="0.5" style="font-size:${p(valueSize)}">${esc(item.stat.value)}</b>${item.stat.note ? `<span data-t style="font-size:${p(labelSize - 2)};margin-top:${p(4)}">${esc(item.stat.note)}</span>` : ''}</div>`;

const disclaimer = (item) => item.disclaimer === true ? 'For estimation only — consult a CA' : (item.disclaimer || '');

// ── Layouts ──────────────────────────────────────────────────────────────

/** Portrait post / carousel slide: headline on top, points left, phone right. */
function post(item, ctx) {
    const u = item.w / 1080;
    const { p, k, css } = baseCss(item, u);
    const H = item.h / u; // 1350 (4:5) or 1080 (1:1)
    const rowTop = H >= 1300 ? 468 : 400;
    const phoneW = H >= 1300 ? 448 : 400;
    const disc = disclaimer(item);
    return { css, bg: BRAND.pageBackdrops, body: `
${item.count ? `<div class="abs count" data-t style="right:${p(72)};top:${p(72)};font-size:${p(28)}">${esc(item.count)}</div>` : ''}
<div class="abs" style="left:${p(72)};top:${p(70)};width:${p(936)}">
  ${item.eyebrow ? `<div class="eyebrow" data-t style="font-size:${p(26 * k)};margin-bottom:${p(20)}">${esc(item.eyebrow)}</div>` : ''}
  <div class="h1 fit" data-t data-fit="0.7" style="font-size:${p(76 * k)};max-height:${p(H >= 1300 ? 252 : 200)}">${rich(item.headline)}</div>
  ${item.sub ? `<div class="sub fit" data-t data-fit="0.8" style="font-size:${p(33 * k)};margin-top:${p(20)};max-height:${p(96)}">${rich(item.sub)}</div>` : ''}
</div>
<div class="abs" style="left:${p(72)};top:${p(rowTop + 10)};width:${p(440)}">
  ${points(item, p, 32 * k)}
  ${stat(item, p, 58, 24 * k)}
</div>
${shot(ctx, item.screen, 'phone', `left:${p(1008 - phoneW)};top:${p(rowTop)};width:${p(phoneW)};height:${p(phoneW / 0.45)}`, phoneW * u - 24 * u)}
${disc ? `<div class="abs note" data-t style="left:${p(72)};bottom:${p(152)};width:${p(430)};font-size:${p(23)}">${esc(disc)}</div>` : ''}
${lockup(ctx, item, `left:${p(72)};bottom:${p(62)}`)}` };
}

/** Square "Did you know" tip: one big figure, one sentence, source line. */
function tip(item, ctx) {
    const u = item.w / 1080;
    const { p, k, css, accent } = baseCss(item, u);
    const disc = disclaimer(item);
    return { css, bg: BRAND.pageBackdrops, body: `
<div class="abs" style="right:${p(-40)};top:${p(-120)};font-family:'Plus Jakarta Sans';font-weight:800;font-size:${p(640)};line-height:1;color:rgba(255,255,255,.035)">₹</div>
<div class="abs eyebrow" data-t style="left:${p(80)};top:${p(84)};font-size:${p(28 * k)}">${esc(item.eyebrow || 'Did you know?')}</div>
<div class="abs fit" data-t data-fit="0.45" style="left:${p(80)};top:${p(150)};width:${p(920)};max-height:${p(210)};font-family:'Plus Jakarta Sans';font-weight:800;font-size:${p(168)};line-height:1.12;letter-spacing:${p(-4)};color:${accent};white-space:nowrap">${esc(item.figure)}</div>
<div class="abs h1 fit" data-t data-fit="0.7" style="left:${p(80)};top:${p(392)};width:${p(920)};max-height:${p(208)};font-size:${p(60 * k)}">${rich(item.headline)}</div>
<div class="abs sub fit" data-t data-fit="0.8" style="left:${p(80)};top:${p(622)};width:${p(920)};max-height:${p(184)};font-size:${p(33 * k)}">${rich(item.sub)}</div>
<div class="abs note" data-t style="left:${p(80)};bottom:${p(150)};width:${p(920)};font-size:${p(23)}">${esc([item.sourceLine ? 'Source: ' + item.sourceLine : '', disc].filter(Boolean).join('  ·  '))}</div>
${lockup(ctx, item, `left:${p(80)};bottom:${p(62)}`)}` };
}

/** Typographic carousel hook (slide 1). */
function hook(item, ctx) {
    const u = item.w / 1080;
    const { p, k, css } = baseCss(item, u);
    return { css, bg: BRAND.pageBackdrops, body: `
<div class="abs count" data-t style="right:${p(72)};top:${p(72)};font-size:${p(28)}">${esc(item.count || '')}</div>
<div class="abs eyebrow" data-t style="left:${p(72)};top:${p(250)};font-size:${p(28 * k)}">${esc(item.eyebrow || '')}</div>
<div class="abs h1 fit" data-t data-fit="0.6" style="left:${p(72)};top:${p(310)};width:${p(936)};max-height:${p(500)};font-size:${p(112 * k)}">${rich(item.headline)}</div>
<div class="abs sub fit" data-t data-fit="0.8" style="left:${p(72)};top:${p(850)};width:${p(900)};max-height:${p(170)};font-size:${p(40 * k)}">${rich(item.sub || '')}</div>
<div class="abs pill" data-t data-bg="${BRAND.card}" style="left:${p(72)};bottom:${p(176)};padding:${p(16)} ${p(30)};font-size:${p(28)}">Swipe →</div>
${item.disclaimer ? `<div class="abs note" data-t style="right:${p(72)};bottom:${p(80)};font-size:${p(21)}">${esc(disclaimer(item))}</div>` : ''}
${lockup(ctx, item, `left:${p(72)};bottom:${p(62)}`)}` };
}

/** Centred brand card: launch, "Made in India", Google Play CTA, carousel CTA. */
function center(item, ctx) {
    const u = item.w / 1080;
    const { p, k, css } = baseCss(item, u);
    const H = item.h / u;
    const top = H / 2 - (item.legal ? 30 : 0); // block is centred on this line
    const badge = item.badge
        ? `<img data-badge src="${ctx.asset(`google-play-badge-${item.badgeLang || 'en'}.png`)}" alt="Get it on Google Play" style="display:block;margin:${p(34)} auto 0;height:${p(150)}">`
        : '';
    const stripe = item.tricolour
        ? `<div style="display:flex;justify-content:center;gap:${p(8)};margin:${p(30)} auto 0"><i style="width:${p(70)};height:${p(8)};border-radius:9px;background:#FF9933"></i><i style="width:${p(70)};height:${p(8)};border-radius:9px;background:#FFFFFF"></i><i style="width:${p(70)};height:${p(8)};border-radius:9px;background:#138808"></i></div>`
        : '';
    return { css, bg: BRAND.pageBackdrops, body: `
${item.count ? `<div class="abs count" data-t style="right:${p(72)};top:${p(72)};font-size:${p(28)}">${esc(item.count)}</div>` : ''}
<div class="abs" style="left:${p(90)};top:${p(top)};width:${p(900)};text-align:center;transform:translateY(-50%)">
  <img src="${ctx.asset('app-icon-512.png')}" alt="" style="width:${p(168)};height:${p(168)};border-radius:${p(38)};box-shadow:0 ${p(24)} ${p(60)} rgba(0,0,0,.5)">
  ${stripe}
  ${item.eyebrow ? `<div class="eyebrow" data-t style="font-size:${p(26 * k)};margin-top:${p(36)}">${esc(item.eyebrow)}</div>` : ''}
  <div class="h1 fit" data-t data-fit="0.7" style="font-size:${p(80 * k)};margin-top:${p(24)};max-height:${p(270)}">${rich(item.headline)}</div>
  ${item.sub ? `<div class="sub fit" data-t data-fit="0.8" style="font-size:${p(34 * k)};margin-top:${p(24)};max-height:${p(140)}">${rich(item.sub)}</div>` : ''}
  ${badge}
  ${item.url ? `<div data-t style="margin-top:${p(30)};font-family:'Plus Jakarta Sans';font-weight:800;font-size:${p(46)};color:${BRAND.green}">${esc(item.url)}</div>` : ''}
</div>
${item.legal ? `<div class="abs note" data-t style="left:${p(90)};right:${p(90)};bottom:${p(48)};text-align:center;font-size:${p(19)}">${esc(item.legal)}</div>` : ''}` };
}

/** 9:16 story / reel cover / WhatsApp status. Top 250 px and bottom 300 px carry no key text. */
function story(item, ctx) {
    const u = item.w / 1080;
    const { p, k, css } = baseCss(item, u);
    const disc = disclaimer(item);
    return { css, bg: BRAND.pageBackdrops, body: `
${lockup(ctx, { ...item, lockupNote: disc || undefined }, `left:${p(80)};top:${p(262)}`)}
<div class="abs" style="left:${p(80)};top:${p(372)};width:${p(920)}">
  ${item.eyebrow ? `<div class="eyebrow" data-t style="font-size:${p(28 * k)};margin-bottom:${p(22)}">${esc(item.eyebrow)}</div>` : ''}
  <div class="h1 fit" data-t data-fit="0.7" style="font-size:${p(88 * k)};max-height:${p(292)}">${rich(item.headline)}</div>
  ${item.sub ? `<div class="sub fit" data-t data-fit="0.8" style="font-size:${p(38 * k)};margin-top:${p(22)};max-height:${p(108)}">${rich(item.sub)}</div>` : ''}
</div>
${shot(ctx, item.screen, 'phone', `left:${p(215)};top:${p(900)};width:${p(650)};height:${p(650 / 0.45)}`, 650 * u - 24 * u)}` };
}

/** Landscape: LinkedIn 1200x627, X 1600x900, YouTube 1280x720. Scaled by height. */
function wide(item, ctx) {
    const u = item.h / 627;
    const { p, k, css } = baseCss(item, u);
    const W = item.w / u;
    const phoneW = 290;
    const textW = W - phoneW - 64 - 110;
    const big = item.big ? 1.32 : 1;
    const disc = disclaimer(item);
    return { css, bg: BRAND.pageBackdrops, body: `
<div class="abs" style="left:${p(64)};top:${p(item.big ? 86 : 64)};width:${p(textW)}">
  ${item.eyebrow ? `<div class="eyebrow" data-t style="font-size:${p(19 * k)};margin-bottom:${p(14)}">${esc(item.eyebrow)}</div>` : ''}
  <div class="h1 fit" data-t data-fit="0.65" style="font-size:${p(60 * k * big)};max-height:${p(item.big ? 300 : 204)}">${rich(item.headline)}</div>
  ${item.sub ? `<div class="sub fit" data-t data-fit="0.8" style="font-size:${p(25 * k)};margin-top:${p(16)};max-height:${p(72)}">${rich(item.sub)}</div>` : ''}
  ${item.stat ? `<div style="display:inline-block">${stat(item, p, 40, 17 * k).replace(`margin-top:${p(34)}`, `margin-top:${p(20)}`)}</div>` : ''}
</div>
${shot(ctx, item.screen, 'phone', `left:${p(W - phoneW - 70)};top:${p(56)};width:${p(phoneW)};height:${p(phoneW / 0.45)};border-width:${p(9)};border-radius:${p(40)}`, phoneW * u - 18 * u)}
${disc ? `<div class="abs note" data-t style="left:${p(300)};bottom:${p(52)};font-size:${p(15)}">${esc(disc)}</div>` : ''}
<div class="abs lockup" style="left:${p(64)};bottom:${p(40)};gap:${p(12)}"><img src="${ctx.asset('app-icon-512.png')}" alt="" style="width:${p(46)};height:${p(46)};border-radius:${p(11)}"><div><b data-t style="font-size:${p(22)}">fincalix.com</b></div></div>` };
}

/** Play Store phone screenshot: short headline + one-line subhead (under 20% of the image), real screen below. */
function play(item, ctx) {
    const u = item.w / 1080;
    const { p, k, css } = baseCss(item, u);
    return { css, bg: BRAND.pageBackdrops, body: `
<div class="abs" style="left:${p(60)};top:${p(92)};width:${p(960)};text-align:center">
  <div class="h1 fit" data-t data-fit="0.7" style="font-size:${p(74 * k)};max-height:${p(176)}">${rich(item.headline)}</div>
  <div class="sub fit" data-t data-fit="0.72" style="font-size:${p(39 * k)};margin-top:${p(18)};max-height:${p(64)};white-space:nowrap">${rich(item.sub)}</div>
</div>
${shot(ctx, item.screen, 'card', `left:${p(96)};top:${p(404)};width:${p(888)};height:${p(1560)}`, 888 * u - 6 * u)}` };
}

/** Play Store feature graphic, 1024x500. Key content stays inside the middle 70%. */
function feature(item, ctx) {
    const u = item.w / 1024;
    const { p, css } = baseCss(item, u);
    const tilt = (screen, left, top, width, deg) => shot(ctx, screen, 'card', `left:${p(left)};top:${p(top)};width:${p(width)};height:${p(width / 0.45)};border-radius:${p(22)};border-width:${p(2)};border-bottom:${p(2)} solid #3B4A66;transform:rotate(${deg}deg)`, width * u - 4 * u);
    return { css, bg: BRAND.pageBackdrops, body: `
${tilt(item.screen2, 838, 96, 196, 7)}
${tilt(item.screen, 648, 58, 214, -5)}
<div class="abs" style="left:${p(92)};top:${p(118)};width:${p(520)}">
  <div style="display:flex;align-items:center;gap:${p(22)}">
    <img src="${ctx.asset('app-icon-512.png')}" alt="" style="width:${p(104)};height:${p(104)};border-radius:${p(24)};box-shadow:0 ${p(16)} ${p(40)} rgba(0,0,0,.5)">
    <div data-t style="font-family:'Plus Jakarta Sans';font-weight:800;font-size:${p(86)};letter-spacing:${p(-2.5)};line-height:1">FinCalix</div>
  </div>
  <div class="h1" data-t style="font-size:${p(43)};margin-top:${p(34)};line-height:1.16">${rich(item.headline)}</div>
</div>` };
}

const LAYOUTS = { post, tip, hook, center, story, wide, play, feature };

/** In-page script: shrink text that does not fit, then report QA measurements. */
const QA_SCRIPT = `
(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(i => i.decode ? i.decode().catch(() => {}) : null));
  // Tight line heights let glyph boxes poke a few pixels past the line box, so
  // a box only counts as overflowing when it is short by a real part of a line.
  const over = (el) => {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    return el.scrollHeight > el.clientHeight + fs * 0.4 || el.scrollWidth > el.clientWidth + 2;
  };
  for (const el of document.querySelectorAll('[data-fit]')) {
    let size = parseFloat(getComputedStyle(el).fontSize);
    const min = size * parseFloat(el.dataset.fit);
    while (over(el) && size > min) { size *= 0.97; el.style.fontSize = size + 'px'; }
  }
  const lum = (c) => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const hex = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgb = (s) => (s.match(/[\\d.]+/g) || []).slice(0, 4).map(Number);
  const W = innerWidth, H = innerHeight;
  const out = { overflow: [], offCanvas: [], contrastMin: 99, contrastFails: [], minTextPx: 999, headlinePx: 0, fontsMissing: [], images: [] };
  for (const el of document.querySelectorAll('[data-fit]')) {
    if (over(el)) out.overflow.push(el.textContent.trim().slice(0, 40));
  }
  for (const el of document.querySelectorAll('[data-t]')) {
    const text = el.textContent.trim(); if (!text) continue;
    const r = el.getBoundingClientRect();
    if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) out.offCanvas.push(text.slice(0, 40));
    const cs = getComputedStyle(el);
    const size = parseFloat(cs.fontSize);
    out.minTextPx = Math.min(out.minTextPx, size);
    if (el.classList.contains('h1')) out.headlinePx = Math.max(out.headlinePx, size);
    const host = el.closest('[data-bg]');
    const fg = rgb(cs.color);
    for (const bgHex of (host ? host.dataset.bg : '').split(' ').filter(Boolean)) {
      const bg = hex(bgHex), a = fg[3] === undefined ? 1 : fg[3];
      const mix = [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a));
      const L1 = lum(mix), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      out.contrastMin = Math.min(out.contrastMin, ratio);
      if (ratio < 4.5) out.contrastFails.push(text.slice(0, 30) + ' ' + ratio.toFixed(2) + ' on ' + bgHex);
    }
    const wanted = cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
    if (!document.fonts.check(cs.fontWeight + ' ' + cs.fontSize + ' "' + wanted + '"', text.slice(0, 12))) out.fontsMissing.push(wanted);
  }
  for (const img of document.images) if (!img.naturalWidth) out.images.push(img.src.split('/').pop());
  for (const el of document.querySelectorAll('.shot')) {
    const url = (el.style.backgroundImage.match(/url\\(["']?([^"')]+)/) || [])[1];
    if (!url) continue;
    const ok = await new Promise(res => { const i = new Image(); i.onload = () => res(true); i.onerror = () => res(false); i.src = url; });
    if (!ok) out.images.push(url.split('/').pop());
  }
  const badge = document.querySelector('[data-badge]');
  if (badge) out.badgeHeight = badge.getBoundingClientRect().height;
  out.fontsMissing = [...new Set(out.fontsMissing)];
  window.__qa = out;
})();`;

export function page(item, ctx) {
    const layout = LAYOUTS[item.layout];
    if (!layout) throw new Error(`unknown layout "${item.layout}" for ${item.file}`);
    const { css, bg, body } = layout(item, ctx);
    return `<!doctype html>
<html lang="${item.lang || 'en'}"><head><meta charset="utf-8">
<title>${esc(item.file)}</title>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT_LINK}">
<style>${css}</style></head>
<body data-bg="${bg}">${body}
<script>${QA_SCRIPT}</script>
</body></html>`;
}
