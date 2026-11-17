/**
 * Website-only content for a /schemes/<id> page (one file per scheme in schemes/content/<id>.ts,
 * default export). Plain strings only (no JSX), so the audits can read it with esbuild.
 *
 * The page still shows the app's own scheme record (src/data/schemes.ts); fields given here
 * replace the app's list of the same name on the website only, after checking it against the
 * official source. Any difference from the app's data goes in `appIssues` (and APP_IDEAS.md).
 * Every number and rule must be in one of `sources` (official sites only: *.gov.in, *.nic.in,
 * rbi.org.in, pib.gov.in, the scheme's own portal, egazette).
 */
export interface SchemeSource { label: string; url: string }
export interface SchemeFaq { q: string; a: string }
export interface SchemeLink { href: string; label: string; note: string }

export interface SchemeContent {
    /** Scheme id from src/data/schemes.ts, e.g. 'c-pmkisan'. */
    id: string;
    /** <title>, at most 60 characters, leading with the name people search (e.g. "VB-G RAM G"). */
    title: string;
    /** Meta description, at most 155 characters. */
    description: string;
    /** H1 (natural language, primary query). */
    h1: string;
    /** Answer-first block: 2–3 sentences with a real amount or rule, the date and the source. */
    answer: string[];
    /** Benefits / amounts table (instalments, premiums, loan limits by category, …). */
    table?: { caption: string; head: string[]; rows: string[][]; note?: string };
    /** Verified lists; each replaces the app's list of the same name on this page when present. */
    eligibility?: string[];
    notEligible?: string[];
    benefits?: string[];
    documents?: string[];
    howToApply: string[];
    /** How to check application / payment status: steps ending at the official portal (we never imitate a checker). */
    statusSteps?: string[];
    /** Official portal (and optional second link, e.g. the guidelines PDF). */
    portal: SchemeSource;
    helpline?: string;
    /** Official sources for everything on the page. */
    sources: SchemeSource[];
    /** ISO date the facts were checked against `sources`. */
    verified: string;
    faqs: SchemeFaq[];
    /** 2–5 internal links: related schemes (/schemes/<id>) or calculators. */
    related: SchemeLink[];
    /** Differences found between the app's record and the official source (website shows the verified version). */
    appIssues?: string[];
}
