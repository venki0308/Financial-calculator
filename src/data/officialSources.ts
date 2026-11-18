/**
 * Official government sources behind FinCalix's rules, rates and scheme details.
 * One list for the app (Settings → About → Sources & Disclaimer, the "Official source" row on
 * calculators, the Schemes notice), the website (scheme and tax pages) and the link audit
 * (scripts/qa-links.mjs checks that every URL here and every scheme's officialWebsite answers 200).
 *
 * Names are the bodies' own English names (the website shows these); the app shows each name in the
 * user's language (i18n `appUi.source.<id>`, see sourceName() in src/components/OfficialSources.tsx)
 * and what each source is used for (i18n `sources.purpose.<id>`).
 */

export interface OfficialSource {
    id: string;
    /** The body's own name in English (the app translates it on screen: i18n `appUi.source.<id>`). */
    name: string;
    /** Shown to the reader as the address. */
    host: string;
    url: string;
}

/** English text of the notice (also `sources.notGovt` in en.json; qa-links checks they match). */
export const NOT_GOVT_NOTICE_EN = 'FinCalix is not a government app and does not represent any government entity.';

/** Settings → About → Sources & Disclaimer, in this order. */
export const OFFICIAL_SOURCES: readonly OfficialSource[] = [
    { id: 'incometax', name: 'Income Tax Department', host: 'incometax.gov.in', url: 'https://www.incometax.gov.in/iec/foportal/' },
    { id: 'indiabudget', name: 'Union Budget, Ministry of Finance', host: 'indiabudget.gov.in', url: 'https://www.indiabudget.gov.in/' },
    { id: 'rbi', name: 'Reserve Bank of India', host: 'rbi.org.in', url: 'https://www.rbi.org.in/' },
    { id: 'indiapost', name: 'India Post', host: 'indiapost.gov.in', url: 'https://www.indiapost.gov.in/' },
    { id: 'nsiindia', name: 'National Savings Institute, Ministry of Finance', host: 'nsiindia.gov.in', url: 'https://www.nsiindia.gov.in/' },
    { id: 'epfindia', name: "Employees' Provident Fund Organisation", host: 'epfindia.gov.in', url: 'https://www.epfindia.gov.in/' },
    { id: 'pfrda', name: 'Pension Fund Regulatory and Development Authority', host: 'pfrda.org.in', url: 'https://www.pfrda.org.in/' },
    { id: 'gst', name: 'Goods and Services Tax portal', host: 'gst.gov.in', url: 'https://www.gst.gov.in/' },
    { id: 'myscheme', name: 'myScheme, Government of India', host: 'myscheme.gov.in', url: 'https://www.myscheme.gov.in/' },
    { id: 'indiagov', name: 'National Portal of India', host: 'india.gov.in', url: 'https://www.india.gov.in/' },
];

const S = Object.fromEntries(OFFICIAL_SOURCES.map((s) => [s.id, s])) as Record<string, OfficialSource>;

/** The official scheme portal shown with the "not a government app" notice on the Schemes list. */
export const SCHEME_PORTAL: OfficialSource = S.myscheme;

const NSI_RATES: OfficialSource = { id: 'nsi-rates', name: 'National Savings Institute: small savings interest rates', host: 'nsiindia.gov.in', url: 'https://www.nsiindia.gov.in/InternalPage.aspx?Id_Pk=132' };
const RBI_LRS: OfficialSource = { id: 'rbi-lrs', name: 'Reserve Bank of India: Liberalised Remittance Scheme FAQs', host: 'rbi.org.in', url: 'https://www.rbi.org.in/commonman/english/Scripts/FAQs.aspx?Id=1834' };
const RBI_GOLD: OfficialSource = { id: 'rbi-gold', name: 'Reserve Bank of India: lending against gold (LTV limits)', host: 'rbi.org.in', url: 'https://www.rbi.org.in/scripts/FS_Notification.aspx?Id=12859' };
const LABOUR: OfficialSource = { id: 'labour', name: 'Ministry of Labour and Employment (Payment of Gratuity)', host: 'labour.gov.in', url: 'https://www.labour.gov.in/' };

/**
 * Calculators that use government rules or rates → their official source(s), by app route.
 * Shown as "Official source" on the calculator (DisclaimerComponent reads the current route).
 */
export const CALCULATOR_SOURCES: Readonly<Record<string, readonly OfficialSource[]>> = {
    '/calculator/income-tax': [S.incometax],
    '/calculator/form16-tax': [S.incometax],          // TDS, Form 16, refund
    '/calculator/salary-hike': [S.incometax],
    '/calculator/hra': [S.incometax],
    '/calculator/capital-gains': [S.incometax],
    '/calculator/lrs-tcs': [S.incometax, RBI_LRS],
    '/calculator/gst': [S.gst],
    '/calculator/ppf': [NSI_RATES, S.indiapost],
    '/calculator/sukanya-samriddhi': [NSI_RATES, S.indiapost],
    '/calculator/nsc': [NSI_RATES, S.indiapost],
    '/calculator/kvp': [NSI_RATES, S.indiapost],
    '/calculator/senior-citizen-savings': [NSI_RATES, S.indiapost],
    '/calculator/post-office-mis': [S.indiapost, NSI_RATES],
    '/calculator/post-office-td': [S.indiapost, NSI_RATES],
    '/calculator/recurring-deposit': [S.indiapost, NSI_RATES], // India Post RD rules
    '/calculator/epf': [S.epfindia],
    '/calculator/nps': [S.pfrda],
    '/calculator/gratuity': [LABOUR],
    '/gold-loan': [RBI_GOLD],
};

/**
 * Website guide pages (src/landing/features/pages/<slug>.tsx) built on government rules or rates:
 * the same notice and official links as the app, under the page heading. Every page in the "tax"
 * category must be here (qa-links checks it).
 */
export const WEBSITE_PAGE_SOURCES: Readonly<Record<string, readonly OfficialSource[]>> = {
    'income-tax': [S.incometax],
    'old-vs-new-tax-regime': [S.incometax],
    'income-tax-due-dates': [S.incometax],
    'tax-refund': [S.incometax],
    'salary-hike': [S.incometax],
    'hra': [S.incometax],
    'capital-gains': [S.incometax],
    'lrs-tcs': [S.incometax, RBI_LRS],
    'gst': [S.gst],
    'ppf': [NSI_RATES, S.indiapost],
    'sukanya-samriddhi': [NSI_RATES, S.indiapost],
    'nsc': [NSI_RATES, S.indiapost],
    'kvp': [NSI_RATES, S.indiapost],
    'scss': [NSI_RATES, S.indiapost],
    'post-office-mis': [S.indiapost, NSI_RATES],
    'post-office-td': [S.indiapost, NSI_RATES],
    'rd': [S.indiapost, NSI_RATES],
    'epf': [S.epfindia],
    'nps': [S.pfrda],
    'atal-pension': [S.pfrda],
    'gratuity': [LABOUR],
    'gold-loan-calculator': [RBI_GOLD],
};

/** Every URL the app or website shows from this module (for the link audit). */
export const ALL_SOURCE_URLS: readonly string[] = [...new Set([
    ...OFFICIAL_SOURCES.map((s) => s.url),
    ...Object.values(CALCULATOR_SOURCES).flat().map((s) => s.url),
    ...Object.values(WEBSITE_PAGE_SOURCES).flat().map((s) => s.url),
])];

/** "pmkisan.gov.in" from "https://www.pmkisan.gov.in/…" — what the reader sees for a link. */
export function hostOf(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}
