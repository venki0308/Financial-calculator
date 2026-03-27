Add these screenshot images here:
screen1-home.png      — App home screen (390x844px)
screen2-calculators.png — Calculator list
screen3-tax.png       — Income tax calculator
screen4-schemes.png   — Government schemes
screen5-expense.png   — Expense tracker
screen6-language.png  — Language selection
screen7-age.png       — Age calculator
screen8-sukanya.png   — Sukanya scheme detail

Recommended: Export from Android app at
390x844px (iPhone 14 size) or actual device
screenshot cropped to app content only.
Format: PNG or WebP for best quality.

Once images are added, replace the placeholder gradient cards
in ScreenshotsSection (WebLandingPage.tsx) with:

  <img
    src={item.src}
    alt={item.label}
    loading="lazy"
    style={{ width: '236px', borderRadius: '24px',
             objectFit: 'cover', objectPosition: 'top',
             display: 'block' }}
  />
