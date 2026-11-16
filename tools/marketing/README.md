# FinCalix marketing image generator

Rebuilds the Play Store assets and social images from real screens of the current build. No app screen is drawn or generated: every phone image is a capture of the production build with demo data.

## Regenerate after an app change

```bash
npm run build                          # production build the captures are taken from
node tools/marketing/capture.mjs       # real screens + facts.json  → marketing-assets/_captures/
node tools/marketing/render.mjs        # every image, manifest.csv, qa-report.json, index.html
```

Render only part of the set by passing words that appear in the folder or file name:

```bash
node tools/marketing/render.mjs tips phone-te
```

Needs: the dev dependency `playwright-core`, Google Chrome installed, and internet access while rendering (fonts are loaded from Google Fonts).

## Files

| File | Purpose |
|---|---|
| `capture.mjs` | Serves `dist/`, seeds fictional demo data, captures each screen at 412×915 (device scale 2.625) in dark and light, in English, Telugu and Hindi, and reads the figures the app computed into `facts.json`. |
| `content.mjs` | The list of images: size, layout, copy, which capture to show, caption, claims and sources. Figures are never typed in; they are referenced as `F('emi.emi')` and filled from `facts.json`. |
| `templates.mjs` | The brand system and the HTML layouts (`post`, `tip`, `hook`, `center`, `story`, `wide`, `play`, `feature`). |
| `render.mjs` | Writes one HTML file per image to `marketing-assets/_html/`, screenshots it at the exact size, runs QA, converts Play assets to 24-bit PNG, and writes the manifest and contact sheet. |
| `lib/png.mjs` | Dependency-free PNG header reader and RGB/RGBA converter. |
| `assets/` | The app icon (copied from `ic_launcher_512.png`) and the official "Get it on Google Play" badges, downloaded unmodified from play.google.com. |

## Output

`marketing-assets/` is git-ignored.

```
marketing-assets/
  index.html        contact sheet of every image
  manifest.csv      file, size, channel, headline, caption suggestion, claims used, sources
  qa-report.json    per-image QA results
  playstore/{icon,feature-graphic,phone-en,phone-te,phone-hi}/
  social/{feature-posts,tips,carousels,languages,launch,stories,linkedin,x,youtube}/
  _captures/        real app screens and facts.json
  _html/            the rendered HTML behind each image
```

## QA that `render.mjs` enforces

A non-zero exit code means at least one image failed.

- Exact pixel size, read back from the PNG header.
- No text overflow: text that does not fit its box is shrunk within a limit, and anything still overflowing or leaving the canvas fails.
- Contrast: every text element is checked against every colour that can sit behind it; below 4.5:1 fails.
- Fonts: the intended font (Plus Jakarta Sans, or the Noto Sans face for the script) must have loaded.
- Figures: a figure missing from `facts.json` fails, so nothing is typed by hand.
- Play assets: screenshots and the feature graphic have no alpha channel; the icon is 512×512, 32-bit, under 1 MB; screenshot headlines are 7 words or fewer.
- Legibility at phone size: the headline must be at least 12 px tall when the image is shown 360 px wide.

Still a human job: read the Hindi and Telugu copy, and look at the contact sheet for composition.

## Rules the copy follows

- Only claims that are true of the build: 45+ calculators, no login, no ads, works offline, PDF and Excel export, 6 languages, light and dark themes, FY 2026-27 tax rules.
- Privacy wording is limited to: "Your financial data stays on your device", "No login", "No ads", "Works offline". Never "zero data collection" or "no tracking": the app has optional usage analytics.
- Play Store assets: no "best", "#1", "top", "free", prices, calls to action, store badges or device frames (Google lists device imagery as inappropriate for screenshots), and the tagline stays under 20% of the image.
- Tax images carry "For estimation only — consult a CA".
- The Google Play badge is the official artwork, unaltered, with clear space of a quarter of its height and the trademark line.
